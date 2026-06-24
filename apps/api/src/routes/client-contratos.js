import { Router } from 'express';
import { getPocketbaseClient } from '../config/pocketbase.js';
import { assinarContrato } from '../services/contratoService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const contratos = await pb.collection('contratos').getFullList({
      filter: `cliente_id = "${req.clienteId}"`, sort: '-created',
    });
    res.json({ success: true, data: contratos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:token', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const contratos = await pb.collection('contratos').getFullList({
      filter: `token_assinatura = "${req.params.token}"`, expand: 'cliente_id',
    });
    if (contratos.length === 0) return res.status(404).json({ success: false, message: 'Contrato não encontrado' });
    res.json({ success: true, data: contratos[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:token/assinar', async (req, res) => {
  try {
    const resultado = await assinarContrato(req.params.token, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      hash: req.body.hash || '',
      nome_digitado: req.body.nome_digitado || '',
      aceite_termos: req.body.aceite_termos || false,
    });
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
