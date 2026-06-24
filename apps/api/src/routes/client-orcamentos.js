import { Router } from 'express';
import { getPocketbaseClient } from '../config/pocketbase.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const orcamentos = await pb.collection('orcamentos').getFullList({
      filter: `cliente_id = "${req.clienteId}"`, sort: '-created',
    });
    res.json({ success: true, data: orcamentos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:token', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const orcamentos = await pb.collection('orcamentos').getFullList({
      filter: `token_acesso = "${req.params.token}"`, expand: 'cliente_id',
    });
    if (orcamentos.length === 0) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
    res.json({ success: true, data: orcamentos[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/aprovar', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const orcamento = await pb.collection('orcamentos').getOne(req.params.id);
    if (orcamento.cliente_id !== req.clienteId) return res.status(403).json({ success: false, message: 'Acesso negado' });
    if (orcamento.status !== 'enviado') return res.status(400).json({ success: false, message: 'Orçamento não pode ser aprovado neste status' });
    await pb.collection('orcamentos').update(req.params.id, { status: 'aprovado', aprovado_em: new Date().toISOString() });
    res.json({ success: true, message: 'Orçamento aprovado' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
