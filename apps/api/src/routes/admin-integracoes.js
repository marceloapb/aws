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

// ═══════════════════════════════════════════════════
// STATUS ENDPOINTS (for config page)
// ═══════════════════════════════════════════════════

// GET /api/admin/integracoes/test/email-status
router.get('/test/email-status', async (req, res) => {
  try {
    const params = await loadParams();
    const fromEmail = params.SES_FROM_EMAIL;
    const connected = !!fromEmail;
    const domain = fromEmail ? fromEmail.split('@')[1] : '';
    res.json({ success: true, data: { connected, fromEmail: fromEmail || '', domain } });
  } catch (error) {
    res.json({ success: true, data: { connected: false, fromEmail: '', domain: '' } });
  }
});

// GET /api/admin/integracoes/test/maps-status
router.get('/test/maps-status', async (req, res) => {
  try {
    const params = await loadParams();
    const connected = !!params.GOOGLE_MAPS_API_KEY;
    const services = connected ? ['Geocoding', 'Distance Matrix', 'Maps Embed', 'Places'] : [];
    res.json({ success: true, data: { connected, services } });
  } catch (error) {
    res.json({ success: true, data: { connected: false, services: [] } });
  }
});

// POST /api/admin/integracoes/test/email
router.post('/test/email', async (req, res) => {
  try {
    const params = await loadParams();
    if (!params.SES_FROM_EMAIL) {
      await salvarLog('email', 'teste', 'erro', 'SES_FROM_EMAIL não configurado');
      return res.json({ success: false, message: 'Email (SES) não configurado.' });
    }

    // Test: try SES get identity
    const { SESClient, GetIdentityVerificationAttributesCommand } = require('@aws-sdk/client-ses');
    const ses = new SESClient({ region: 'us-east-1' });
    const domain = params.SES_FROM_EMAIL.split('@')[1];
    const result = await ses.send(new GetIdentityVerificationAttributesCommand({ Identities: [domain, params.SES_FROM_EMAIL] }));

    const domainStatus = result.VerificationAttributes?.[domain]?.VerificationStatus;
    const emailStatus = result.VerificationAttributes?.[params.SES_FROM_EMAIL]?.VerificationStatus;

    if (domainStatus === 'Success' || emailStatus === 'Success') {
      await salvarLog('email', 'teste', 'sucesso', `Remetente: ${params.SES_FROM_EMAIL} (${domainStatus || emailStatus})`);
      res.json({ success: true, message: `SES OK. Remetente: ${params.SES_FROM_EMAIL} verificado.` });
    } else {
      await salvarLog('email', 'teste', 'erro', `Status: domínio=${domainStatus}, email=${emailStatus}`);
      res.json({ success: false, message: `SES não verificado. Domínio: ${domainStatus || 'não encontrado'}, Email: ${emailStatus || 'não encontrado'}` });
    }
  } catch (error) {
    await salvarLog('email', 'teste', 'erro', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/integracoes/test/maps
router.post('/test/maps', async (req, res) => {
  try {
    const params = await loadParams();
    if (!params.GOOGLE_MAPS_API_KEY) {
      await salvarLog('maps', 'teste', 'erro', 'GOOGLE_MAPS_API_KEY não configurado');
      return res.json({ success: false, message: 'Google Maps não configurado.' });
    }

    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=Sao+Paulo,BR&key=${params.GOOGLE_MAPS_API_KEY}`, { signal: AbortSignal.timeout(10000) });
    const data = await response.json();

    if (data.status === 'OK') {
      await salvarLog('maps', 'teste', 'sucesso', `Geocoding OK - ${data.results?.[0]?.formatted_address}`);
      res.json({ success: true, message: `Google Maps OK. Geocoding funcionando.` });
    } else {
      await salvarLog('maps', 'teste', 'erro', `Status: ${data.status} - ${data.error_message || ''}`);
      res.json({ success: false, message: `Falha: ${data.status} - ${data.error_message || 'Erro desconhecido'}` });
    }
  } catch (error) {
    await salvarLog('maps', 'teste', 'erro', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/integracoes/test/gateway
router.post('/test/gateway', async (req, res) => {
  try {
    const params = await loadParams();
    const { gateway } = req.body;

    const gatewayConfigs = {
      asaas: { key: 'ASAAS_API_KEY', url: 'https://api.asaas.com/v3/finance/balance', header: 'access_token' },
      stripe: { key: 'STRIPE_SECRET_KEY', url: 'https://api.stripe.com/v1/balance', authType: 'bearer' },
      mercadopago: { key: 'MERCADOPAGO_ACCESS_TOKEN', url: 'https://api.mercadopago.com/v1/payment_methods', authType: 'bearer' },
      pagarme: { key: 'PAGARME_API_KEY', url: 'https://api.pagar.me/core/v5/balance', authType: 'basic' },
      pagbank: { key: 'PAGBANK_TOKEN', url: 'https://api.pagseguro.com/charges', authType: 'bearer' },
      picpay: { key: 'PICPAY_TOKEN', url: 'https://appws.picpay.com/ecommerce/public/payments/status', authType: 'custom' },
      sumup: { key: 'SUMUP_API_KEY', url: 'https://api.sumup.com/v0.1/me', authType: 'bearer' },
      'banco-inter': { key: 'BANCO_INTER_CLIENT_ID', url: null, authType: 'oauth2' },
      stone: { key: 'STONE_API_KEY', url: 'https://api.openbank.stone.com.br/api/v1/institutions', authType: 'bearer' },
      infinitepay: { key: 'INFINITEPAY_API_KEY', url: 'https://api.infinitepay.io/v2/merchants', authType: 'bearer' },
    };

    const config = gatewayConfigs[gateway];
    if (!config) {
      await salvarLog('gateway', 'teste', 'erro', `Gateway "${gateway}" não reconhecido`);
      return res.json({ success: false, message: `Gateway "${gateway}" não reconhecido.` });
    }

    const apiKey = params[config.key];
    if (!apiKey) {
      await salvarLog('gateway', 'teste', 'erro', `${gateway}: ${config.key} não configurado`);
      return res.json({ success: false, message: `${gateway} não configurado. Chave ${config.key} ausente.` });
    }

    // Para gateways OAuth2 que não fazem simples request de status
    if (!config.url) {
      await salvarLog('gateway', 'teste', 'sucesso', `${gateway}: chave configurada (${config.key})`);
      return res.json({ success: true, message: `${gateway} configurado. Chave presente.` });
    }

    let headers = { 'Content-Type': 'application/json' };
    if (config.authType === 'bearer') headers['Authorization'] = `Bearer ${apiKey}`;
    else if (config.authType === 'basic') headers['Authorization'] = `Basic ${Buffer.from(apiKey + ':').toString('base64')}`;
    else if (config.header) headers[config.header] = apiKey;

    const response = await fetch(config.url, { headers, signal: AbortSignal.timeout(10000) });

    if (response.ok || response.status === 401) {
      // 401 means API is reachable but key may be wrong
      if (response.ok) {
        await salvarLog('gateway', 'teste', 'sucesso', `${gateway}: conexão OK (HTTP ${response.status})`);
        res.json({ success: true, message: `${gateway} conectado com sucesso.` });
      } else {
        await salvarLog('gateway', 'teste', 'erro', `${gateway}: autenticação falhou (HTTP 401)`);
        res.json({ success: false, message: `${gateway}: chave inválida ou expirada (HTTP 401).` });
      }
    } else {
      await salvarLog('gateway', 'teste', 'erro', `${gateway}: HTTP ${response.status}`);
      res.json({ success: false, message: `${gateway}: erro HTTP ${response.status}` });
    }
  } catch (error) {
    const gateway = req.body?.gateway || 'desconhecido';
    await salvarLog('gateway', 'teste', 'erro', `${gateway}: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/integracoes/test/nf
router.post('/test/nf', async (req, res) => {
  try {
    const params = await loadParams();
    if (!params.NF_API_KEY && !params.NFSE_API_KEY) {
      await salvarLog('nf', 'teste', 'erro', 'Chave API de NF não configurada');
      return res.json({ success: false, message: 'Nota Fiscal não configurada. Configure a chave da API.' });
    }

    await salvarLog('nf', 'teste', 'sucesso', 'Chave de NF configurada');
    res.json({ success: true, message: 'Nota Fiscal configurada.' });
  } catch (error) {
    await salvarLog('nf', 'teste', 'erro', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
module.exports.salvarLog = salvarLog;
