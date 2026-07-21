const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { getAuthUrl, getOAuth2Client, listarEventos } = require('../services/googleCalendarService');
const { sincronizarBidirecional } = require('../services/googleCalendarSyncService');

const router = Router();
const GC_PK = 'SYSTEM';
const GC_SK = 'GOOGLE_CALENDAR_CONFIG';

async function getConfig() {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: { ':pk': GC_PK, ':sk': GC_SK },
  }));
  return result.Items?.[0] || null;
}

// GET /api/admin/google-calendar/status
router.get('/status', async (req, res) => {
  try {
    const { loadParams } = require('../config/env');
    const params = await loadParams();

    // Service Account mode: check SSM params
    const hasServiceAccount = !!(params.GOOGLE_CLIENT_EMAIL && params.GOOGLE_PRIVATE_KEY);
    const calendarId = params.GOOGLE_CALENDAR_ID || 'primary';

    if (hasServiceAccount) {
      const config = await getConfig();
      return res.json({
        success: true,
        data: {
          connected: true,
          calendar_id: calendarId,
          email: params.GOOGLE_CLIENT_EMAIL,
          last_sync: config?.last_sync || null,
          autoSync: config?.autoSync ?? false,
        }
      });
    }

    // OAuth mode fallback
    const config = await getConfig();
    if (!config) return res.json({ success: true, data: { connected: false } });
    res.json({ success: true, data: { connected: config.connected, calendar_id: config.calendar_id, last_sync: config.last_sync, email: config.email || '', autoSync: config.autoSync ?? false } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/google-calendar/auth-url
router.get('/auth-url', async (req, res) => {
  try {
    const url = getAuthUrl();
    res.json({ success: true, data: { url } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/google-calendar/callback
router.post('/callback', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Código de autorização ausente' });

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    const configData = {
      PK: GC_PK, SK: GC_SK,
      connected: true,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: new Date(tokens.expiry_date).toISOString(),
      calendar_id: req.body.calendar_id || 'primary',
      updated: new Date().toISOString(),
    };
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: configData }));

    res.json({ success: true, message: 'Google Calendar conectado com sucesso' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/google-calendar/config - Salvar configuração (autoSync toggle)
router.put('/config', async (req, res) => {
  try {
    const { autoSync } = req.body;
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: GC_PK, SK: GC_SK,
        connected: true,
        autoSync: !!autoSync,
        updated: new Date().toISOString(),
      },
    }));
    res.json({ success: true, message: `Sincronização automática ${autoSync ? 'ativada' : 'desativada'}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/google-calendar/sync
router.post('/sync', async (req, res) => {
  try {
    const resultado = await sincronizarBidirecional();
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/google-calendar/desconectar
router.post('/desconectar', async (req, res) => {
  try {
    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: GC_PK, SK: GC_SK },
      UpdateExpression: 'SET connected = :c, access_token = :a, refresh_token = :r, sync_token = :s',
      ExpressionAttributeValues: { ':c': false, ':a': '', ':r': '', ':s': '' },
    }));
    res.json({ success: true, message: 'Google Calendar desconectado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/google-calendar/revoke (alias para desconectar - usado pelo frontend)
router.post('/revoke', async (req, res) => {
  try {
    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: GC_PK, SK: GC_SK },
      UpdateExpression: 'SET connected = :c, access_token = :a, refresh_token = :r, sync_token = :s',
      ExpressionAttributeValues: { ':c': false, ':a': '', ':r': '', ':s': '' },
    }));
    res.json({ success: true, message: 'Google Calendar desconectado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/google-calendar/logs
router.get('/logs', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'GCAL_LOG' },
      ScanIndexForward: false,
      Limit: 50,
    }));
    res.json({ success: true, data: result.Items || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
