import { google } from 'googleapis';
import { dynamo, TABLE } from '../config/dynamodb.js';
import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { loadParams } from '../config/env.js';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const GC_PK = 'SYSTEM';
const GC_SK = 'GOOGLE_CALENDAR_CONFIG';

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });
}

export async function getAuthenticatedClient() {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: { ':pk': GC_PK, ':sk': GC_SK },
  }));
  const config = result.Items?.[0];
  if (!config || !config.connected) throw new Error('Google Calendar não conectado');

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: config.access_token, refresh_token: config.refresh_token });

  if (Date.now() >= new Date(config.token_expiry).getTime()) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: GC_PK, SK: GC_SK },
      UpdateExpression: 'SET access_token = :a, token_expiry = :t',
      ExpressionAttributeValues: { ':a': credentials.access_token, ':t': new Date(credentials.expiry_date).toISOString() },
    }));
    oauth2Client.setCredentials(credentials);
  }

  return { oauth2Client, calendarId: config.calendar_id || 'primary' };
}

export async function criarEvento(dados) {
  const { oauth2Client, calendarId } = await getAuthenticatedClient();
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const event = {
    summary: `${dados.tipo_evento} - ${dados.cliente_nome || 'Cliente'}`,
    description: dados.observacoes || '',
    start: { dateTime: `${dados.data_evento}T${dados.horario_inicio || '09:00'}:00`, timeZone: 'America/Sao_Paulo' },
    end: { dateTime: `${dados.data_evento}T${dados.horario_fim || '18:00'}:00`, timeZone: 'America/Sao_Paulo' },
    colorId: dados.cor_id || '7',
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }] },
  };
  if (dados.local) event.location = dados.local;
  const response = await calendar.events.insert({ calendarId, resource: event });
  return response.data;
}

export async function atualizarEvento(googleEventId, dados) {
  const { oauth2Client, calendarId } = await getAuthenticatedClient();
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const event = {
    summary: `${dados.tipo_evento} - ${dados.cliente_nome || 'Cliente'}`,
    description: dados.observacoes || '',
    start: { dateTime: `${dados.data_evento}T${dados.horario_inicio || '09:00'}:00`, timeZone: 'America/Sao_Paulo' },
    end: { dateTime: `${dados.data_evento}T${dados.horario_fim || '18:00'}:00`, timeZone: 'America/Sao_Paulo' },
  };
  if (dados.local) event.location = dados.local;
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
    calendarId, timeMin: new Date(dataInicio).toISOString(), timeMax: new Date(dataFim).toISOString(),
    singleEvents: true, orderBy: 'startTime',
  });
  return response.data.items || [];
}

export default { getOAuth2Client, getAuthUrl, getAuthenticatedClient, criarEvento, atualizarEvento, excluirEvento, listarEventos };
