// ══════════════════════════════════════════════════════════════
// SERVICES/GOOGLE-CALENDAR-SYNC-SERVICE.JS — Sincronização bidirecional
// ══════════════════════════════════════════════════════════════

import { google } from 'googleapis';
import { getPocketbaseClient } from '../config/pocketbase.js';
import { getAuthenticatedClient } from './googleCalendarService.js';

export async function sincronizarBidirecional() {
  const pb = await getPocketbaseClient();
  const logs = [];

  try {
    const { oauth2Client, calendarId } = await getAuthenticatedClient();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Buscar config para sync token
    const configs = await pb.collection('google_calendar_config').getFullList();
    const config = configs[0];

    // 1. PULL — Buscar eventos do Google Calendar
    const listParams = {
      calendarId,
      singleEvents: true,
      orderBy: 'startTime',
    };

    if (config.sync_token) {
      listParams.syncToken = config.sync_token;
    } else {
      // Primeira sync — últimos 30 dias + próximos 90 dias
      const agora = new Date();
      listParams.timeMin = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      listParams.timeMax = new Date(agora.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
    }

    let googleEvents = [];
    let nextSyncToken = null;

    try {
      const response = await calendar.events.list(listParams);
      googleEvents = response.data.items || [];
      nextSyncToken = response.data.nextSyncToken;
    } catch (error) {
      if (error.code === 410) {
        // Sync token expirado — full sync
        const agora = new Date();
        const response = await calendar.events.list({
          calendarId,
          singleEvents: true,
          orderBy: 'startTime',
          timeMin: new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          timeMax: new Date(agora.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        });
        googleEvents = response.data.items || [];
        nextSyncToken = response.data.nextSyncToken;
      } else {
        throw error;
      }
    }

    // Processar eventos do Google → PocketBase
    for (const gEvent of googleEvents) {
      if (gEvent.status === 'cancelled') {
        // Evento cancelado no Google — marcar como cancelado localmente
        const existentes = await pb.collection('agenda').getFullList({
          filter: `google_event_id = "${gEvent.id}"`,
        });
        for (const local of existentes) {
          await pb.collection('agenda').update(local.id, { status: 'cancelada' });
          logs.push({ operacao: 'cancelar_local', google_event_id: gEvent.id });
        }
        continue;
      }

      // Verificar se já existe localmente
      const existentes = await pb.collection('agenda').getFullList({
        filter: `google_event_id = "${gEvent.id}"`,
      });

      if (existentes.length === 0) {
        // Evento novo do Google — criar localmente
        const startDate = gEvent.start?.dateTime || gEvent.start?.date;
        await pb.collection('agenda').create({
          titulo: gEvent.summary || 'Evento sem título',
          data_evento: startDate ? startDate.split('T')[0] : '',
          horario_inicio: startDate?.includes('T') ? startDate.split('T')[1].substring(0, 5) : '09:00',
          horario_fim: gEvent.end?.dateTime?.split('T')[1]?.substring(0, 5) || '18:00',
          local: gEvent.location || '',
          observacoes: gEvent.description || '',
          google_event_id: gEvent.id,
          sync_status: 'sincronizado',
          status: 'ocupada',
          origem: 'google',
        });
        logs.push({ operacao: 'criar_local', google_event_id: gEvent.id });
      }
    }

    // 2. PUSH — Enviar eventos locais sem google_event_id
    const eventosLocais = await pb.collection('agenda').getFullList({
      filter: 'google_event_id = "" && sync_status != "erro"',
    });

    for (const local of eventosLocais) {
      try {
        const event = {
          summary: `${local.tipo_evento || 'Evento'} - ${local.titulo || 'Cliente'}`,
          start: {
            dateTime: `${local.data_evento}T${local.horario_inicio || '09:00'}:00`,
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: `${local.data_evento}T${local.horario_fim || '18:00'}:00`,
            timeZone: 'America/Sao_Paulo',
          },
          location: local.local || '',
          description: local.observacoes || '',
        };

        const response = await calendar.events.insert({ calendarId, resource: event });
        await pb.collection('agenda').update(local.id, {
          google_event_id: response.data.id,
          sync_status: 'sincronizado',
        });
        logs.push({ operacao: 'criar_google', local_id: local.id });
      } catch (error) {
        await pb.collection('agenda').update(local.id, { sync_status: 'erro', erro: error.message });
        logs.push({ operacao: 'erro_push', local_id: local.id, erro: error.message });
      }
    }

    // Salvar sync token e timestamp
    if (nextSyncToken) {
      await pb.collection('google_calendar_config').update(config.id, {
        sync_token: nextSyncToken,
        last_sync: new Date().toISOString(),
      });
    }

    // Registrar log
    await pb.collection('google_calendar_logs').create({
      tipo: 'sync_bidirecional',
      status: 'sucesso',
      detalhes: JSON.stringify({ total_operacoes: logs.length, logs }),
    });

    return { success: true, logs };
  } catch (error) {
    await pb.collection('google_calendar_logs').create({
      tipo: 'sync_bidirecional',
      status: 'erro',
      detalhes: JSON.stringify({ erro: error.message }),
    });
    return { success: false, error: error.message, logs };
  }
}

export default { sincronizarBidirecional };
