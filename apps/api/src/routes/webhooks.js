import { Router } from 'express';
import { dynamo, TABLE } from '../config/dynamodb.js';
import { QueryCommand, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { processarWebhook as processarAsaas } from '../adapters/asaas.js';
import { processarWebhook as processarStripe } from '../adapters/stripe.js';
import { processarWebhook as processarMercadoPago } from '../adapters/mercadopago.js';
import { processarWebhook as processarPagarme } from '../adapters/pagarme.js';
import { processarWebhook as processarPagBank } from '../adapters/pagbank.js';
import { processarWebhook as processarPicPay } from '../adapters/picpay.js';
import { processarWebhook as processarSumUp } from '../adapters/sumup.js';
import { processarWebhook as processarBancoInter } from '../adapters/banco-inter.js';
import { processarWebhook as processarStone } from '../adapters/stone.js';
import { processarWebhook as processarInfinitePay } from '../adapters/infinitepay.js';
import { enviarNotificacaoPagamento } from '../services/whatsappService.js';
import { features } from '../config/env.js';

const router = Router();

const PROCESSADORES = {
  asaas: processarAsaas, stripe: processarStripe, mercadopago: processarMercadoPago,
  pagarme: processarPagarme, pagbank: processarPagBank, picpay: processarPicPay,
  sumup: processarSumUp, 'banco-inter': processarBancoInter, stone: processarStone,
  infinitepay: processarInfinitePay,
};

router.post('/:gateway', async (req, res) => {
  const { gateway } = req.params;
  try {
    const processador = PROCESSADORES[gateway];
    if (!processador) return res.status(400).json({ success: false, message: `Gateway ${gateway} não suportado` });

    const resultado = await processador(req.body, req.headers);
    if (!resultado || !resultado.gateway_id) return res.status(200).json({ success: true, message: 'Webhook recebido (sem ação)' });

    // Buscar cobrança por gateway_id
    const cobrancas = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: 'gateway_id = :gid AND gateway = :gw',
      ExpressionAttributeValues: { ':pk': 'COBRANCA', ':gid': resultado.gateway_id, ':gw': gateway },
    }));

    if (!cobrancas.Items || cobrancas.Items.length === 0) {
      console.warn(`[WEBHOOK] Cobrança não encontrada: ${gateway}/${resultado.gateway_id}`);
      return res.status(200).json({ success: true, message: 'Cobrança não encontrada' });
    }

    const cobranca = cobrancas.Items[0];
    const updateExpr = resultado.status === 'pago'
      ? 'SET #s = :s, data_pagamento = :d'
      : 'SET #s = :s';
    const updateVals = resultado.status === 'pago'
      ? { ':s': resultado.status, ':d': new Date().toISOString() }
      : { ':s': resultado.status };

    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: cobranca.PK, SK: cobranca.SK },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: updateVals,
    }));

    if (resultado.status === 'pago' && features.whatsapp && cobranca.cliente_id) {
      // Buscar cliente via GSI
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

    // Registrar log
    const logId = crypto.randomUUID();
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        id: logId,
        PK: `WEBHOOK_LOG#${logId}`, SK: `WEBHOOK_LOG#${logId}`,
        GSI1PK: 'WEBHOOK_LOG', GSI1SK: new Date().toISOString(),
        gateway, gateway_id: resultado.gateway_id,
        status_recebido: resultado.status,
        payload: JSON.stringify(resultado.dados_brutos || req.body),
        processado: true,
        created: new Date().toISOString(),
      },
    }));

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(`[WEBHOOK ${gateway}] Erro:`, error.message);
    res.status(200).json({ success: true, message: 'Erro processado' });
  }
});

export default router;
