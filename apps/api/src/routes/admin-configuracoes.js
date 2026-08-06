const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router();
const TENANT = process.env.TENANT_ID || 'default';

// GET /api/admin/configuracoes
router.get('/', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'CONFIG#' },
    }));

    const resultado = {};
    for (const item of (result.Items || [])) {
      resultado[item.chave] = item.valor;
    }

    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/configuracoes
router.put('/', async (req, res) => {
  try {
    const dados = req.body;
    for (const [chave, valor] of Object.entries(dados)) {
      await dynamo.send(new PutCommand({
        TableName: TABLE,
        Item: {
          PK: `TENANT#${TENANT}`,
          SK: `CONFIG#${chave}`,
          chave,
          valor: String(valor),
          updated: new Date().toISOString(),
        },
      }));
    }
    res.json({ success: true, message: 'Configurações atualizadas' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/admin/configuracoes/gateways
router.get('/gateways', async (req, res) => {
  try {
    const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
    const ssm = new SSMClient({ region: 'us-east-1' });
    const PREFIX = process.env.SSM_PREFIX || '/mbf/prod';

    // Verificar quais gateways têm credenciais no SSM
    const checks = [
      { id: 'asaas', param: 'ASAAS_API_KEY' },
      { id: 'stripe', param: 'STRIPE_SECRET_KEY' },
      { id: 'mercadopago', param: 'MERCADOPAGO_ACCESS_TOKEN' },
      { id: 'pagarme', param: 'PAGARME_API_KEY' },
      { id: 'pagbank', param: 'PAGBANK_TOKEN' },
    ];

    const gateways = [];
    for (const check of checks) {
      let configurado = false;
      let ambiente = 'sandbox';
      try {
        const r = await ssm.send(new GetParameterCommand({ Name: `${PREFIX}/${check.param}`, WithDecryption: false }));
        if (r.Parameter?.Value) {
          configurado = true;
          // Detectar ambiente pelo prefixo da chave
          if (r.Parameter.Value.includes('_hmlg_') || r.Parameter.Value.includes('sandbox')) ambiente = 'sandbox';
          else ambiente = 'producao';
        }
      } catch {}
      gateways.push({ id: check.id, configurado, ambiente });
    }

    // Buscar configuração salva no DynamoDB (ativo, padrao, etc)
    const cfgResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'CONFIG#gateways' },
    }));
    const savedConfig = cfgResult.Items?.[0]?.valor ? JSON.parse(cfgResult.Items[0].valor) : {};

    // Merge
    const result = gateways.map(g => ({
      ...g,
      ativo: savedConfig[g.id]?.ativo || false,
      is_padrao: savedConfig[g.id]?.is_padrao || false,
      ambiente: savedConfig[g.id]?.ambiente || g.ambiente,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/configuracoes/gateways/:slug/credenciais — Salvar credenciais no SSM
router.put('/gateways/:slug/credenciais', async (req, res) => {
  try {
    const { slug } = req.params;
    const { credenciais, ambiente } = req.body;
    const { SSMClient, PutParameterCommand } = require('@aws-sdk/client-ssm');
    const ssm = new SSMClient({ region: 'us-east-1' });
    const PREFIX = process.env.SSM_PREFIX || '/mbf/prod';

    // Mapear slug → parâmetros SSM
    const PARAM_MAP = {
      asaas: { api_key: 'ASAAS_API_KEY', webhook_token: 'ASAAS_WEBHOOK_TOKEN' },
      stripe: { secret_key: 'STRIPE_SECRET_KEY', publishable_key: 'STRIPE_PUBLISHABLE_KEY', webhook_secret: 'STRIPE_WEBHOOK_SECRET' },
      mercadopago: { access_token: 'MERCADOPAGO_ACCESS_TOKEN', public_key: 'MERCADOPAGO_PUBLIC_KEY' },
      pagarme: { api_key: 'PAGARME_API_KEY', encryption_key: 'PAGARME_ENCRYPTION_KEY' },
      pagbank: { client_id: 'PAGBANK_CLIENT_ID', client_secret: 'PAGBANK_CLIENT_SECRET' },
    };

    const paramMap = PARAM_MAP[slug];
    if (!paramMap) return res.status(400).json({ success: false, message: 'Gateway não suportado' });

    // Salvar cada credencial no SSM
    for (const [field, value] of Object.entries(credenciais || {})) {
      if (!value || !paramMap[field]) continue;
      await ssm.send(new PutParameterCommand({
        Name: `${PREFIX}/${paramMap[field]}`,
        Value: value,
        Type: 'SecureString',
        Overwrite: true,
      }));
    }

    // Salvar URL base conforme ambiente
    if (slug === 'asaas') {
      const baseUrl = ambiente === 'producao' ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/api/v3';
      await ssm.send(new PutParameterCommand({
        Name: `${PREFIX}/ASAAS_BASE_URL`,
        Value: baseUrl,
        Type: 'String',
        Overwrite: true,
      }));
    }

    // Limpar cache do asaasService
    try {
      const asaasService = require('../services/asaasService');
      if (asaasService._clearCache) asaasService._clearCache();
    } catch {}

    res.json({ success: true, message: `Credenciais de ${slug} salvas com sucesso` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/configuracoes/gateways/:slug/testar — Testar conexão com gateway
router.post('/gateways/:slug/testar', async (req, res) => {
  try {
    const { slug } = req.params;

    if (slug === 'asaas') {
      const { getConfig } = require('../services/asaasService');
      const config = await getConfig();
      const response = await fetch(`${config.baseUrl}/finance/balance`, {
        headers: { 'access_token': config.apiKey },
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json();
      if (response.ok) {
        res.json({ success: true, message: `Conexão OK! Saldo: R$ ${(data.balance || 0).toFixed(2)}`, data: { balance: data.balance } });
      } else {
        res.json({ success: false, message: data.errors?.[0]?.description || 'Erro na conexão' });
      }
    } else {
      res.json({ success: false, message: 'Teste não implementado para este gateway' });
    }
  } catch (error) {
    res.json({ success: false, message: `Erro: ${error.message}` });
  }
});

module.exports = router;
