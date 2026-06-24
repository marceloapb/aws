// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-CONTRATOS.JS — CRUD de contratos
// ══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { getPocketbaseClient } from '../config/pocketbase.js';
import { gerarContrato, enviarParaAssinatura } from '../services/contratoService.js';

const router = Router();

// GET /api/admin/contratos — Listar contratos
router.get('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const { status, cliente_id, page = 1, limit = 50 } = req.query;

    const filters = [];
    if (status) filters.push(`status = "${status}"`);
    if (cliente_id) filters.push(`cliente_id = "${cliente_id}"`);
    const filter = filters.join(' && ');

    const result = await pb.collection('contratos').getList(Number(page), Number(limit), {
      filter,
      sort: '-created',
      expand: 'cliente_id,orcamento_id',
    });

    res.json({ success: true, data: result.items, pagination: { page: result.page, totalPages: result.totalPages, totalItems: result.totalItems } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/contratos/:id — Detalhe
router.get('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const contrato = await pb.collection('contratos').getOne(req.params.id, { expand: 'cliente_id,orcamento_id' });
    res.json({ success: true, data: contrato });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Contrato não encontrado' });
  }
});

// POST /api/admin/contratos/gerar — Gerar contrato a partir de orçamento
router.post('/gerar', async (req, res) => {
  try {
    const { orcamento_id } = req.body;
    if (!orcamento_id) {
      return res.status(400).json({ success: false, message: 'orcamento_id é obrigatório' });
    }

    const contrato = await gerarContrato(orcamento_id);
    res.status(201).json({ success: true, data: contrato });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/contratos/:id/enviar — Enviar para assinatura
router.post('/:id/enviar', async (req, res) => {
  try {
    const resultado = await enviarParaAssinatura(req.params.id);
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/contratos/:id — Atualizar conteúdo
router.put('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const contrato = await pb.collection('contratos').update(req.params.id, req.body);
    res.json({ success: true, data: contrato });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
