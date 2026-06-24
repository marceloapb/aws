// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-FOTOGRAFOS.JS — CRUD de fotógrafos
// ══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { getPocketbaseClient } from '../config/pocketbase.js';

const router = Router();

// GET /api/admin/fotografos — Listar fotógrafos
router.get('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const result = await pb.collection('fotografos').getFullList({ sort: 'nome' });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/fotografos — Criar fotógrafo
router.post('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const fotografo = await pb.collection('fotografos').create(req.body);
    res.status(201).json({ success: true, data: fotografo });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/fotografos/:id — Atualizar
router.put('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const fotografo = await pb.collection('fotografos').update(req.params.id, req.body);
    res.json({ success: true, data: fotografo });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/fotografos/:id — Excluir
router.delete('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    await pb.collection('fotografos').delete(req.params.id);
    res.json({ success: true, message: 'Fotógrafo excluído' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
