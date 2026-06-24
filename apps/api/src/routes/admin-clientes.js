// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-CLIENTES.JS — CRUD de clientes
// ══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { getPocketbaseClient } from '../config/pocketbase.js';

const router = Router();

// GET /api/admin/clientes — Listar clientes
router.get('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const { search, page = 1, limit = 50 } = req.query;

    let filter = '';
    if (search) {
      filter = `nome ~ "${search}" || email ~ "${search}" || whatsapp_numero ~ "${search}"`;
    }

    const result = await pb.collection('clientes').getList(Number(page), Number(limit), {
      filter,
      sort: '-created',
    });

    res.json({ success: true, data: result.items, pagination: { page: result.page, totalPages: result.totalPages, totalItems: result.totalItems } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/clientes/:id — Detalhe do cliente
router.get('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const cliente = await pb.collection('clientes').getOne(req.params.id);
    res.json({ success: true, data: cliente });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Cliente não encontrado' });
  }
});

// POST /api/admin/clientes — Criar cliente
router.post('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const cliente = await pb.collection('clientes').create(req.body);
    res.status(201).json({ success: true, data: cliente });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/clientes/:id — Atualizar cliente
router.put('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const cliente = await pb.collection('clientes').update(req.params.id, req.body);
    res.json({ success: true, data: cliente });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/clientes/:id — Excluir cliente
router.delete('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    await pb.collection('clientes').delete(req.params.id);
    res.json({ success: true, message: 'Cliente excluído' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
