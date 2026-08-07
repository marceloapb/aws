// ══════════════════════════════════════════════════════════════
// SERVICES/ASAAS-SERVICE.JS — Integração completa com Asaas
// ══════════════════════════════════════════════════════════════

const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { dynamo, TABLE } = require('../config/dynamodb');
const { GetCommand, PutCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const ssm = new SSMClient({ region: 'us-east-1' });
const PREFIX = process.env.SSM_PREFIX || '/mbf/prod';
const TENANT = process.env.TENANT_ID || '1';

let cachedConfig = null;

async function getConfig() {
  if (cachedConfig) return cachedConfig;
  const [baseUrlParam, apiKeyParam] = await Promise.all([
    ssm.send(new GetParameterCommand({ Name: `${PREFIX}/ASAAS_BASE_URL`, WithDecryption: false })),
    ssm.send(new GetParameterCommand({ Name: `${PREFIX}/ASAAS_API_KEY`, WithDecryption: true })),
  ]);
  cachedConfig = {
    baseUrl: baseUrlParam.Parameter.Value || 'https://sandbox.asaas.com/api/v3',
    apiKey: apiKeyParam.Parameter.Value,
  };
  return cachedConfig;
}

async function asaasFetch(path, options = {}) {
  const config = await getConfig();
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'access_token': config.apiKey,
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok) {
    const errMsg = data.errors?.[0]?.description || JSON.stringify(data);
    throw new Error(`Asaas (${response.status}): ${errMsg}`);
  }
  return data;
}

// ═══════════════════════════════════════════════════════════════
// CUSTOMER — Criar/buscar cliente no Asaas
// ═══════════════════════════════════════════════════════════════

/**
 * Busca ou cria um customer no Asaas para o cliente do sistema
 * @param {Object} cliente - { id, nome, email, cpf_cnpj, telefone }
 * @returns {string} asaas_customer_id
 */
async function getOrCreateCustomer(cliente) {
  if (!cliente || !cliente.id) throw new Error('Cliente é obrigatório');

  // 1) Verificar se já tem asaas_customer_id salvo no DynamoDB
  // Tentar TENANT#default/CLIENTE#id
  let existingCustomerId = null;
  try {
    const cliResult = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `CLIENTE#${cliente.id}` },
    }));
    existingCustomerId = cliResult.Item?.asaas_customer_id;
  } catch {}

  // Tentar CLIENT#id/PROFILE (self-signup)
  if (!existingCustomerId) {
    try {
      const cliResult2 = await dynamo.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: `CLIENT#${cliente.id}`, SK: 'PROFILE' },
      }));
      existingCustomerId = cliResult2.Item?.asaas_customer_id;
    } catch {}
  }

  if (existingCustomerId) return existingCustomerId;

  // 2) Buscar no Asaas por CPF/CNPJ
  if (cliente.cpf_cnpj) {
    try {
      const cpfLimpo = cliente.cpf_cnpj.replace(/\D/g, '');
      const searchResult = await asaasFetch(`/customers?cpfCnpj=${cpfLimpo}`);
      if (searchResult.data?.length > 0) {
        const asaasId = searchResult.data[0].id;
        await salvarAsaasCustomerId(cliente.id, asaasId);
        return asaasId;
      }
    } catch {}
  }

  // 3) Criar novo customer no Asaas
  const body = {
    name: cliente.nome || 'Cliente',
    email: cliente.email || undefined,
    cpfCnpj: cliente.cpf_cnpj ? cliente.cpf_cnpj.replace(/\D/g, '') : undefined,
    externalReference: cliente.id,
  };

  // Telefone: só enviar se for válido (10-11 dígitos)
  if (cliente.telefone) {
    const telLimpo = cliente.telefone.replace(/\D/g, '');
    if (telLimpo.length >= 10 && telLimpo.length <= 11) {
      body.mobilePhone = telLimpo;
    }
  }

  const result = await asaasFetch('/customers', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const asaasCustomerId = result.id;
  await salvarAsaasCustomerId(cliente.id, asaasCustomerId);

  return asaasCustomerId;
}

async function salvarAsaasCustomerId(clienteId, asaasCustomerId) {
  // Salvar no TENANT#default/CLIENTE#id
  try {
    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `CLIENTE#${clienteId}` },
      UpdateExpression: 'SET asaas_customer_id = :acid',
      ExpressionAttributeValues: { ':acid': asaasCustomerId },
    }));
  } catch {}
  // Também no CLIENT#id/PROFILE
  try {
    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `CLIENT#${clienteId}`, SK: 'PROFILE' },
      UpdateExpression: 'SET asaas_customer_id = :acid',
      ExpressionAttributeValues: { ':acid': asaasCustomerId },
    }));
  } catch {}
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURAÇÕES DE PAGAMENTO — busca condições salvas no DynamoDB
// ═══════════════════════════════════════════════════════════════

async function getCondicoesPagamento() {
  try {
    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: 'CONFIG#geral' },
    }));
    return result.Item?.condicoes_pagamento || [];
  } catch {
    return [];
  }
}

/**
 * Busca a condição padrão de pagamento ou a primeira disponível
 */
async function getCondicaoPadrao() {
  const condicoes = await getCondicoesPagamento();
  return condicoes.find(c => c.padrao) || condicoes[0] || null;
}

// ═══════════════════════════════════════════════════════════════
// PAYMENT — Criar cobrança no Asaas
// ═══════════════════════════════════════════════════════════════

/**
 * Cria uma cobrança no Asaas e retorna link PIX/boleto
 * Aplica configurações de pagamento (desconto, juros, parcelas) automaticamente
 * @param {Object} opts
 * @param {string} opts.asaas_customer_id - ID do customer no Asaas
 * @param {number} opts.valor - Valor em reais (ex: 425.33)
 * @param {string} opts.vencimento - Data vencimento YYYY-MM-DD
 * @param {string} opts.descricao - Descrição da cobrança
 * @param {string} opts.meio - 'pix' | 'boleto' | 'cartao' (default: pix)
 * @param {string} opts.referencia - ID externo (cobranca_id do sistema)
 * @param {number} opts.parcelas - Nº de parcelas (se cartão)
 * @param {Object} opts.condicao - Condição de pagamento específica (override)
 * @returns {Object} { gateway_id, status, link_pagamento, pix_copia_cola, pix_qr_code, boleto_url, valor_cobrado }
 */
async function criarCobrancaAsaas({ asaas_customer_id, valor, vencimento, descricao, meio = 'pix', referencia, parcelas, condicao }) {
  // Buscar condição de pagamento se não foi passada
  if (!condicao) {
    condicao = await getCondicaoPadrao();
  }

  const billingType = {
    pix: 'PIX',
    boleto: 'BOLETO',
    cartao: 'CREDIT_CARD',
    credit_card: 'CREDIT_CARD',
    'Cartão Crédito': 'CREDIT_CARD',
    'Cartão Débito': 'PIX',
    PIX: 'PIX',
    Boleto: 'BOLETO',
    Transferência: 'PIX',
    Dinheiro: 'UNDEFINED',
  }[meio] || 'PIX';

  let valorCobrado = valor;

  const body = {
    customer: asaas_customer_id,
    billingType,
    value: valorCobrado,
    dueDate: vencimento,
    description: descricao || 'Cobrança MBFoto',
    externalReference: referencia || '',
  };

  // Aplicar configurações da condição de pagamento
  if (condicao) {
    // Desconto à vista (PIX/Boleto)
    if ((billingType === 'PIX' || billingType === 'BOLETO') && condicao.desconto_avista > 0) {
      const desconto = condicao.desconto_avista;
      body.discount = {
        value: desconto,
        dueDateLimitDays: 0, // desconto só até o vencimento
        type: 'PERCENTAGE',
      };
    }

    // Juros por atraso
    if (condicao.juros_parcela > 0) {
      body.interest = { value: condicao.juros_parcela }; // % ao mês
    }

    // Multa por atraso (2% padrão)
    body.fine = { value: 2 }; // 2% multa

    // Parcelamento (cartão de crédito)
    if (billingType === 'CREDIT_CARD') {
      const numParcelas = parcelas || condicao.parcelas || 1;
      if (numParcelas > 1) {
        body.installmentCount = numParcelas;
        // Se tem juros de parcela, calcular valor com juros
        if (condicao.juros_parcela > 0) {
          const taxa = condicao.juros_parcela / 100;
          const valorComJuros = valor * (taxa * Math.pow(1 + taxa, numParcelas)) / (Math.pow(1 + taxa, numParcelas) - 1);
          body.installmentValue = Math.ceil(valorComJuros * 100) / 100;
          valorCobrado = body.installmentValue * numParcelas;
        } else {
          body.installmentValue = Math.ceil((valor / numParcelas) * 100) / 100;
        }
      }
    }
  }

  const payment = await asaasFetch('/payments', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const result = {
    gateway_id: payment.id,
    status: 'pendente',
    link_pagamento: payment.invoiceUrl || '',
    pix_copia_cola: '',
    pix_qr_code: '',
    boleto_url: payment.bankSlipUrl || '',
    valor_cobrado: valorCobrado,
    desconto_aplicado: condicao?.desconto_avista || 0,
    juros_aplicado: condicao?.juros_parcela || 0,
  };

  // Buscar QR Code PIX se aplicável
  if (billingType === 'PIX') {
    try {
      const pixData = await asaasFetch(`/payments/${payment.id}/pixQrCode`);
      result.pix_copia_cola = pixData.payload || '';
      result.pix_qr_code = pixData.encodedImage || ''; // base64 da imagem
    } catch (pixErr) {
      console.warn('[ASAAS] Erro ao buscar PIX QR Code:', pixErr.message);
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// ENVIAR COBRANÇA EXISTENTE PARA O ASAAS
// ═══════════════════════════════════════════════════════════════

/**
 * Pega uma cobrança do DynamoDB e envia para o Asaas
 * Retorna os dados do gateway (link, pix, etc)
 */
async function enviarCobrancaParaAsaas(cobrancaId) {
  // Buscar cobrança
  const cobResult = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'COBRANCA', ':sk': `COBRANCA#${cobrancaId}` },
  }));
  const cobranca = cobResult.Items?.[0];
  if (!cobranca) throw new Error('Cobrança não encontrada');
  if (cobranca.gateway_id) throw new Error('Cobrança já enviada para gateway');

  // Buscar dados do cliente
  const clienteId = cobranca.cliente_id;
  let cliente = null;

  if (clienteId) {
    const cliResult = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `CLIENTE#${clienteId}` },
    }));
    cliente = cliResult.Item;

    if (!cliente) {
      const cliResult2 = await dynamo.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: `CLIENT#${clienteId}`, SK: 'PROFILE' },
      }));
      cliente = cliResult2.Item;
    }
  }

  if (!cliente) {
    cliente = { id: clienteId, nome: cobranca.cliente_nome || 'Cliente', email: '', cpf_cnpj: '' };
  } else {
    cliente.id = clienteId;
  }

  // Criar/buscar customer no Asaas
  const asaasCustomerId = await getOrCreateCustomer(cliente);

  // Criar cobrança no Asaas
  const gatewayResult = await criarCobrancaAsaas({
    asaas_customer_id: asaasCustomerId,
    valor: cobranca.valor,
    vencimento: cobranca.vencimento,
    descricao: cobranca.evento_nome || cobranca.descricao || 'Cobrança fotografia',
    meio: cobranca.meio || 'pix',
    referencia: cobranca.id || cobrancaId,
  });

  // Atualizar cobrança no DynamoDB com dados do gateway
  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: cobranca.PK, SK: cobranca.SK },
    UpdateExpression: 'SET gateway = :gw, gateway_id = :gid, link_pagamento = :link, pix_copia_cola = :pix, pix_qr_code = :qr, boleto_url = :boleto, gateway_status = :gs',
    ExpressionAttributeValues: {
      ':gw': 'asaas',
      ':gid': gatewayResult.gateway_id,
      ':link': gatewayResult.link_pagamento,
      ':pix': gatewayResult.pix_copia_cola,
      ':qr': gatewayResult.pix_qr_code,
      ':boleto': gatewayResult.boleto_url,
      ':gs': 'pendente',
    },
  }));

  return gatewayResult;
}

module.exports = {
  getOrCreateCustomer,
  criarCobrancaAsaas,
  enviarCobrancaParaAsaas,
  getCondicoesPagamento,
  getCondicaoPadrao,
  getConfig,
  _clearCache: () => { cachedConfig = null; },
};
