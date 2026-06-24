// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-INSTAGRAM.JS — Gerenciamento de publicações Instagram
// ══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { getPocketbaseClient } from '../config/pocketbase.js';
import { publicarCarrossel, publicarFotoUnica } from '../services/instagramService.js';
import { INSTAGRAM_STATUS } from '../config/constants.js';

const router = Router();

// GET /api/admin/instagram — Listar publicações
router.get('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const { status, page = 1, limit = 50 } = req.query;

    let filter = '';
    if (status) filter = `status = "${status}"`;

    const result = await pb.collection('instagram_publicacoes').getList(Number(page), Number(limit), {
      filter,
      sort: '-created',
    });

    res.json({ success: true, data: result.items, pagination: { page: result.page, totalPages: result.totalPages, totalItems: result.totalItems } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/instagram — Agendar publicação
router.post('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const { fotos_ids, caption, agendado_para, album_id } = req.body;

    if (!fotos_ids || fotos_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Selecione pelo menos 1 foto' });
    }

    if (fotos_ids.length > 10) {
      return res.status(400).json({ success: false, message: 'Máximo 10 fotos por carrossel' });
    }

    const publicacao = await pb.collection('instagram_publicacoes').create({
      fotos_ids,
      caption: caption || '',
      agendado_para: agendado_para || new Date().toISOString(),
      album_id: album_id || '',
      status: agendado_para ? INSTAGRAM_STATUS.AGENDADO : INSTAGRAM_STATUS.AGENDADO,
    });

    res.status(201).json({ success: true, data: publicacao });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/instagram/:id/publicar-agora — Publicar imediatamente
router.post('/:id/publicar-agora', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const pub = await pb.collection('instagram_publicacoes').getOne(req.params.id);

    // Buscar fotos
    const fotos = await pb.collection('fotos').getFullList({
      filter: pub.fotos_ids.map((id) => `id = "${id}"`).join(' || '),
    });

    const fotosKeys = fotos.map((f) => f.s3_key);
    let resultado;

    if (fotosKeys.length === 1) {
      resultado = await publicarFotoUnica(fotosKeys[0], pub.caption || '');
    } else {
      resultado = await publicarCarrossel(fotosKeys, pub.caption || '');
    }

    if (resultado.success) {
      await pb.collection('instagram_publicacoes').update(pub.id, {
        status: INSTAGRAM_STATUS.PUBLICADO,
        publicado_em: new Date().toISOString(),
        instagram_post_id: resultado.instagram_post_id,
        instagram_permalink: resultado.instagram_permalink,
      });
      res.json({ success: true, data: resultado });
    } else {
      throw new Error(resultado.error);
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/instagram/:id — Cancelar publicação agendada
router.delete('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    await pb.collection('instagram_publicacoes').delete(req.params.id);
    res.json({ success: true, message: 'Publicação cancelada' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
