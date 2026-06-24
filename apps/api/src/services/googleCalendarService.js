// ══════════════════════════════════════════════════════════════
// SERVICES/GOOGLE-CALENDAR-SERVICE.JS — Operações Google Calendar
// ══════════════════════════════════════════════════════════════

import { google } from 'googleapis';
import { env, features } from '../config/env.js';
import { getPocketbaseClient } from '../config/pocketbase.js';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

export async function getAuthenticatedClient() {
  if (!features.googleCalendar) {
    throw new Error('Google Calendar não configurado');
  }

  const pb = await getPocketbaseClient();
  const configs = await pb.collection('google_calendar_config').getFullList();
  const config = configs[0];

  if (!config || !config.connected) {
    throw new Error('Google Calendar não conectado');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: config.access_token,
    refresh_token: config.refresh_token,
    expiry_date: new Date(config.token_expiry).getTime(),
  });

  // Renovar token se expirado
  const tokenInfo = await oauth2Client.getAccessToken();
  if (tokenInfo.token !== config.access_token) {
    await pb.collection('google_calendar_config').update(config.id, {
      access_token: tokenInfo.token,
      token_expiry: new Date(oauth2Client.credentials.expiry_date).toISOString(),
    });
  }

  return { oauth2Client, config };
}

export async function criarEvento(evento) {
  const { oauth2Client, config } = await getAuthenticatedClient();
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const eventData = {
    summary: `${evento.tipo_evento} — ${evento.cliente_nome || 'Sem cliente'}`,
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

  const result = await calendar.events.insert({
    calendarId: config.calendar_id || 'primary',
    resource: eventData,
  });

  return result.data;
}

export async function atualizarEvento(googleEventId, evento) {
  const { oauth2Client, config } = await getAuthenticatedClient();
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const eventData = {
    summary: `${evento.tipo_evento} — ${evento.cliente_nome || 'Sem cliente'}`,
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

  const result = await calendar.events.update({
    calendarId: config.calendar_id || 'primary',
    eventId: googleEventId,
    resource: eventData,
  });

  return result.data;
}

export async function deletarEvento(googleEventId) {
  const { oauth2Client, config } = await getAuthenticatedClient();
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  await calendar.events.delete({
    calendarId: config.calendar_id || 'primary',
    eventId: googleEventId,
  });
}

export async function listarEventos(timeMin, timeMax) {
  const { oauth2Client, config } = await getAuthenticatedClient();
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const result = await calendar.events.list({
    calendarId: config.calendar_id || 'primary',
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  return result.data.items || [];
}

export default {
  getAuthUrl,
  getAuthenticatedClient,
  criarEvento,
  atualizarEvento,
  deletarEvento,
  listarEventos,
};
