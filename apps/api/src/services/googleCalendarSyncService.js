// ══════════════════════════════════════════════════════════════
// SERVICES/GOOGLE-CALENDAR-SYNC-SERVICE.JS — Sincronização bidirecional
// ══════════════════════════════════════════════════════════════

import { google } from 'googleapis';
import { getPocketbaseClient } from '../config/pocketbase.js';
import { getAuthenticatedClient, criarEvento, atualizarEvento } from './googleCalendarService.js';
import { SYNC_STATUS } from '../config/constants.js';

export async function sincronizarBidirecional() {
  const pb = await getPocketbaseClient();
  let totalSynced = 0;
  let errors = 0;

  try {
    // FASE 1: Local → Google (eventos pendentes)
    const pendentes = await pb.collection('agenda').getFullList({
      filter: `sync_status = "${SYNC_STATUS.PENDENTE}"`,
    });

    for (const evento of pendentes) {
      try {
        let googleEvent;
        if (evento.google_event_id) {
          // Atualizar existente
          const cliente = evento.cliente_id
            ? await pb.collection('clientes').getOne(evento.cliente_id)
            : null;
          googleEvent = await atualizarEvento(evento.google_event_id, {
            ...evento,
            cliente_nome: cliente?.nome,
            cliente_telefone: cliente?.whatsapp_numero,
          });
        } else {
          // Criar novo
          const cliente = evento.cliente_id
            ? await pb.collection('clientes').getOne(evento.cliente_id)
            : null;
          googleEvent = await criarEvento({
            ...evento,
            cliente_nome: cliente?.nome,
            cliente_telefone: cliente?.whatsapp_numero,
          });
        }

        await pb.collection('agenda').update(evento.id, {
          google_event_id: googleEvent.id,
          sync_status: SYNC_STATUS.SINCRONIZADO,
          erro: '',
        });

        totalSynced++;
      } catch (error) {
        await pb.collection('agenda').update(evento.id, {
          sync_status: SYNC_STATUS.ERRO,
          erro: error.message,
        });
        errors++;
      }
    }

    // FASE 2: Google → Local (incremental sync)
    const { oauth2Client, config } = await getAuthenticatedClient();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const syncParams = {
      calendarId: config.calendar_id || 'primary',
      singleEvents: true,
    };

    if (config.sync_token) {
      syncParams.syncToken = config.sync_token;
    } else {
      // Primeira sync: pegar últimos 30 dias
      syncParams.timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    let pageToken = null;
    let nextSyncToken = null;

    do {
      try {
        const response = await calendar.events.list({
          ...syncParams,
          ...(pageToken && { pageToken }),
        });

        const events = response.data.items || [];
        nextSyncToken = response.data.nextSyncToken;
        pageToken = response.data.nextPageToken;

        for (const gEvent of events) {
          await processarEventoGoogle(pb, gEvent);
          totalSynced++;
        }
      } catch (error) {
        if (error.code === 410) {
          // Sync token expirado, resetar
          await pb.collection('google_calendar_config').update(config.id, {
            sync_token: '',
          });
          break;
        }
        throw error;
      }
    } while (pageToken);

    // Salvar novo sync token
    if (nextSyncToken) {
      await pb.collection('google_calendar_config').update(config.id, {
        sync_token: nextSyncToken,
        last_sync: new Date().toISOString(),
      });
    }

    // Registrar log
    await pb.collection('google_calendar_logs').create({
      tipo: config.sync_token ? 'sync_incremental' : 'sync_full',
      direcao: 'local_to_google',
      status: 'sucesso',
      detalhes: `Sincronizados: ${totalSynced}, Erros: ${errors}`,
    });

    return { success: true, synced: totalSynced, errors };
  } catch (error) {
    await pb.collection('google_calendar_logs').create({
      tipo: 'sync_full',
      direcao: 'local_to_google',
      status: 'erro',
      detalhes: error.message,
    });

    return { success: false, error: error.message, synced: totalSynced, errors };
  }
}

async function processarEventoGoogle(pb, gEvent) {
  // Buscar evento local pelo google_event_id
  const existentes = await pb.collection('agenda').getFullList({
    filter: `google_event_id = "${gEvent.id}"`,
  });

  if (gEvent.status === 'cancelled') {
    // Evento cancelado no Google → marcar local
    if (existentes.length > 0) {
      await pb.collection('agenda').update(existentes[0].id, {
        status: 'fora',
        sync_status: SYNC_STATUS.SINCRONIZADO,
      });
    }
    return;
  }

  const eventoData = {
    tipo_evento: extrairTipoEvento(gEvent.summary),
    data_evento: extrairData(gEvent.start),
    horario_inicio: extrairHorario(gEvent.start),
    horario_fim: extrairHorario(gEvent.end),
    local_evento: gEvent.location || '',
    observacoes: gEvent.description || '',
    google_event_id: gEvent.id,
    origem: 'google',
    sync_status: SYNC_STATUS.SINCRONIZADO,
    status: 'ocupada',
  };

  if (existentes.length > 0) {
    // Atualizar existente
    const local = existentes[0];
    const googleUpdated = new Date(gEvent.updated);
    const localUpdated = new Date(local.updated);

    if (googleUpdated > localUpdated) {
      await pb.collection('agenda').update(local.id, eventoData);
    }
  } else {
    // Criar novo evento local
    await pb.collection('agenda').create(eventoData);
  }
}

function extrairTipoEvento(summary) {
  if (!summary) return 'Evento';
  const parts = summary.split('—');
  return parts[0].trim();
}

function extrairData(dateObj) {
  if (dateObj.date) return dateObj.date;
  if (dateObj.dateTime) return dateObj.dateTime.split('T')[0];
  return new Date().toISOString().split('T')[0];
}

function extrairHorario(dateObj) {
  if (dateObj.dateTime) {
    return dateObj.dateTime.split('T')[1].substring(0, 5);
  }
  return '';
}
