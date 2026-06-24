// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-ORCAMENTOS.JS — CRUD de orçamentos
// ══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { getPocketbaseClient } from '../config/pocketbase.js';

const router = Router();

// GET /api/admin/orcamentos — Listar orçamentos
router.get('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const { status, cliente_id, page = 1, limit = 50 } = req.query;

    const filters = [];
    if (status) filters.push(`status = "${status}"`);
    if (cliente_id) filters.push(`cliente_id = "${cliente_id}"`);
    const filter = filters.join(' && ');

    const result = await pb.collection('orcamentos').getList(Number(page), Number(limit), {
      filter,
      sort: '-created',
      expand: 'cliente_id',
    });

    res.json({ success: true, data: result.items, pagination: { page: result.page, totalPages: result.totalPages, totalItems: result.totalItems } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/orcamentos/:id — Detalhe
router.get('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const orcamento = await pb.collection('orcamentos').getOne(req.params.id, { expand: 'cliente_id' });
    res.json({ success: true, data: orcamento });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
  }
});

// POST /api/admin/orcamentos — Criar
router.post('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const orcamento = await pb.collection('orcamentos').create({
      ...req.body,
      status: 'rascunho',
    });
    res.status(201).json({ success: true, data: orcamento });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/orcamentos/:id — Atualizar
router.put('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const orcamento = await pb.collection('orcamentos').update(req.params.id, req.body);
    res.json({ success: true, data: orcamento });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/orcamentos/:id/enviar — Enviar para cliente
router.post('/:id/enviar', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const orcamento = await pb.collection('orcamentos').update(req.params.id, {
      status: 'enviado',
      enviado_em: new Date().toISOString(),
    });
    res.json({ success: true, data: orcamento });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/orcamentos/:id/aprovar — Aprovar orçamento
router.post('/:id/aprovar', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const orcamento = await pb.collection('orcamentos').update(req.params.id, {
      status: 'aprovado',
      aprovado_em: new Date().toISOString(),
    });
    res.json({ success: true, data: orcamento });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/orcamentos/:id — Excluir
router.delete('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    await pb.collection('orcamentos').delete(req.params.id);
    res.json({ success: true, message: 'Orçamento excluído' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
