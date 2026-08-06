const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router();

router.get('/', async (req, res) => {
  try {
    // Buscar via GSI1 (COBRANCA) com filtro cliente_id
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: 'cliente_id = :cid',
      ExpressionAttributeValues: { ':pk': 'COBRANCA', ':cid': req.clienteId },
    }));
    let items = result.Items || [];

    // Fallback: buscar direto por PK (CLIENTE#id / COBRANCA#)
    if (items.length === 0) {
      const directResult = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `CLIENTE#${req.clienteId}`, ':sk': 'COBRANCA#' },
      }));
      items = directResult.Items || [];
    }

    items.sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''));
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'COBRANCA', ':sk': `COBRANCA#${req.params.id}` },
    }));
    if (!result.Items || result.Items.length === 0) return res.status(404).json({ success: false, message: 'Cobrança não encontrada' });
    const cobranca = result.Items[0];
    if (cobranca.cliente_id !== req.clienteId) return res.status(403).json({ success: false, message: 'Acesso negado' });
    res.json({ success: true, data: cobranca });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Cobrança não encontrada' });
  }
});

// POST /:id/pagar-cartao — Pagar cobrança com cartão de crédito via Asaas
router.post('/:id/pagar-cartao', async (req, res) => {
  try {
    const { creditCard, creditCardHolderInfo } = req.body;

    if (!creditCard?.number || !creditCard?.ccv || !creditCard?.holderName) {
      return res.status(400).json({ success: false, message: 'Dados do cartão são obrigatórios' });
    }

    // Buscar cobrança e validar ownership
    let cobranca = null;
    // Tentar via GSI1
    const gsiResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'COBRANCA', ':sk': `COBRANCA#${req.params.id}` },
    }));
    cobranca = gsiResult.Items?.[0];

    // Fallback: buscar direto por PK
    if (!cobranca) {
      const { GetCommand } = require('@aws-sdk/lib-dynamodb');
      const directResult = await dynamo.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: `CLIENTE#${req.clienteId}`, SK: `COBRANCA#${req.params.id}` },
      }));
      cobranca = directResult.Item;
    }

    if (!cobranca) return res.status(404).json({ success: false, message: 'Cobrança não encontrada' });
    if (cobranca.cliente_id !== req.clienteId) return res.status(403).json({ success: false, message: 'Acesso negado' });
    if (cobranca.status === 'pago') return res.status(400).json({ success: false, message: 'Cobrança já paga' });
    if (!cobranca.gateway_id) return res.status(400).json({ success: false, message: 'Cobrança não enviada ao gateway ainda' });

    // Chamar Asaas para pagar com cartão
    const { getConfig } = require('../services/asaasService');
    const config = await getConfig();

    // Injetar email do usuário logado no holderInfo (Asaas exige)
    if (creditCardHolderInfo) {
      creditCardHolderInfo.email = creditCardHolderInfo.email || req.clienteEmail || req.user?.email || 'cliente@mbfoto.com.br';
    }

    const response = await fetch(`${config.baseUrl}/payments/${cobranca.gateway_id}/payWithCreditCard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': config.apiKey },
      body: JSON.stringify({ creditCard, creditCardHolderInfo }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.errors?.[0]?.description || 'Pagamento recusado';
      return res.status(400).json({ success: false, message: errMsg });
    }

    // Atualizar cobrança como paga
    const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
    const now = new Date().toISOString();
    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: cobranca.PK, SK: cobranca.SK },
      UpdateExpression: 'SET #s = :s, data_pagamento = :d, pago_em = :pe, meio_pagamento = :mp, creditCardToken = :cct',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':s': 'pago',
        ':d': now.slice(0, 10),
        ':pe': now,
        ':mp': 'cartao_credito',
        ':cct': data.creditCard?.creditCardToken || null,
      },
    }));

    // Disparar evento pagamento_confirmado
    try {
      const { processarEvento } = require('../services/notificationDispatcher');
      await processarEvento({
        evento_id: `pag_cartao_${req.params.id}_${Date.now()}`,
        tipo_evento: 'pagamento_confirmado',
        tenant_id: process.env.TENANT_ID || 'default',
        dados: {
          cliente_id: req.clienteId,
          valor: cobranca.valor,
          cobranca_id: req.params.id,
        },
      });
    } catch {}

    res.json({
      success: true,
      message: 'Pagamento aprovado!',
      data: {
        status: 'pago',
        creditCardToken: data.creditCard?.creditCardToken || null,
        creditCardBrand: data.creditCard?.creditCardBrand || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Erro ao processar pagamento' });
  }
});

module.exports = router;
