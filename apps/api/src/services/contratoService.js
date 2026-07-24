const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { enviarTemplate } = require('./whatsappService');
const { env } = require('../config/env');

/**
 * Gera número sequencial para contratos (ex: 2026-001, 2026-002...)
 * Usa atomic counter no DynamoDB
 */
async function gerarNumeroContrato(tenantId) {
  const ano = new Date().getFullYear();
  const result = await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `TENANT#${tenantId || 'default'}`, SK: `COUNTER#contrato_${ano}` },
    UpdateExpression: 'ADD #seq :inc',
    ExpressionAttributeNames: { '#seq': 'seq' },
    ExpressionAttributeValues: { ':inc': 1 },
    ReturnValues: 'ALL_NEW',
  }));
  const seq = result.Attributes.seq || 1;
  return `${ano}-${String(seq).padStart(3, '0')}`;
}

const TEMPLATES = {
  casamento: 'contrato_casamento',
  ensaio: 'contrato_ensaio',
  aniversario: 'contrato_aniversario',
  corporativo: 'contrato_corporativo',
  default: 'contrato_padrao',
};

async function gerarContrato(orcamentoId, modeloId, tenantId) {
  // Buscar orçamento
  const orcResult = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'ORCAMENTO', ':sk': `ORCAMENTO#${orcamentoId}` },
  }));
  const orcamento = orcResult.Items?.[0];
  if (!orcamento) throw new Error('Orçamento não encontrado');

  // Verificar se já existe contrato para este orçamento
  const contratoExistente = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    FilterExpression: 'orcamento_id = :oid',
    ExpressionAttributeValues: { ':pk': 'CONTRATO', ':oid': orcamentoId },
  }));
  if (contratoExistente.Items && contratoExistente.Items.length > 0) {
    throw new Error('Já existe um contrato gerado para este orçamento. Exclua o contrato existente antes de gerar um novo.');
  }

  // Buscar cliente (tentar múltiplos padrões)
  let cliente = null;

  // Padrão 1: GSI1 (CLIENTE/CLIENTE#<id>) - clientes criados pelo admin
  const cliResult = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'CLIENTE', ':sk': `CLIENTE#${orcamento.cliente_id}` },
  }));
  cliente = cliResult.Items?.[0];

  // Padrão 2: CLIENT#<id> / PROFILE (self-signup)
  if (!cliente) {
    const { GetCommand } = require('@aws-sdk/lib-dynamodb');
    const cli2 = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `CLIENT#${orcamento.cliente_id}`, SK: 'PROFILE' },
    }));
    if (cli2.Item) {
      cliente = { ...cli2.Item, id: orcamento.cliente_id, nome: cli2.Item.nome || cli2.Item.nome_completo || '' };
    }
  }

  // Padrão 3: TENANT#default / CLIENTE#<id>
  if (!cliente) {
    const TENANT = process.env.TENANT_ID || 'default';
    const { GetCommand } = require('@aws-sdk/lib-dynamodb');
    const cli3 = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `CLIENTE#${orcamento.cliente_id}` },
    }));
    if (cli3.Item) cliente = cli3.Item;
  }

  if (!cliente) throw new Error('Cliente não encontrado no orçamento');

  const TENANT = tenantId || process.env.TENANT_ID || 'default';
  let conteudo = null;

  // Se modelo_id fornecido, buscar o MODELO_CONTRATO cadastrado
  if (modeloId) {
    const modeloResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': `MODELO_CONTRATO#${modeloId}` },
    }));
    const modelo = modeloResult.Items?.[0];
    if (modelo && modelo.corpo_html) {
      conteudo = modelo.corpo_html;
    }
  }

  // Fallback: buscar template de configuração legado
  if (!conteudo) {
    const templateKey = TEMPLATES[orcamento.tipo_evento] || TEMPLATES.default;
    const cfgResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': `CONFIG#${templateKey}` },
    }));
    conteudo = cfgResult.Items?.[0]?.valor || getTemplateDefault(orcamento.tipo_evento);
  }

  // Buscar dados da empresa para variáveis {{empresa_*}}
  let empresa = {};
  try {
    // Try tenant-specific first, then fallback to TENANT#default
    let cfgResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'CONFIG#' },
    }));
    let items = (cfgResult.Items || []).filter(i => i.chave);
    if (items.length === 0 && TENANT !== 'default') {
      cfgResult = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': 'TENANT#default', ':sk': 'CONFIG#' },
      }));
      items = (cfgResult.Items || []).filter(i => i.chave);
    }
    for (const item of items) {
      empresa[item.chave] = item.valor;
    }
  } catch {}

  // Montar endereço do cliente
  const clienteEndereco = cliente.endereco_rua
    ? [cliente.endereco_rua, cliente.endereco_numero, cliente.endereco_bairro, cliente.endereco_cidade, cliente.endereco_estado].filter(Boolean).join(', ')
    : (cliente.endereco || '');

  // Montar endereço da empresa
  const empresaEndereco = [empresa.rua, empresa.numero, empresa.complemento, empresa.bairro, empresa.cidade, empresa.estado].filter(Boolean).join(', ');

  // Gerar número sequencial do contrato
  const numeroContrato = await gerarNumeroContrato(TENANT);

  // Substituir variáveis
  conteudo = conteudo
    // Cliente
    .replace(/{{cliente_nome}}/g, cliente.nome || '')
    .replace(/{{nome_cliente}}/g, cliente.nome || '')
    .replace(/{{cliente_cpf}}/g, cliente.cpf_cnpj || cliente.cpf || '')
    .replace(/{{cpf_cliente}}/g, cliente.cpf_cnpj || cliente.cpf || '')
    .replace(/{{cliente_email}}/g, cliente.email || '')
    .replace(/{{cliente_telefone}}/g, cliente.telefone || '')
    .replace(/{{cliente_endereco}}/g, clienteEndereco)
    .replace(/{{cliente_instagram}}/g, cliente.instagram || '')
    // Evento
    .replace(/{{tipo_evento}}/g, orcamento.tipo_evento || orcamento.nome_evento || '')
    .replace(/{{data_evento}}/g, orcamento.data_evento ? new Date(orcamento.data_evento + 'T12:00:00').toLocaleDateString('pt-BR') : '')
    .replace(/{{local_evento}}/g, orcamento.local || orcamento.local_evento || '')
    .replace(/{{local}}/g, orcamento.local || orcamento.local_evento || '')
    .replace(/{{horario_inicio}}/g, orcamento.horario_inicio || '')
    .replace(/{{horario_fim}}/g, orcamento.horario_fim || '')
    .replace(/{{duracao_horas}}/g, orcamento.horas_evento || '')
    // Orçamento
    .replace(/{{valor_total}}/g, `R$ ${(orcamento.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    .replace(/{{itens_descricao}}/g, (orcamento.opcoes?.[0]?.itens_snapshot || []).map(i => `${i.nome} (${i.quantidade}x)`).join(', ') || '')
    .replace(/{{condicoes_pagamento}}/g, (() => {
      const c = orcamento.condicoes_pagamento || {};
      const parts = [];
      if (c.avista?.ativo) parts.push(`À vista com ${c.avista.desconto_pct || 0}% de desconto`);
      if (c.sem_juros?.ativo) parts.push(`${c.sem_juros.max_parcelas}x sem juros`);
      if (c.com_juros?.ativo) parts.push(`${c.com_juros.max_parcelas}x com ${c.com_juros.taxa_mensal}% a.m.`);
      return parts.join(' | ') || 'A combinar';
    })())
    .replace(/{{desconto}}/g, orcamento.opcoes?.[0]?.desconto_valor ? `${orcamento.opcoes[0].desconto_valor}${orcamento.opcoes[0].desconto_tipo === 'pct' ? '%' : ' reais'}` : '')
    .replace(/{{parcelas}}/g, orcamento.condicoes_pagamento?.sem_juros?.max_parcelas || '')
    .replace(/{{valor_parcela}}/g, orcamento.condicoes_pagamento?.sem_juros?.max_parcelas ? `R$ ${((orcamento.valor_total || 0) / orcamento.condicoes_pagamento.sem_juros.max_parcelas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '')
    // Contrato
    .replace(/{{data_hoje}}/g, new Date().toLocaleDateString('pt-BR'))
    .replace(/{{validade_dias}}/g, orcamento.validade_dias || '7')
    .replace(/{{numero_contrato}}/g, numeroContrato)
    // Empresa
    .replace(/{{empresa_nome}}/g, empresa.tradeName || empresa.businessName || '')
    .replace(/{{empresa_razao}}/g, empresa.businessName || '')
    .replace(/{{empresa_cnpj}}/g, empresa.cnpj || '')
    .replace(/{{empresa_endereco}}/g, empresaEndereco)
    .replace(/{{empresa_telefone}}/g, empresa.phone || empresa.whatsappBusiness || '')
    .replace(/{{empresa_whatsapp}}/g, empresa.whatsappBusiness || empresa.phone || '')
    .replace(/{{empresa_email}}/g, empresa.email || '')
    .replace(/{{empresa_instagram}}/g, empresa.instagram || '')
    .replace(/{{empresa_website}}/g, empresa.website || '')
    // Dados bancários
    .replace(/{{empresa_pix}}/g, empresa.pix || empresa.pixKey || '')
    .replace(/{{empresa_banco}}/g, empresa.banco || '')
    .replace(/{{empresa_agencia}}/g, empresa.agencia || '')
    .replace(/{{empresa_conta}}/g, empresa.conta || '');

  const id = crypto.randomUUID();
  const contrato = {
    id,
    PK: `CLIENTE#${cliente.id}`, SK: `CONTRATO#${id}`,
    GSI1PK: 'CONTRATO', GSI1SK: `CONTRATO#${id}`,
    cliente_id: cliente.id,
    orcamento_id: orcamentoId,
    modelo_id: modeloId || null,
    numero_contrato: numeroContrato,
    conteudo_html: conteudo,
    status: 'rascunho',
    token_assinatura: crypto.randomUUID(),
    created: new Date().toISOString(),
  };
  await dynamo.send(new PutCommand({ TableName: TABLE, Item: contrato }));
  return contrato;
}

async function enviarParaAssinatura(contratoId) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'CONTRATO', ':sk': `CONTRATO#${contratoId}` },
  }));
  const contrato = result.Items?.[0];
  if (!contrato) throw new Error('Contrato não encontrado');

  // Buscar cliente (múltiplos padrões)
  let cliente = null;
  const cliResult = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'CLIENTE', ':sk': `CLIENTE#${contrato.cliente_id}` },
  }));
  cliente = cliResult.Items?.[0];

  if (!cliente) {
    const { GetCommand } = require('@aws-sdk/lib-dynamodb');
    const cli2 = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { PK: `CLIENT#${contrato.cliente_id}`, SK: 'PROFILE' } }));
    if (cli2.Item) cliente = { ...cli2.Item, id: contrato.cliente_id };
  }
  if (!cliente) {
    const TENANT = process.env.TENANT_ID || 'default';
    const { GetCommand } = require('@aws-sdk/lib-dynamodb');
    const cli3 = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { PK: `TENANT#${TENANT}`, SK: `CLIENTE#${contrato.cliente_id}` } }));
    if (cli3.Item) cliente = cli3.Item;
  }
  if (!cliente) throw new Error('Cliente não encontrado');

  const link = `${env.FRONTEND_URL}/contrato/${contrato.token_assinatura}`;

  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: contrato.PK, SK: contrato.SK },
    UpdateExpression: 'SET #s = :s, enviado_em = :e',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':s': 'enviado', ':e': new Date().toISOString() },
  }));

  let enviado_whatsapp = false;
  let enviado_email = false;

  const { registrarLogIntegracao } = require('./integracaoLogService');

  // Enviar WhatsApp
  const telefone = cliente.whatsapp_numero || cliente.telefone;
  if (telefone) {
    try {
      await enviarTemplate(telefone, 'contrato_assinatura', [cliente.nome || 'Cliente', link]);
      enviado_whatsapp = true;
      await registrarLogIntegracao('whatsapp', 'envio_contrato', 'sucesso', `Contrato enviado para ${cliente.nome || telefone} (${telefone})`);
    } catch (error) {
      console.error('[CONTRATO] Erro ao enviar WhatsApp:', error.message);
      await registrarLogIntegracao('whatsapp', 'envio_contrato', 'erro', `Falha ao enviar para ${telefone}: ${error.message}`);
    }
  }

  // Enviar E-mail
  const email = cliente.email;
  if (email) {
    try {
      const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
      const ses = new SESClient({});
      const { loadParams } = require('../config/env');
      const params = await loadParams();
      const fromEmail = params.SES_FROM_EMAIL || process.env.SES_FROM_EMAIL || 'contato@bloise.com.br';
      await ses.send(new SendEmailCommand({
        Source: fromEmail,
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: { Data: 'Seu contrato está pronto para assinatura' },
          Body: {
            Html: {
              Data: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <div style="background:#EA580C;padding:15px 20px;border-radius:8px 8px 0 0;">
                  <h2 style="color:white;margin:0;font-size:18px;">📋 Contrato para Assinatura</h2>
                </div>
                <div style="background:white;padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                  <p>Olá <strong>${cliente.nome || 'Cliente'}</strong>,</p>
                  <p>Seu contrato está pronto para revisão e assinatura.</p>
                  <a href="${link}" style="display:inline-block;margin-top:15px;padding:12px 24px;background:#EA580C;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Assinar Contrato</a>
                  <p style="color:#6b7280;font-size:12px;margin-top:20px;">Se não solicitou este contrato, ignore este e-mail.</p>
                </div>
              </div>`,
            },
          },
        },
      }));
      enviado_email = true;
      await registrarLogIntegracao('email', 'envio_contrato', 'sucesso', `E-mail enviado para ${email} (de: ${fromEmail})`);
    } catch (error) {
      console.error('[CONTRATO] Erro ao enviar email:', error.message);
      await registrarLogIntegracao('email', 'envio_contrato', 'erro', `Falha ao enviar para ${email}: ${error.message}`);
    }
  }

  return { link, enviado_whatsapp, enviado_email };
}

/**
 * Assinar como contratado (admin/fotógrafo assina primeiro)
 */
async function assinarComoContratado(contratoId, dadosAdmin) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'CONTRATO', ':sk': `CONTRATO#${contratoId}` },
  }));
  const contrato = result.Items?.[0];
  if (!contrato) throw new Error('Contrato não encontrado');

  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: contrato.PK, SK: contrato.SK },
    UpdateExpression: 'SET assinatura_contratado = :ac, assinado_contratado_em = :dt',
    ExpressionAttributeValues: {
      ':ac': {
        nome: dadosAdmin.nome || '',
        ip: dadosAdmin.ip || '',
        user_agent: dadosAdmin.userAgent || '',
        data: new Date().toISOString(),
      },
      ':dt': new Date().toISOString(),
    },
  }));

  return { success: true };
}

async function assinarContrato(token, dadosAssinatura) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    FilterExpression: 'token_assinatura = :token',
    ExpressionAttributeValues: { ':pk': 'CONTRATO', ':token': token },
  }));
  if (!result.Items || result.Items.length === 0) throw new Error('Contrato não encontrado');
  const contrato = result.Items[0];
  if (contrato.status === 'assinado') throw new Error('Contrato já foi assinado');

  const agora = new Date().toISOString();

  // Montar objeto "aceite" com comprovação da assinatura do contratante (cliente)
  const aceite = {
    nome: dadosAssinatura.nome_digitado || '',
    data: agora,
    ip: dadosAssinatura.ip || '',
    user_agent: dadosAssinatura.userAgent || '',
    aceite_termos: dadosAssinatura.aceite_termos || false,
  };

  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: contrato.PK, SK: contrato.SK },
    UpdateExpression: 'SET #s = :s, assinado_em = :a, ip_assinatura = :ip, user_agent_assinatura = :ua, assinatura_hash = :h, aceite = :aceite',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':s': 'assinado',
      ':a': agora,
      ':ip': dadosAssinatura.ip || '',
      ':ua': dadosAssinatura.userAgent || '',
      ':h': dadosAssinatura.hash || '',
      ':aceite': aceite,
    },
  }));

  return { success: true };
}

function getTemplateDefault(tipoEvento) {
  return `<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS</h1>
<p>Contratante: {{cliente_nome}}, CPF: {{cliente_cpf}}</p>
<p>Tipo de evento: {{tipo_evento}}</p>
<p>Data: {{data_evento}}</p>
<p>Local: {{local_evento}}</p>
<p>Valor: {{valor_total}}</p>
<p>Data: {{data_hoje}}</p>`;
}

module.exports = { gerarContrato, enviarParaAssinatura, assinarContrato, assinarComoContratado };
