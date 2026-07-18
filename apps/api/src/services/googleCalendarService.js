/**
 * Google Calendar Service — usando Service Account (JWT)
 * Credenciais em SSM Parameter Store
 */

const { google } = require('googleapis');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ssm = new SSMClient({ region: 'us-east-1' });
const PREFIX = process.env.SSM_PREFIX || '/mbf/prod';

let cachedAuth = null;
let cachedCalendarId = null;

async function getParam(name, decrypt = false) {
  const result = await ssm.send(new GetParameterCommand({ Name: name, WithDecryption: decrypt }));
  return result.Parameter.Value;
}

async function getAuthenticatedClient() {
  if (cachedAuth) return cachedAuth;

  const clientEmail = await getParam(`${PREFIX}/GOOGLE_CLIENT_EMAIL`);
  const privateKey = await getParam(`${PREFIX}/GOOGLE_PRIVATE_KEY`, true);
  cachedCalendarId = await getParam(`${PREFIX}/GOOGLE_CALENDAR_ID`);

  const auth = new google.auth.JWT(
    clientEmail,
    null,
    privateKey.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/calendar']
  );

  await auth.authorize();
  cachedAuth = auth;
  return auth;
}

async function getCalendar() {
  const auth = await getAuthenticatedClient();
  return google.calendar({ version: 'v3', auth });
}

async function getCalendarId() {
  if (!cachedCalendarId) {
    cachedCalendarId = await getParam(`${PREFIX}/GOOGLE_CALENDAR_ID`);
  }
  return cachedCalendarId;
}

/**
 * Criar evento no Google Calendar
 */
async function criarEvento(evento) {
  const calendar = await getCalendar();
  const calendarId = await getCalendarId();

  const eventData = {
    summary: `📸 ${evento.tipo_evento || 'Sessão'} — ${evento.cliente_nome || 'Cliente'}`,
    description: evento.observacoes || '',
    location: evento.local || '',
    start: {
      dateTime: `${evento.data_evento}T${evento.horario_inicio || '09:00'}:00`,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: `${evento.data_evento}T${evento.horario_fim || '18:00'}:00`,
      timeZone: 'America/Sao_Paulo',
    },
    colorId: getColorId(evento.tipo_evento),
  };

  const result = await calendar.events.insert({ calendarId, requestBody: eventData });
  return { id: result.data.id, htmlLink: result.data.htmlLink };
}

/**
 * Atualizar evento no Google Calendar
 */
async function atualizarEvento(googleEventId, evento) {
  const calendar = await getCalendar();
  const calendarId = await getCalendarId();

  const eventData = {
    summary: `📸 ${evento.tipo_evento || 'Sessão'} — ${evento.cliente_nome || 'Cliente'}`,
    description: evento.observacoes || '',
    location: evento.local || '',
    start: {
      dateTime: `${evento.data_evento}T${evento.horario_inicio || '09:00'}:00`,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: `${evento.data_evento}T${evento.horario_fim || '18:00'}:00`,
      timeZone: 'America/Sao_Paulo',
    },
  };

  await calendar.events.update({ calendarId, eventId: googleEventId, requestBody: eventData });
}

/**
 * Excluir evento do Google Calendar
 */
async function excluirEvento(googleEventId) {
  const calendar = await getCalendar();
  const calendarId = await getCalendarId();

  try {
    await calendar.events.delete({ calendarId, eventId: googleEventId });
  } catch (e) {
    if (e.code !== 410) throw e; // 410 = já deletado
  }
}

/**
 * Listar eventos do Google Calendar (para sync bidirecional futuro)
 */
async function listarEventos(dataInicio, dataFim) {
  const calendar = await getCalendar();
  const calendarId = await getCalendarId();

  const result = await calendar.events.list({
    calendarId,
    timeMin: `${dataInicio}T00:00:00-03:00`,
    timeMax: `${dataFim}T23:59:59-03:00`,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
  });

  return result.data.items || [];
}

// Cores do Google Calendar por tipo de evento
function getColorId(tipo) {
  const cores = {
    'Casamento': '11',    // Tomate (vermelho)
    'Ensaio': '9',        // Blueberry (azul)
    'Corporativo': '10',  // Basil (verde escuro)
    'Aniversário': '6',   // Tangerine (laranja)
    'Batizado': '7',      // Peacock (azul claro)
    'Newborn': '4',       // Flamingo (rosa)
    '15 anos': '3',       // Grape (roxo)
    'Formatura': '5',     // Banana (amarelo)
  };
  return cores[tipo] || '9';
}

module.exports = { criarEvento, atualizarEvento, excluirEvento, listarEventos, getAuthenticatedClient };

