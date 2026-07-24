const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { enviarTemplate } = require('./whatsappService');
const { env } = require('../config/env');

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

  // Substituir variáveis
  conteudo = conteudo
    .replace(/{{cliente_nome}}/g, cliente.nome)
    .replace(/{{cliente_cpf}}/g, cliente.cpf || '')
    .replace(/{{cliente_email}}/g, cliente.email || '')
    .replace(/{{cliente_endereco}}/g, cliente.endereco || '')
    .replace(/{{tipo_evento}}/g, orcamento.tipo_evento)
    .replace(/{{data_evento}}/g, orcamento.data_evento || '')
    .replace(/{{local_evento}}/g, orcamento.local || '')
    .replace(/{{valor_total}}/g, `R$ ${orcamento.valor_total?.toFixed(2)}`)
    .replace(/{{data_hoje}}/g, new Date().toLocaleDateString('pt-BR'));

  const id = crypto.randomUUID();
  const contrato = {
    id,
    PK: `CLIENTE#${cliente.id}`, SK: `CONTRATO#${id}`,
    GSI1PK: 'CONTRATO', GSI1SK: `CONTRATO#${id}`,
    cliente_id: cliente.id,
    orcamento_id: orcamentoId,
    modelo_id: modeloId || null,
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

  const cliResult = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'CLIENTE', ':sk': `CLIENTE#${contrato.cliente_id}` },
  }));
  const cliente = cliResult.Items?.[0];
  if (!cliente) throw new Error('Cliente não encontrado');

  const link = `${env.FRONTEND_URL}/contrato/${contrato.token_assinatura}`;

  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: contrato.PK, SK: contrato.SK },
    UpdateExpression: 'SET #s = :s, enviado_em = :e',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':s': 'enviado', ':e': new Date().toISOString() },
  }));

  if (cliente.whatsapp_numero) {
    try {
      await enviarTemplate(cliente.whatsapp_numero, 'contrato_assinatura', [cliente.nome, link]);
    } catch (error) {
      console.error('[CONTRATO] Erro ao enviar WhatsApp:', error.message);
    }
  }

  return { link, enviado_whatsapp: !!cliente.whatsapp_numero };
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

  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: contrato.PK, SK: contrato.SK },
    UpdateExpression: 'SET #s = :s, assinado_em = :a, ip_assinatura = :ip, user_agent_assinatura = :ua, assinatura_hash = :h',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':s': 'assinado',
      ':a': new Date().toISOString(),
      ':ip': dadosAssinatura.ip,
      ':ua': dadosAssinatura.userAgent,
      ':h': dadosAssinatura.hash,
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

module.exports = { gerarContrato, enviarParaAssinatura, assinarContrato };
