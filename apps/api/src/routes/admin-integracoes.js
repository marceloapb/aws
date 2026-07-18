const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { loadParams, features } = require('../config/env');

const router = Router();

// ═══════════════════════════════════════════════════
// LOG HELPERS
// ═══════════════════════════════════════════════════

async function salvarLog(integracao, tipo, resultado, detalhes = '') {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await dynamo.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `INTLOG#${id}`,
      SK: `INTLOG#${id}`,
      GSI1PK: 'INTLOG',
      GSI1SK: `INTLOG#${now}`,
      id,
      integracao,
      tipo,
      resultado,
      detalhes,
      created: now,
    },
  }));
}

// ═══════════════════════════════════════════════════
// TEST ENDPOINTS
// ═══════════════════════════════════════════════════

// POST /api/admin/integracoes/test/whatsapp
router.post('/test/whatsapp', async (req, res) => {
  try {
    const params = await loadParams();
    if (!params.WHATSAPP_ACCESS_TOKEN || !params.WHATSAPP_PHONE_NUMBER_ID) {
      await salvarLog('whatsapp', 'teste', 'erro', 'Token ou Phone Number ID não configurados');
      return res.json({ success: false, message: 'WhatsApp não configurado. Configure o token e Phone Number ID.' });
    }

    // Test: get phone number info from Meta API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${params.WHATSAPP_PHONE_NUMBER_ID}?access_token=${params.WHATSAPP_ACCESS_TOKEN}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await response.json();

    if (response.ok && data.id) {
      await salvarLog('whatsapp', 'teste', 'sucesso', `Número: ${data.display_phone_number || data.id}`);
      res.json({ success: true, message: `Conexão OK. Número: ${data.display_phone_number || data.id}`, data: { phoneNumber: data.display_phone_number, status: data.quality_rating } });
    } else {
      const errorMsg = data.error?.message || 'Erro desconhecido';
      await salvarLog('whatsapp', 'teste', 'erro', errorMsg);
      res.json({ success: false, message: `Falha: ${errorMsg}` });
    }
  } catch (error) {
    await salvarLog('whatsapp', 'teste', 'erro', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/integracoes/test/instagram
router.post('/test/instagram', async (req, res) => {
  try {
    const params = await loadParams();
    if (!params.INSTAGRAM_ACCESS_TOKEN || !params.INSTAGRAM_BUSINESS_ACCOUNT_ID) {
      await salvarLog('instagram', 'teste', 'erro', 'Token ou Business Account ID não configurados');
      return res.json({ success: false, message: 'Instagram não configurado. Configure o token e Business Account ID.' });
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${params.INSTAGRAM_BUSINESS_ACCOUNT_ID}?fields=username,account_type,media_count&access_token=${params.INSTAGRAM_ACCESS_TOKEN}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await response.json();

    if (response.ok && data.username) {
      await salvarLog('instagram', 'teste', 'sucesso', `@${data.username} - ${data.media_count} mídias`);
      res.json({ success: true, message: `Conexão OK. @${data.username} (${data.media_count} mídias)`, data });
    } else {
      const errorMsg = data.error?.message || 'Erro desconhecido';
      await salvarLog('instagram', 'teste', 'erro', errorMsg);
      res.json({ success: false, message: `Falha: ${errorMsg}` });
    }
  } catch (error) {
    await salvarLog('instagram', 'teste', 'erro', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/integracoes/test/google-calendar
router.post('/test/google-calendar', async (req, res) => {
  try {
    const params = await loadParams();
    if (!params.GOOGLE_CLIENT_ID || !params.GOOGLE_CLIENT_SECRET) {
      await salvarLog('google-calendar', 'teste', 'erro', 'Client ID ou Secret não configurados');
      return res.json({ success: false, message: 'Google Calendar não configurado.' });
    }

    // Check if we have a stored config with connected = true
    const configResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: { ':pk': 'SYSTEM', ':sk': 'GOOGLE_CALENDAR_CONFIG' },
    }));
    const config = configResult.Items?.[0];

    if (!config || !config.connected) {
      await salvarLog('google-calendar', 'teste', 'erro', 'Conta não conectada');
      return res.json({ success: false, message: 'Google Calendar não está conectado. Faça a autorização OAuth primeiro.' });
    }

    await salvarLog('google-calendar', 'teste', 'sucesso', `Calendar: ${config.calendar_id || 'primary'}`);
    res.json({ success: true, message: `Conexão OK. Calendar: ${config.calendar_id || 'primary'}` });
  } catch (error) {
    await salvarLog('google-calendar', 'teste', 'erro', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════
// LOGS
// ═══════════════════════════════════════════════════

// GET /api/admin/integracoes/logs
router.get('/logs', async (req, res) => {
  try {
    const { integracao, limit = 100, page = 1 } = req.query;

    const params = {
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'INTLOG' },
      ScanIndexForward: false,
    };

    if (integracao) {
      params.FilterExpression = 'integracao = :integracao';
      params.ExpressionAttributeValues[':integracao'] = integracao;
    }

    const result = await dynamo.send(new QueryCommand(params));
    const items = result.Items || [];
    const total = items.length;
    const start = (Number(page) - 1) * Number(limit);
    const data = items.slice(start, start + Number(limit));

    res.json({
      success: true,
      data,
      pagination: { page: Number(page), totalPages: Math.ceil(total / Number(limit)), totalItems: total },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/integracoes/logs
router.delete('/logs', async (req, res) => {
  try {
    const { DeleteCommand } = require('@aws-sdk/lib-dynamodb');
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'INTLOG' },
    }));

    for (const item of (result.Items || [])) {
      await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { PK: item.PK, SK: item.SK } }));
    }

    res.json({ success: true, message: `${result.Items?.length || 0} logs removidos` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
