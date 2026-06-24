// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-WHATSAPP.JS — Envio manual de mensagens WhatsApp
// ══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { enviarTemplate, enviarNotificacaoOrcamento, enviarNotificacaoAlbum } from '../services/whatsappService.js';
import { getPocketbaseClient } from '../config/pocketbase.js';

const router = Router();

// POST /api/admin/whatsapp/enviar-template — Enviar template genérico
router.post('/enviar-template', async (req, res) => {
  try {
    const { numero, template, parametros } = req.body;

    if (!numero || !template) {
      return res.status(400).json({ success: false, message: 'numero e template são obrigatórios' });
    }

    const resultado = await enviarTemplate(numero, template, parametros || []);
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/whatsapp/notificar-orcamento — Notificar cliente sobre orçamento
router.post('/notificar-orcamento', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const { orcamento_id } = req.body;

    const orcamento = await pb.collection('orcamentos').getOne(orcamento_id, { expand: 'cliente_id' });
    const cliente = orcamento.expand?.cliente_id;

    if (!cliente?.whatsapp_numero) {
      return res.status(400).json({ success: false, message: 'Cliente sem WhatsApp cadastrado' });
    }

    const link = `${process.env.FRONTEND_URL}/orcamento/${orcamento.token_acesso}`;
    const resultado = await enviarNotificacaoOrcamento(cliente.whatsapp_numero, cliente.nome, orcamento.valor_total, link);

    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/whatsapp/notificar-album — Notificar cliente sobre álbum
router.post('/notificar-album', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const { album_id } = req.body;

    const album = await pb.collection('albuns').getOne(album_id, { expand: 'cliente_id' });
    const cliente = album.expand?.cliente_id;

    if (!cliente?.whatsapp_numero) {
      return res.status(400).json({ success: false, message: 'Cliente sem WhatsApp cadastrado' });
    }

    const link = `${process.env.FRONTEND_URL}/album/${album.slug || album.id}`;
    const resultado = await enviarNotificacaoAlbum(cliente.whatsapp_numero, cliente.nome, album.titulo, link);

    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
