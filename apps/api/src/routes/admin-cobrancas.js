// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-COBRANCAS.JS — CRUD de cobranças + integração gateways
// ══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { getPocketbaseClient } from '../config/pocketbase.js';
import { criarCobranca, consultarCobranca, cancelarCobranca } from '../adapters/index.js';

const router = Router();

// GET /api/admin/cobrancas — Listar cobranças
router.get('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const { status, cliente_id, gateway, page = 1, limit = 50 } = req.query;

    const filters = [];
    if (status) filters.push(`status = "${status}"`);
    if (cliente_id) filters.push(`cliente_id = "${cliente_id}"`);
    if (gateway) filters.push(`gateway = "${gateway}"`);
    const filter = filters.join(' && ');

    const result = await pb.collection('cobrancas').getList(Number(page), Number(limit), {
      filter,
      sort: '-created',
      expand: 'cliente_id,orcamento_id',
    });

    res.json({ success: true, data: result.items, pagination: { page: result.page, totalPages: result.totalPages, totalItems: result.totalItems } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/cobrancas — Criar cobrança
router.post('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const dados = req.body;

    // Criar no gateway
    const gatewayResult = await criarCobranca(dados.gateway, dados);

    // Salvar no PocketBase
    const cobranca = await pb.collection('cobrancas').create({
      cliente_id: dados.cliente_id,
      orcamento_id: dados.orcamento_id || '',
      gateway: dados.gateway,
      gateway_id: gatewayResult.gateway_id,
      meio_pagamento: dados.meio_pagamento,
      valor: dados.valor,
      parcelas: dados.parcelas || 1,
      status: gatewayResult.status,
      descricao: dados.descricao,
      data_vencimento: dados.data_vencimento,
      link_pagamento: gatewayResult.link_pagamento,
      pix_copia_cola: gatewayResult.pix_copia_cola || '',
      pix_qr_code: gatewayResult.pix_qr_code || '',
      boleto_url: gatewayResult.boleto_url || '',
    });

    res.status(201).json({ success: true, data: cobranca });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/admin/cobrancas/:id/consultar — Consultar status no gateway
router.get('/:id/consultar', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const cobranca = await pb.collection('cobrancas').getOne(req.params.id);

    const gatewayResult = await consultarCobranca(cobranca.gateway, cobranca.gateway_id);

    // Atualizar status local
    if (gatewayResult.status !== cobranca.status) {
      await pb.collection('cobrancas').update(cobranca.id, {
        status: gatewayResult.status,
        data_pagamento: gatewayResult.data_pagamento || '',
      });
    }

    res.json({ success: true, data: gatewayResult });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/cobrancas/:id/cancelar — Cancelar cobrança
router.post('/:id/cancelar', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const cobranca = await pb.collection('cobrancas').getOne(req.params.id);

    await cancelarCobranca(cobranca.gateway, cobranca.gateway_id);

    await pb.collection('cobrancas').update(cobranca.id, { status: 'cancelado' });

    res.json({ success: true, message: 'Cobrança cancelada' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
