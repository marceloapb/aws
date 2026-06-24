// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-PENDENCIAS.JS — Gerenciamento de pendências/tarefas
// ══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { getPocketbaseClient } from '../config/pocketbase.js';

const router = Router();

// GET /api/admin/pendencias — Listar pendências
router.get('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const { status, prioridade, page = 1, limit = 50 } = req.query;

    const filters = [];
    if (status) filters.push(`status = "${status}"`);
    if (prioridade) filters.push(`prioridade = "${prioridade}"`);
    const filter = filters.join(' && ');

    const result = await pb.collection('pendencias').getList(Number(page), Number(limit), {
      filter,
      sort: '-prioridade,-created',
    });

    res.json({ success: true, data: result.items, pagination: { page: result.page, totalPages: result.totalPages, totalItems: result.totalItems } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/pendencias — Criar
router.post('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const pendencia = await pb.collection('pendencias').create({
      ...req.body,
      status: 'pendente',
    });
    res.status(201).json({ success: true, data: pendencia });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/pendencias/:id — Atualizar
router.put('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const pendencia = await pb.collection('pendencias').update(req.params.id, req.body);
    res.json({ success: true, data: pendencia });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/pendencias/:id/concluir — Marcar como concluída
router.post('/:id/concluir', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const pendencia = await pb.collection('pendencias').update(req.params.id, {
      status: 'concluida',
      concluida_em: new Date().toISOString(),
    });
    res.json({ success: true, data: pendencia });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/pendencias/:id — Excluir
router.delete('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    await pb.collection('pendencias').delete(req.params.id);
    res.json({ success: true, message: 'Pendência excluída' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
