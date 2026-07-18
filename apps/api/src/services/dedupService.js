// ══════════════════════════════════════════════════════════════
// SERVICES/DEDUP-SERVICE.JS — Idempotência de eventos
// ══════════════════════════════════════════════════════════════

const { PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamo, TABLE } = require('../config/dynamodb');

const TTL_24H = 24 * 60 * 60; // 24 horas em segundos

/**
 * Verifica se um evento já foi processado
 * @param {string} evento_id - ID único do evento
 * @returns {Promise<boolean>} true se já foi processado (duplicata)
 */
async function verificarDedup(evento_id) {
  const result = await dynamo.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `DEDUP#${evento_id}`, SK: `DEDUP#${evento_id}` },
  }));
  return !!result.Item;
}

/**
 * Marca um evento como processado com TTL de 24h
 * Usa ConditionExpression para evitar duplicatas concorrentes
 * @param {string} evento_id - ID único do evento
 * @returns {Promise<boolean>} true se marcou com sucesso, false se já existia
 */
async function marcarProcessado(evento_id) {
  const ttl = Math.floor(Date.now() / 1000) + TTL_24H;

  try {
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `DEDUP#${evento_id}`,
        SK: `DEDUP#${evento_id}`,
        evento_id,
        processado_em: new Date().toISOString(),
        ttl,
      },
      ConditionExpression: 'attribute_not_exists(PK)',
    }));
    return true;
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return false; // Já existia — duplicata
    }
    throw error;
  }
}

module.exports = { verificarDedup, marcarProcessado };
