/**
 * Google Calendar Sync Service
 * Sincroniza eventos da agenda MBF → Google Calendar
 */

const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { criarEvento, atualizarEvento, excluirEvento } = require('./googleCalendarService');

const TENANT = process.env.TENANT_ID || 'default';

async function sincronizarBidirecional() {
  const logs = [];

  try {
    // 1. Buscar eventos pendentes de sync (sem google_event_id)
    const eventosPendentes = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'attribute_not_exists(google_event_id) OR sync_status = :ps',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'AGENDA#', ':ps': 'pendente' },
    }));

    for (const evento of (eventosPendentes.Items || [])) {
      try {
        // Criar no Google Calendar
        const result = await criarEvento({
          tipo_evento: evento.tipo_evento,
          cliente_nome: evento.cliente_nome || '',
          data_evento: evento.data_evento,
          horario_inicio: evento.horario_inicio,
          horario_fim: evento.horario_fim,
          local: evento.local || '',
          observacoes: evento.observacoes || '',
        });

        // Atualizar no DynamoDB com google_event_id
        await dynamo.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: evento.PK, SK: evento.SK },
          UpdateExpression: 'SET google_event_id = :g, sync_status = :s, synced_at = :t',
          ExpressionAttributeValues: { ':g': result.id, ':s': 'sincronizado', ':t': new Date().toISOString() },
        }));

        logs.push({ action: 'created', evento_id: evento.id, google_id: result.id });
      } catch (err) {
        logs.push({ action: 'error', evento_id: evento.id, error: err.message });
        // Marcar como erro
        await dynamo.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: evento.PK, SK: evento.SK },
          UpdateExpression: 'SET sync_status = :s, sync_error = :e',
          ExpressionAttributeValues: { ':s': 'erro', ':e': err.message },
        })).catch(() => {});
      }
    }

    return { success: true, logs, synced: logs.filter(l => l.action === 'created').length };
  } catch (error) {
    return { success: false, error: error.message, logs };
  }
}

module.exports = { sincronizarBidirecional };
