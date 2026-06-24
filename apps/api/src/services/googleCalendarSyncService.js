import { google } from 'googleapis';
import { dynamo, TABLE } from '../config/dynamodb.js';
import { QueryCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getAuthenticatedClient } from './googleCalendarService.js';
import { SYNC_STATUS } from '../config/constants.js';

const TENANT = process.env.TENANT_ID || 'default';
const GC_PK = 'SYSTEM';
const GC_SK = 'GOOGLE_CALENDAR_CONFIG';

export async function sincronizarBidirecional() {
  const logs = [];

  try {
    const { oauth2Client, calendarId } = await getAuthenticatedClient();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 1. Enviar eventos locais pendentes sem google_event_id
    const eventosPendentes = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'sync_status = :ps AND attribute_not_exists(google_event_id)',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'AGENDA#', ':ps': SYNC_STATUS.PENDENTE },
    }));

    for (const evento of (eventosPendentes.Items || [])) {
      try {
        const cliResult = evento.cliente_id
          ? await dynamo.send(new QueryCommand({
              TableName: TABLE,
              IndexName: 'GSI1',
              KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
              ExpressionAttributeValues: { ':pk': 'CLIENTE', ':sk': `CLIENTE#${evento.cliente_id}` },
            }))
          : null;
        const cliente = cliResult?.Items?.[0];

        const googleEvent = {
          summary: `${evento.tipo_evento} - ${cliente?.nome || 'Cliente'}`,
          description: evento.observacoes || '',
          start: { dateTime: `${evento.data_evento}T${evento.horario_inicio || '09:00'}:00`, timeZone: 'America/Sao_Paulo' },
          end: { dateTime: `${evento.data_evento}T${evento.horario_fim || '18:00'}:00`, timeZone: 'America/Sao_Paulo' },
          location: evento.local || '',
        };

        const response = await calendar.events.insert({ calendarId, resource: googleEvent });
        await dynamo.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: evento.PK, SK: evento.SK },
          UpdateExpression: 'SET google_event_id = :g, sync_status = :s',
          ExpressionAttributeValues: { ':g': response.data.id, ':s': SYNC_STATUS.SINCRONIZADO },
        }));
        logs.push({ tipo: 'local_para_google', evento_id: evento.id, status: 'sucesso' });
      } catch (error) {
        await dynamo.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: evento.PK, SK: evento.SK },
          UpdateExpression: 'SET sync_status = :s, erro = :e',
          ExpressionAttributeValues: { ':s': SYNC_STATUS.ERRO, ':e': error.message },
        }));
        logs.push({ tipo: 'local_para_google', evento_id: evento.id, status: 'erro', mensagem: error.message });
      }
    }

    // 2. Buscar eventos do Google e importar novos
    const configResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: { ':pk': GC_PK, ':sk': GC_SK },
    }));
    const config = configResult.Items?.[0];
    const syncToken = config?.sync_token || null;

    const listParams = { calendarId, singleEvents: true, orderBy: 'startTime' };
    if (syncToken) {
      listParams.syncToken = syncToken;
    } else {
      const umMesAtras = new Date();
      umMesAtras.setMonth(umMesAtras.getMonth() - 1);
      listParams.timeMin = umMesAtras.toISOString();
    }

    try {
      const response = await calendar.events.list(listParams);
      const googleEvents = response.data.items || [];

      for (const gEvent of googleEvents) {
        if (gEvent.status === 'cancelled') continue;

        const existentes = await dynamo.send(new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          FilterExpression: 'google_event_id = :gid',
          ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'AGENDA#', ':gid': gEvent.id },
        }));

        if (!existentes.Items || existentes.Items.length === 0) {
          const id = crypto.randomUUID();
          const dataEvento = gEvent.start?.dateTime || gEvent.start?.date;
          const item = {
            id,
            PK: `TENANT#${TENANT}`, SK: `AGENDA#${dataEvento ? dataEvento.split('T')[0] : ''}#${id}`,
            GSI1PK: 'AGENDA', GSI1SK: `AGENDA#${id}`,
            tipo_evento: 'externo',
            titulo: gEvent.summary || 'Evento Google',
            data_evento: dataEvento ? dataEvento.split('T')[0] : '',
            horario_inicio: dataEvento?.includes('T') ? dataEvento.split('T')[1]?.substring(0, 5) : '09:00',
            local: gEvent.location || '',
            observacoes: gEvent.description || '',
            google_event_id: gEvent.id,
            sync_status: SYNC_STATUS.SINCRONIZADO,
            status: 'ocupada',
            created: new Date().toISOString(),
          };
          await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
          logs.push({ tipo: 'google_para_local', google_id: gEvent.id, status: 'importado' });
        }
      }

      if (response.data.nextSyncToken && config) {
        await dynamo.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: GC_PK, SK: GC_SK },
          UpdateExpression: 'SET sync_token = :t, last_sync = :l',
          ExpressionAttributeValues: { ':t': response.data.nextSyncToken, ':l': new Date().toISOString() },
        }));
      }
    } catch (syncError) {
      if (syncError.code === 410) {
        if (config) {
          await dynamo.send(new UpdateCommand({
            TableName: TABLE,
            Key: { PK: GC_PK, SK: GC_SK },
            UpdateExpression: 'SET sync_token = :t',
            ExpressionAttributeValues: { ':t': '' },
          }));
        }
        logs.push({ tipo: 'sync_token', status: 'resetado' });
      } else {
        throw syncError;
      }
    }

    // Registrar log
    const logId = crypto.randomUUID();
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        id: logId,
        PK: `GCAL_LOG#${logId}`, SK: `GCAL_LOG#${logId}`,
        GSI1PK: 'GCAL_LOG', GSI1SK: new Date().toISOString(),
        tipo: 'sync_bidirecional', status: 'sucesso',
        detalhes: JSON.stringify(logs), total_operacoes: logs.length,
        created: new Date().toISOString(),
      },
    }));

    return { success: true, logs };
  } catch (error) {
    const logId = crypto.randomUUID();
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        id: logId,
        PK: `GCAL_LOG#${logId}`, SK: `GCAL_LOG#${logId}`,
        GSI1PK: 'GCAL_LOG', GSI1SK: new Date().toISOString(),
        tipo: 'sync_bidirecional', status: 'erro',
        detalhes: error.message, total_operacoes: 0,
        created: new Date().toISOString(),
      },
    })).catch(() => {});
    return { success: false, error: error.message, logs };
  }
}

export default { sincronizarBidirecional };
