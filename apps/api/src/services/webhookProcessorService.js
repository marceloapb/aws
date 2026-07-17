const { dynamo, TABLE } = require('../config/dynamodb');
const { GetCommand, PutCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { processarWebhook: processarAsaas } = require('../adapters/asaas');
const { processarWebhook: processarStripe } = require('../adapters/stripe');
const { processarWebhook: processarMercadoPago } = require('../adapters/mercadopago');
const { processarWebhook: processarPagarme } = require('../adapters/pagarme');
const { processarWebhook: processarPagBank } = require('../adapters/pagbank');
const { processarWebhook: processarPicPay } = require('../adapters/picpay');
const { processarWebhook: processarSumUp } = require('../adapters/sumup');
const { processarWebhook: processarBancoInter } = require('../adapters/banco-inter');
const { processarWebhook: processarStone } = require('../adapters/stone');
const { processarWebhook: processarInfinitePay } = require('../adapters/infinitepay');
const { enviarNotificacaoPagamento } = require('./whatsappService');

const PROCESSADORES = {
  asaas: processarAsaas, stripe: processarStripe, mercadopago: processarMercadoPago,
  pagarme: processarPagarme, pagbank: processarPagBank, picpay: processarPicPay,
  sumup: processarSumUp, 'banco-inter': processarBancoInter, stone: processarStone,
  infinitepay: processarInfinitePay,
};

async function processWebhookEvent({ gateway, payload, headers }) {
  const processador = PROCESSADORES[gateway];
  if (!processador) return;

  const resultado = await processador(payload, headers);
  if (!resultado?.gateway_id) return;

  // Idempotência
  const idempotencyKey = `${gateway}-${resultado.gateway_id}-${resultado.status}`;
  const existing = await dynamo.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `IDEMPOTENCY#${idempotencyKey}`, SK: `IDEMPOTENCY#${idempotencyKey}` },
  }));
  if (existing.Item) return; // já processado

  // Gravar idempotency key (TTL 24h)
  await dynamo.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `IDEMPOTENCY#${idempotencyKey}`, SK: `IDEMPOTENCY#${idempotencyKey}`,
      ttl: Math.floor(Date.now() / 1000) + 86400,
      created: new Date().toISOString(),
    },
  }));

  // Buscar e atualizar cobrança
  const cobrancas = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    FilterExpression: 'gateway_id = :gid AND gateway = :gw',
    ExpressionAttributeValues: { ':pk': 'COBRANCA', ':gid': resultado.gateway_id, ':gw': gateway },
  }));
  if (!cobrancas.Items?.length) return;

  const cobranca = cobrancas.Items[0];
  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: cobranca.PK, SK: cobranca.SK },
    UpdateExpression: resultado.status === 'pago'
      ? 'SET #s = :s, data_pagamento = :d'
      : 'SET #s = :s',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: resultado.status === 'pago'
      ? { ':s': resultado.status, ':d': new Date().toISOString() }
      : { ':s': resultado.status },
  }));

  if (resultado.status === 'pago' && cobranca.cliente_id) {
    const cliResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'CLIENTE', ':sk': `CLIENTE#${cobranca.cliente_id}` },
    }));
    const cliente = cliResult.Items?.[0];
    if (cliente?.whatsapp_numero) {
      try {
        await enviarNotificacaoPagamento(cliente.whatsapp_numero, cliente.nome, cobranca.valor, 'confirmado');
      } catch (e) {
        console.error('[WEBHOOK] Erro WhatsApp:', e.message);
      }
    }
  }
}

module.exports = { processWebhookEvent };
