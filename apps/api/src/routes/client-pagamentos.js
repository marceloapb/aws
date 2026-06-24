import { Router } from 'express';
import { getPocketbaseClient } from '../config/pocketbase.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const cobrancas = await pb.collection('cobrancas').getFullList({
      filter: `cliente_id = "${req.clienteId}"`, sort: '-created',
    });
    res.json({ success: true, data: cobrancas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const cobranca = await pb.collection('cobrancas').getOne(req.params.id);
    if (cobranca.cliente_id !== req.clienteId) return res.status(403).json({ success: false, message: 'Acesso negado' });
    res.json({ success: true, data: cobranca });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Cobrança não encontrada' });
  }
});

export default router;
