// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-GOOGLE-CALENDAR.JS — Configuração Google Calendar
// ══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { getPocketbaseClient } from '../config/pocketbase.js';
import { getAuthUrl, getOAuth2Client, getAuthenticatedClient, listarEventos } from '../services/googleCalendarService.js';
import { sincronizarBidirecional } from '../services/googleCalendarSyncService.js';

const router = Router();

// GET /api/admin/google-calendar/status — Status da conexão
router.get('/status', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const configs = await pb.collection('google_calendar_config').getFullList();
    const config = configs[0];

    if (!config) {
      return res.json({ success: true, data: { connected: false } });
    }

    res.json({
      success: true,
      data: {
        connected: config.connected,
        calendar_id: config.calendar_id,
        last_sync: config.last_sync,
        email: config.email || '',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/google-calendar/auth-url — Obter URL de autorização
router.get('/auth-url', async (req, res) => {
  try {
    const url = getAuthUrl();
    res.json({ success: true, data: { url } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/google-calendar/callback — Processar callback OAuth
router.post('/callback', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Código de autorização ausente' });
    }

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    const pb = await getPocketbaseClient();
    const configs = await pb.collection('google_calendar_config').getFullList();

    const configData = {
      connected: true,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: new Date(tokens.expiry_date).toISOString(),
      calendar_id: req.body.calendar_id || 'primary',
    };

    if (configs.length > 0) {
      await pb.collection('google_calendar_config').update(configs[0].id, configData);
    } else {
      await pb.collection('google_calendar_config').create(configData);
    }

    res.json({ success: true, message: 'Google Calendar conectado com sucesso' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/google-calendar/sync — Forçar sincronização
router.post('/sync', async (req, res) => {
  try {
    const resultado = await sincronizarBidirecional();
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/google-calendar/desconectar — Desconectar
router.post('/desconectar', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const configs = await pb.collection('google_calendar_config').getFullList();

    if (configs.length > 0) {
      await pb.collection('google_calendar_config').update(configs[0].id, {
        connected: false,
        access_token: '',
        refresh_token: '',
        sync_token: '',
      });
    }

    res.json({ success: true, message: 'Google Calendar desconectado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/google-calendar/logs — Logs de sincronização
router.get('/logs', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const logs = await pb.collection('google_calendar_logs').getList(1, 50, { sort: '-created' });
    res.json({ success: true, data: logs.items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
