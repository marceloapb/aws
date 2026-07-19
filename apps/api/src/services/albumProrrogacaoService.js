// ══════════════════════════════════════════════════════════════
// ALB-11: Album Extension (Prorrogação) Service
// ══════════════════════════════════════════════════════════════

const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const OPCOES_PRORROGACAO = [
  { dias: 15, valor: 29.90 },
  { dias: 30, valor: 49.90 },
  { dias: 60, valor: 79.90 },
];

/**
 * Retorna as opções fixas de prorrogação disponíveis
 */
function getOpcoesProrrogacao() {
  return OPCOES_PRORROGACAO;
}

/**
 * Cria uma solicitação de prorrogação para um álbum
 * @param {string} albumId - ID do álbum
 * @param {number} dias - Dias de extensão solicitados
 * @param {number} valor - Valor da prorrogação
 * @returns {Promise<Object>} Record da prorrogação criada
 */
async function solicitarProrrogacao(albumId, dias, valor) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const item = {
    PK: `ALBUM#${albumId}`,
    SK: `PRORROGACAO#${id}`,
    id,
    album_id: albumId,
    dias,
    valor,
    status: 'pendente',
    created_at: now,
  };

  await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

  return item;
}

/**
 * Aprova uma prorrogação: atualiza data_expiracao do álbum e marca como aprovada
 * @param {string} prorrogacaoId - ID da prorrogação
 * @param {string} albumId - ID do álbum
 * @returns {Promise<Object>} Prorrogação atualizada
 */
async function aprovarProrrogacao(prorrogacaoId, albumId) {
  // Buscar a prorrogação
  const prorrogacaoResult = await dynamo.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `ALBUM#${albumId}`, SK: `PRORROGACAO#${prorrogacaoId}` },
  }));

  if (!prorrogacaoResult.Item) {
    throw new Error('Prorrogação não encontrada');
  }

  const prorrogacao = prorrogacaoResult.Item;

  if (prorrogacao.status !== 'pendente') {
    throw new Error('Prorrogação já foi processada');
  }

  // Buscar o álbum para obter data_expiracao atual
  const albumResult = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'ALBUM', ':sk': `ALBUM#${albumId}` },
  }));

  if (!albumResult.Items || albumResult.Items.length === 0) {
    throw new Error('Álbum não encontrado');
  }

  const album = albumResult.Items[0];

  // Calcular nova data de expiração
  const dataAtual = album.data_expiracao
    ? new Date(album.data_expiracao)
    : new Date();
  dataAtual.setDate(dataAtual.getDate() + prorrogacao.dias);
  const novaExpiracao = dataAtual.toISOString().split('T')[0];

  // Atualizar data_expiracao do álbum e resetar last_aviso_dias
  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: album.PK, SK: album.SK },
    UpdateExpression: 'SET data_expiracao = :exp, #s = :ativo REMOVE last_aviso_dias',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':exp': novaExpiracao,
      ':ativo': 'ativo',
    },
  }));

  // Marcar prorrogação como aprovada
  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `ALBUM#${albumId}`, SK: `PRORROGACAO#${prorrogacaoId}` },
    UpdateExpression: 'SET #s = :status, aprovado_em = :now, nova_expiracao = :exp',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':status': 'aprovada',
      ':now': new Date().toISOString(),
      ':exp': novaExpiracao,
    },
  }));

  return { ...prorrogacao, status: 'aprovada', nova_expiracao: novaExpiracao };
}

/**
 * Lista prorrogações de um álbum
 * @param {string} albumId - ID do álbum
 * @returns {Promise<Array>} Lista de prorrogações
 */
async function listarProrrogacoes(albumId) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `ALBUM#${albumId}`,
      ':sk': 'PRORROGACAO#',
    },
  }));

  return (result.Items || []).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

module.exports = { getOpcoesProrrogacao, solicitarProrrogacao, aprovarProrrogacao, listarProrrogacoes };
