// ══════════════════════════════════════════════════════════════
// SERVICES/GOOGLE-CALENDAR-SERVICE.JS — Google Calendar API
// ══════════════════════════════════════════════════════════════

import { google } from 'googleapis';
import { getPocketbaseClient } from '../config/pocketbase.js';
import { env } from '../config/env.js';
import { EVENT_COLORS } from '../config/constants.js';

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
  const pb = await getPocketbaseClient();
  const configs = await pb.collection('google_calendar_config').getFullList();
  const config = configs[0];

  if (!config || !config.connected) throw new Error('Google Calendar não conectado');

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: config.access_token,
    refresh_token: config.refresh_token,
  });

  // Renovar token se expirado
  oauth2Client.on('tokens', async (tokens) => {
    const updateData = { access_token: tokens.access_token };
    if (tokens.refresh_token) updateData.refresh_token = tokens.refresh_token;
    if (tokens.expiry_date) updateData.token_expiry = new Date(tokens.expiry_date).toISOString();
    await pb.collection('google_calendar_config').update(config.id, updateData);
  });

  return { oauth2Client, calendarId: config.calendar_id || 'primary' };
}

export async function criarEvento(dados) {
  const { oauth2Client, calendarId } = await getAuthenticatedClient();
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const event = {
    summary: `${dados.tipo_evento} - ${dados.cliente_nome || 'Cliente'}`,
    description: buildDescription(dados),
    start: {
      dateTime: `${dados.data_evento}T${dados.horario_inicio || '09:00'}:00`,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: `${dados.data_evento}T${dados.horario_fim || '18:00'}:00`,
      timeZone: 'America/Sao_Paulo',
    },
    colorId: getColorId(dados.tipo_evento),
    location: dados.local || '',
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }] },
  };

  const response = await calendar.events.insert({ calendarId, resource: event });
  return response.data;
}

export async function atualizarEvento(googleEventId, dados) {
  const { oauth2Client, calendarId } = await getAuthenticatedClient();
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const event = {
    summary: `${dados.tipo_evento} - ${dados.cliente_nome || 'Cliente'}`,
    description: buildDescription(dados),
    start: {
      dateTime: `${dados.data_evento}T${dados.horario_inicio || '09:00'}:00`,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: `${dados.data_evento}T${dados.horario_fim || '18:00'}:00`,
      timeZone: 'America/Sao_Paulo',
    },
    colorId: getColorId(dados.tipo_evento),
    location: dados.local || '',
  };

  const response = await calendar.events.update({ calendarId, eventId: googleEventId, resource: event });
  return response.data;
}

export async function excluirEvento(googleEventId) {
  const { oauth2Client, calendarId } = await getAuthenticatedClient();
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  await calendar.events.delete({ calendarId, eventId: googleEventId });
}

export async function listarEventos(dataInicio, dataFim) {
  const { oauth2Client, calendarId } = await getAuthenticatedClient();
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.events.list({
    calendarId,
    timeMin: new Date(dataInicio).toISOString(),
    timeMax: new Date(dataFim).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  return response.data.items || [];
}

function buildDescription(dados) {
  const lines = [];
  if (dados.cliente_nome) lines.push(`Cliente: ${dados.cliente_nome}`);
  if (dados.cliente_telefone) lines.push(`Telefone: ${dados.cliente_telefone}`);
  if (dados.observacoes) lines.push(`Obs: ${dados.observacoes}`);
  return lines.join('\n');
}

function getColorId(tipoEvento) {
  const colors = EVENT_COLORS || {};
  return colors[tipoEvento] || '1';
}

export default { getOAuth2Client, getAuthUrl, getAuthenticatedClient, criarEvento, atualizarEvento, excluirEvento, listarEventos };
