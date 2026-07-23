// ══════════════════════════════════════════════════════════════
// SERVICES/CLIENTE-HISTORICO-SERVICE.JS
// Gerencia o histórico de eventos do cliente e transições
// automáticas de status no pipeline CRM.
// ══════════════════════════════════════════════════════════════

const crypto = require('crypto');
const { dynamo, TABLE } = require('../config/dynamodb');
const { PutCommand, UpdateCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const TENANT = process.env.TENANT_ID || 'default';

// Pipeline de status com ordem de progressão
const STATUS_PIPELINE = ['Lead', 'Contato', 'Negociação', 'Cliente', 'Inativo'];

// Mapeamento de eventos para transições automáticas de status
const AUTO_TRANSITIONS = {
  'orcamento_criado': 'Negociação',
  'orcamento_enviado': 'Negociação',
  'orcamento_aceito': 'Cliente',
  'contrato_assinado': 'Cliente',
  'pagamento_recebido': 'Cliente',
};

/**
 * Registra um evento no histórico do cliente.
 * @param {Object} params
 * @param {string} params.cliente_id - ID do cliente
 * @param {string} params.tipo - Tipo do evento (orcamento_criado, status_alterado, etc.)
 * @param {string} params.descricao - Descrição legível do evento
 * @param {Object} [params.metadata] - Dados adicionais do evento
 * @param {string} [params.autor] - Quem gerou o evento
 * @returns {Promise<Object>} Evento criado
 */
async function registrarEvento({ cliente_id, tipo, descricao, metadata = {}, autor = 'sistema' }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const item = {
    PK: `CLIENTE#${cliente_id}`,
    SK: `HISTORICO#${now}#${id}`,
    GSI1PK: `HISTORICO_CLIENTE`,
    GSI1SK: `CLIENTE#${cliente_id}#${now}`,
    id,
    cliente_id,
    tipo,
    descricao,
    metadata,
    autor,
    created: now,
  };

  await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
}

/**
 * Busca o histórico completo de um cliente.
 * @param {string} cliente_id - ID do cliente
 * @param {number} [limit=50] - Máximo de eventos
 * @returns {Promise<Array>} Lista de eventos ordenados por data (mais recente primeiro)
 */
async function buscarHistorico(cliente_id, limit = 50) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `CLIENTE#${cliente_id}`,
      ':sk': 'HISTORICO#',
    },
    ScanIndexForward: false, // mais recente primeiro
    Limit: limit,
  }));
  return result.Items || [];
}

/**
 * Busca o cliente em qualquer padrão de armazenamento.
 * @param {string} cliente_id
 * @returns {Promise<{item: Object|null, keyPattern: string}>}
 */
async function findCliente(cliente_id) {
  // Tentar TENANT#<tenant> / CLIENTE#<id> (admin-created)
  try {
    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `CLIENTE#${cliente_id}` },
    }));
    if (result.Item) return { item: result.Item, keyPattern: 'tenant' };
  } catch {}

  // Tentar CLIENT#<id> / PROFILE (self-signup)
  try {
    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `CLIENT#${cliente_id}`, SK: 'PROFILE' },
    }));
    if (result.Item) return { item: result.Item, keyPattern: 'client' };
  } catch {}

  return { item: null, keyPattern: null };
}

/**
 * Avança o status do cliente automaticamente com base no evento ocorrido.
 * Só avança se o novo status estiver "à frente" no pipeline (nunca regride).
 * @param {string} cliente_id - ID do cliente
 * @param {string} evento_tipo - Tipo do evento que dispara a transição
 * @returns {Promise<{transicao: boolean, de: string, para: string}|null>}
 */
async function avancarStatusAutomatico(cliente_id, evento_tipo) {
  const novoStatus = AUTO_TRANSITIONS[evento_tipo];
  if (!novoStatus) return null;

  const { item: cliente, keyPattern } = await findCliente(cliente_id);
  if (!cliente) return null;

  const statusAtual = cliente.status || 'Lead';
  const indexAtual = STATUS_PIPELINE.indexOf(statusAtual);
  const indexNovo = STATUS_PIPELINE.indexOf(novoStatus);

  // Só avança se o novo status está à frente (exceto Inativo que é manual)
  if (indexNovo <= indexAtual || novoStatus === 'Inativo') return null;

  // Determinar PK/SK baseado no padrão encontrado
  let key;
  if (keyPattern === 'tenant') {
    key = { PK: `TENANT#${TENANT}`, SK: `CLIENTE#${cliente_id}` };
  } else {
    key = { PK: `CLIENT#${cliente_id}`, SK: 'PROFILE' };
  }

  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: key,
    UpdateExpression: 'SET #s = :s, status_atualizado_em = :d',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':s': novoStatus, ':d': new Date().toISOString() },
  }));

  // Registrar a mudança de status no histórico
  await registrarEvento({
    cliente_id,
    tipo: 'status_alterado',
    descricao: `Status alterado automaticamente de "${statusAtual}" para "${novoStatus}"`,
    metadata: { de: statusAtual, para: novoStatus, motivo: evento_tipo },
    autor: 'sistema',
  });

  return { transicao: true, de: statusAtual, para: novoStatus };
}

/**
 * Registra uma mudança manual de status (pelo admin).
 * @param {string} cliente_id
 * @param {string} novoStatus
 * @param {string} [autor]
 * @returns {Promise<Object>}
 */
async function registrarMudancaStatusManual(cliente_id, novoStatus, autor = 'admin') {
  const { item: cliente } = await findCliente(cliente_id);
  const statusAnterior = cliente?.status || 'Lead';

  await registrarEvento({
    cliente_id,
    tipo: 'status_alterado',
    descricao: `Status alterado manualmente de "${statusAnterior}" para "${novoStatus}"`,
    metadata: { de: statusAnterior, para: novoStatus, manual: true },
    autor,
  });
}

module.exports = {
  registrarEvento,
  buscarHistorico,
  avancarStatusAutomatico,
  registrarMudancaStatusManual,
  findCliente,
  STATUS_PIPELINE,
  AUTO_TRANSITIONS,
};
