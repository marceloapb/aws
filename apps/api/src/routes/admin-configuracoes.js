// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-CONFIGURACOES.JS — Configurações do sistema
// ══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { getPocketbaseClient } from '../config/pocketbase.js';

const router = Router();

// GET /api/admin/configuracoes — Obter todas as configurações
router.get('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const configs = await pb.collection('configuracoes').getFullList();

    // Transformar em objeto chave-valor
    const resultado = {};
    for (const config of configs) {
      resultado[config.chave] = config.valor;
    }

    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/configuracoes — Atualizar configurações
router.put('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const dados = req.body; // { chave: valor, chave2: valor2 }

    for (const [chave, valor] of Object.entries(dados)) {
      const existentes = await pb.collection('configuracoes').getFullList({ filter: `chave = "${chave}"` });

      if (existentes.length > 0) {
        await pb.collection('configuracoes').update(existentes[0].id, { valor: String(valor) });
      } else {
        await pb.collection('configuracoes').create({ chave, valor: String(valor) });
      }
    }

    res.json({ success: true, message: 'Configurações atualizadas' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/admin/configuracoes/gateways — Listar gateways configurados
router.get('/gateways', async (req, res) => {
  try {
    const gateways = [
      { id: 'asaas', nome: 'Asaas', configurado: !!process.env.ASAAS_API_KEY },
      { id: 'stripe', nome: 'Stripe', configurado: !!process.env.STRIPE_SECRET_KEY },
      { id: 'mercadopago', nome: 'MercadoPago', configurado: !!process.env.MERCADOPAGO_ACCESS_TOKEN },
      { id: 'pagarme', nome: 'Pagar.me', configurado: !!process.env.PAGARME_API_KEY },
      { id: 'pagbank', nome: 'PagBank', configurado: !!process.env.PAGBANK_TOKEN },
      { id: 'picpay', nome: 'PicPay', configurado: !!process.env.PICPAY_TOKEN },
      { id: 'sumup', nome: 'SumUp', configurado: !!process.env.SUMUP_API_KEY },
      { id: 'banco-inter', nome: 'Banco Inter', configurado: !!process.env.BANCO_INTER_CLIENT_ID },
      { id: 'stone', nome: 'Stone', configurado: !!process.env.STONE_API_KEY },
      { id: 'infinitepay', nome: 'InfinitePay', configurado: !!process.env.INFINITEPAY_API_KEY },
    ];

    res.json({ success: true, data: gateways });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
