// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-EQUIPAMENTOS.JS — CRUD de equipamentos
// ══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { getPocketbaseClient } from '../config/pocketbase.js';

const router = Router();

// GET /api/admin/equipamentos — Listar equipamentos
router.get('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const { status, categoria, page = 1, limit = 50 } = req.query;

    const filters = [];
    if (status) filters.push(`status = "${status}"`);
    if (categoria) filters.push(`categoria = "${categoria}"`);
    const filter = filters.join(' && ');

    const result = await pb.collection('equipamentos').getList(Number(page), Number(limit), {
      filter,
      sort: 'nome',
    });

    res.json({ success: true, data: result.items, pagination: { page: result.page, totalPages: result.totalPages, totalItems: result.totalItems } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/equipamentos — Criar
router.post('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const equipamento = await pb.collection('equipamentos').create(req.body);
    res.status(201).json({ success: true, data: equipamento });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/equipamentos/:id — Atualizar
router.put('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const equipamento = await pb.collection('equipamentos').update(req.params.id, req.body);
    res.json({ success: true, data: equipamento });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/equipamentos/:id — Excluir
router.delete('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    await pb.collection('equipamentos').delete(req.params.id);
    res.json({ success: true, message: 'Equipamento excluído' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
