// ══════════════════════════════════════════════════════════════
// SERVICES/GOOGLE-CALENDAR-SYNC-SERVICE.JS — Sincronização bidirecional
// ══════════════════════════════════════════════════════════════

import { google } from 'googleapis';
import { getPocketbaseClient } from '../config/pocketbase.js';
import { getAuthenticatedClient } from './googleCalendarService.js';
import { SYNC_STATUS } from '../config/constants.js';

export async function sincronizarBidirecional() {
  const pb = await getPocketbaseClient();
  const logs = [];

  try {
    const { oauth2Client, calendarId } = await getAuthenticatedClient();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 1. Enviar eventos locais pendentes para o Google
    const eventosPendentes = await pb.collection('agenda').getFullList({
      filter: `sync_status = "${SYNC_STATUS.PENDENTE}" && google_event_id = ""`,
    });

    for (const evento of eventosPendentes) {
      try {
        const cliente = evento.cliente_id
          ? await pb.collection('clientes').getOne(evento.cliente_id)
          : null;

        const googleEvent = {
          summary: `${evento.tipo_evento} - ${cliente?.nome || 'Cliente'}`,
          description: evento.observacoes || '',
          start: {
            dateTime: `${evento.data_evento}T${evento.horario_inicio || '09:00'}:00`,
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: `${evento.data_evento}T${evento.horario_fim || '18:00'}:00`,
            timeZone: 'America/Sao_Paulo',
          },
          location: evento.local || '',
        };

        const response = await calendar.events.insert({ calendarId, resource: googleEvent });

        await pb.collection('agenda').update(evento.id, {
          google_event_id: response.data.id,
          sync_status: SYNC_STATUS.SINCRONIZADO,
        });

        logs.push({ tipo: 'local_para_google', evento_id: evento.id, status: 'sucesso' });
      } catch (error) {
        await pb.collection('agenda').update(evento.id, {
          sync_status: SYNC_STATUS.ERRO,
          erro: error.message,
        });
        logs.push({ tipo: 'local_para_google', evento_id: evento.id, status: 'erro', mensagem: error.message });
      }
    }

    // 2. Buscar eventos do Google e importar novos
    const configs = await pb.collection('google_calendar_config').getFullList();
    const config = configs[0];
    const syncToken = config?.sync_token || null;

    let listParams = { calendarId, singleEvents: true, orderBy: 'startTime' };

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

        // Verificar se já existe localmente
        const existentes = await pb.collection('agenda').getFullList({
          filter: `google_event_id = "${gEvent.id}"`,
        });

        if (existentes.length === 0) {
          // Importar novo evento
          const dataEvento = gEvent.start?.dateTime || gEvent.start?.date;
          await pb.collection('agenda').create({
            tipo_evento: 'externo',
            titulo: gEvent.summary || 'Evento Google',
            data_evento: dataEvento ? dataEvento.split('T')[0] : '',
            horario_inicio: dataEvento?.includes('T') ? dataEvento.split('T')[1]?.substring(0, 5) : '09:00',
            local: gEvent.location || '',
            observacoes: gEvent.description || '',
            google_event_id: gEvent.id,
            sync_status: SYNC_STATUS.SINCRONIZADO,
            status: 'ocupada',
          });
          logs.push({ tipo: 'google_para_local', google_id: gEvent.id, status: 'importado' });
        }
      }

      // Salvar sync token
      if (response.data.nextSyncToken && config) {
        await pb.collection('google_calendar_config').update(config.id, {
          sync_token: response.data.nextSyncToken,
          last_sync: new Date().toISOString(),
        });
      }
    } catch (syncError) {
      if (syncError.code === 410) {
        // Sync token expirado — resetar
        if (config) {
          await pb.collection('google_calendar_config').update(config.id, { sync_token: '' });
        }
        logs.push({ tipo: 'sync_token', status: 'resetado' });
      } else {
        throw syncError;
      }
    }

    // Registrar log
    await pb.collection('google_calendar_logs').create({
      tipo: 'sync_bidirecional',
      status: 'sucesso',
      detalhes: JSON.stringify(logs),
      total_operacoes: logs.length,
    });

    return { success: true, logs };
  } catch (error) {
    await pb.collection('google_calendar_logs').create({
      tipo: 'sync_bidirecional',
      status: 'erro',
      detalhes: error.message,
      total_operacoes: 0,
    });
    return { success: false, error: error.message, logs };
  }
}

export default { sincronizarBidirecional };
