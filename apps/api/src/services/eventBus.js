// ══════════════════════════════════════════════════════════════
// SERVICES/EVENT-BUS.JS — Emissão de eventos via EventBridge
// ══════════════════════════════════════════════════════════════

const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const crypto = require('crypto');

const eventBridge = new EventBridgeClient({});
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'mbf-events';

/**
 * Emite um evento no EventBridge
 * @param {string} source - Origem do evento (ex: 'mbf.orcamentos', 'mbf.contratos')
 * @param {string} detailType - Tipo do evento (ex: 'OrcamentoCriado', 'ContratoAssinado')
 * @param {Object} detail - Payload do evento
 * @returns {Promise<Object>} Resultado do envio
 */
async function emitirEvento(source, detailType, detail) {
  const evento_id = detail.evento_id || crypto.randomUUID();
  const now = new Date().toISOString();

  const payload = {
    evento_id,
    tenant_id: detail.tenant_id || process.env.TENANT_ID || 'default',
    dominio: detail.dominio || source.split('.').pop(),
    acao: detail.acao || detailType,
    recurso_id: detail.recurso_id,
    ocorrido_em: detail.ocorrido_em || now,
    ...detail,
  };

  const command = new PutEventsCommand({
    Entries: [
      {
        EventBusName: EVENT_BUS_NAME,
        Source: source,
        DetailType: detailType,
        Detail: JSON.stringify(payload),
        Time: new Date(),
      },
    ],
  });

  const result = await eventBridge.send(command);

  if (result.FailedEntryCount > 0) {
    const failed = result.Entries.find(e => e.ErrorCode);
    throw new Error(`EventBridge falhou: ${failed.ErrorCode} - ${failed.ErrorMessage}`);
  }

  return { success: true, evento_id, eventId: result.Entries[0].EventId };
}

module.exports = { emitirEvento };
