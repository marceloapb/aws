import { Router } from 'express';
import { getPocketbaseClient } from '../config/pocketbase.js';
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
  asaas: processarAsaas,
  stripe: processarStripe,
  mercadopago: processarMercadoPago,
  pagarme: processarPagarme,
  pagbank: processarPagBank,
  picpay: processarPicPay,
  sumup: processarSumUp,
  'banco-inter': processarBancoInter,
  stone: processarStone,
  infinitepay: processarInfinitePay,
};

router.post('/:gateway', async (req, res) => {
  const { gateway } = req.params;
  try {
    const processador = PROCESSADORES[gateway];
    if (!processador) return res.status(400).json({ success: false, message: `Gateway ${gateway} não suportado` });

    const resultado = await processador(req.body, req.headers);
    if (!resultado || !resultado.gateway_id) {
      return res.status(200).json({ success: true, message: 'Webhook recebido (sem ação)' });
    }

    const pb = await getPocketbaseClient();
    const cobrancas = await pb.collection('cobrancas').getFullList({
      filter: `gateway_id = "${resultado.gateway_id}" && gateway = "${gateway}"`,
      expand: 'cliente_id',
    });

    if (cobrancas.length === 0) {
      console.warn(`[WEBHOOK] Cobrança não encontrada: ${gateway}/${resultado.gateway_id}`);
      return res.status(200).json({ success: true, message: 'Cobrança não encontrada' });
    }

    const cobranca = cobrancas[0];
    const updateData = { status: resultado.status };
    if (resultado.status === 'pago') updateData.data_pagamento = new Date().toISOString();
    await pb.collection('cobrancas').update(cobranca.id, updateData);

    if (resultado.status === 'pago' && features.whatsapp) {
      const cliente = cobranca.expand?.cliente_id;
      if (cliente?.whatsapp_numero) {
        try {
          await enviarNotificacaoPagamento(cliente.whatsapp_numero, cliente.nome, cobranca.valor, 'confirmado');
        } catch (e) {
          console.error('[WEBHOOK] Erro WhatsApp:', e.message);
        }
      }
    }

    await pb.collection('webhook_logs').create({
      gateway,
      gateway_id: resultado.gateway_id,
      status_recebido: resultado.status,
      payload: JSON.stringify(resultado.dados_brutos || req.body),
      processado: true,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(`[WEBHOOK ${gateway}] Erro:`, error.message);
    res.status(200).json({ success: true, message: 'Erro processado' });
  }
});

export default router;
