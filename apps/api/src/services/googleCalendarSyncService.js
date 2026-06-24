// ══════════════════════════════════════════════════════════════
// SERVICES/GOOGLE-CALENDAR-SYNC-SERVICE.JS — Sincronização bidirecional
// ══════════════════════════════════════════════════════════════

import { google } from 'googleapis';
import { getPocketbaseClient } from '../config/pocketbase.js';
import { getAuthenticatedClient } from './googleCalendarService.js';

export async function sincronizarBidirecional() {
  const pb = await getPocketbaseClient();
  const logEntries = [];

  try {
    // 1. Enviar eventos locais pendentes para o Google
    const eventosPendentes = await pb.collection('agenda').getFullList({
      filter: 'sync_status = "pendente"',
    });

    for (const evento of eventosPendentes) {
      try {
        const { oauth2Client, config } = await getAuthenticatedClient();
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        let cliente = null;
        if (evento.cliente_id) {
          try {
            cliente = await pb.collection('clientes').getOne(evento.cliente_id);
          } catch { /* cliente pode ter sido removido */ }
        }

        const eventData = {
          summary: `${evento.tipo_evento}${cliente ? ` — ${cliente.nome}` : ''}`,
          description: evento.observacoes || '',
          location: evento.local_evento || '',
          start: {
            dateTime: `${evento.data_evento}T${evento.horario_inicio || '09:00'}:00`,
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: `${evento.data_evento}T${evento.horario_fim || '18:00'}:00`,
            timeZone: 'America/Sao_Paulo',
          },
          colorId: evento.cor_calendario || undefined,
        };

        let result;
        if (evento.google_event_id) {
          // Atualizar existente
          result = await calendar.events.update({
            calendarId: config.calendar_id || 'primary',
            eventId: evento.google_event_id,
            resource: eventData,
          });
          logEntries.push({ tipo: 'update', direcao: 'local_to_google', evento_id: evento.id, status: 'sucesso' });
        } else {
          // Criar novo
          result = await calendar.events.insert({
            calendarId: config.calendar_id || 'primary',
            resource: eventData,
          });
          logEntries.push({ tipo: 'create', direcao: 'local_to_google', evento_id: evento.id, status: 'sucesso' });
        }

        await pb.collection('agenda').update(evento.id, {
          google_event_id: result.data.id,
          sync_status: 'sincronizado',
          erro: '',
        });
      } catch (error) {
        await pb.collection('agenda').update(evento.id, {
          sync_status: 'erro',
          erro: error.message,
        });
        logEntries.push({ tipo: 'error', direcao: 'local_to_google', evento_id: evento.id, status: 'erro', detalhes: error.message });
      }
    }

    // 2. Buscar eventos do Google (incremental sync)
    const configs = await pb.collection('google_calendar_config').getFullList();
    const calConfig = configs[0];

    if (calConfig) {
      const { oauth2Client } = await getAuthenticatedClient();
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const listParams = {
        calendarId: calConfig.calendar_id || 'primary',
        singleEvents: true,
        orderBy: 'startTime',
      };

      if (calConfig.sync_token) {
        listParams.syncToken = calConfig.sync_token;
      } else {
        // Primeira sync: últimos 30 dias + próximos 90 dias
        const now = new Date();
        listParams.timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        listParams.timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
      }

      try {
        const result = await calendar.events.list(listParams);
        const googleEvents = result.data.items || [];

        for (const gEvent of googleEvents) {
          if (gEvent.status === 'cancelled') continue;

          // Verificar se já existe localmente
          const existentes = await pb.collection('agenda').getFullList({
            filter: `google_event_id = "${gEvent.id}"`,
          });

          const startDate = gEvent.start?.dateTime || gEvent.start?.date;
          const endDate = gEvent.end?.dateTime || gEvent.end?.date;

          if (existentes.length === 0) {
            // Criar localmente
            await pb.collection('agenda').create({
              tipo_evento: gEvent.summary || 'Evento Google',
              data_evento: startDate ? startDate.split('T')[0] : new Date().toISOString().split('T')[0],
              horario_inicio: startDate?.includes('T') ? startDate.split('T')[1]?.substring(0, 5) : '09:00',
              horario_fim: endDate?.includes('T') ? endDate.split('T')[1]?.substring(0, 5) : '18:00',
              local_evento: gEvent.location || '',
              observacoes: gEvent.description || '',
              status: 'ocupada',
              origem: 'google',
              sync_status: 'sincronizado',
              google_event_id: gEvent.id,
            });
            logEntries.push({ tipo: 'create', direcao: 'google_to_local', google_event_id: gEvent.id, status: 'sucesso' });
          }
        }

        // Salvar novo syncToken
        if (result.data.nextSyncToken) {
          await pb.collection('google_calendar_config').update(calConfig.id, {
            sync_token: result.data.nextSyncToken,
            last_sync: new Date().toISOString(),
          });
        }

        logEntries.push({ tipo: 'sync_incremental', direcao: 'google_to_local', status: 'sucesso', detalhes: `${googleEvents.length} eventos processados` });
      } catch (error) {
        if (error.code === 410) {
          // Sync token expirado, limpar e fazer full sync na próxima
          await pb.collection('google_calendar_config').update(calConfig.id, { sync_token: '' });
          logEntries.push({ tipo: 'sync_full', direcao: 'google_to_local', status: 'erro', detalhes: 'Sync token expirado, será feito full sync na próxima execução' });
        } else {
          logEntries.push({ tipo: 'sync_incremental', direcao: 'google_to_local', status: 'erro', detalhes: error.message });
        }
      }
    }

    // 3. Salvar logs
    for (const log of logEntries) {
      await pb.collection('google_calendar_logs').create(log);
    }

    return { success: true, logs: logEntries };
  } catch (error) {
    console.error('[CALENDAR SYNC] Erro geral:', error.message);
    return { success: false, error: error.message, logs: logEntries };
  }
}

export default { sincronizarBidirecional };
