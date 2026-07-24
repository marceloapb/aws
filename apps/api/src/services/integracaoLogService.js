const { dynamo, TABLE } = require('../config/dynamodb');
const { PutCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

/**
 * Registra log de integração (email, whatsapp, etc) para a tela admin/integracoes/logs
 * @param {string} integracao - 'email', 'whatsapp', 'instagram', etc
 * @param {string} tipo - 'envio_contrato', 'envio_orcamento', 'notificacao', etc
 * @param {string} resultado - 'sucesso' ou 'erro'
 * @param {string} detalhes - descrição detalhada
 */
async function registrarLogIntegracao(integracao, tipo, resultado, detalhes = '') {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `INTLOG#${id}`,
        SK: `INTLOG#${id}`,
        GSI1PK: 'INTLOG',
        GSI1SK: `INTLOG#${now}`,
        id,
        integracao,
        tipo,
        resultado,
        detalhes,
        created: now,
      },
    }));
  } catch (err) {
    console.error('[LOG_INTEGRACAO] Erro ao salvar log:', err.message);
  }
}

module.exports = { registrarLogIntegracao };
