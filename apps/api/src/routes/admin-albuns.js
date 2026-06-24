// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-ALBUNS.JS — CRUD de álbuns
// ══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { getPocketbaseClient } from '../config/pocketbase.js';
import { deleteAlbumFolder } from '../services/s3Service.js';
import { ALBUM_STATUS } from '../config/constants.js';

const router = Router();

// GET /api/admin/albuns — Listar álbuns
router.get('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const { status, cliente_id, page = 1, limit = 50 } = req.query;

    const filters = [];
    if (status) filters.push(`status = "${status}"`);
    if (cliente_id) filters.push(`cliente_id = "${cliente_id}"`);
    const filter = filters.join(' && ');

    const result = await pb.collection('albuns').getList(Number(page), Number(limit), {
      filter,
      sort: '-created',
      expand: 'cliente_id',
    });

    res.json({ success: true, data: result.items, pagination: { page: result.page, totalPages: result.totalPages, totalItems: result.totalItems } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/albuns/:id — Detalhe do álbum
router.get('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const album = await pb.collection('albuns').getOne(req.params.id, { expand: 'cliente_id' });

    // Buscar fotos do álbum
    const fotos = await pb.collection('fotos').getFullList({ filter: `album_id = "${album.id}"`, sort: 'ordem' });

    res.json({ success: true, data: { ...album, fotos } });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Álbum não encontrado' });
  }
});

// POST /api/admin/albuns — Criar álbum
router.post('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const dados = req.body;

    // Calcular data de expiração (30 dias após criação)
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + 30);

    const album = await pb.collection('albuns').create({
      ...dados,
      status: ALBUM_STATUS.ATIVO,
      data_expiracao: dataExpiracao.toISOString().split('T')[0],
    });

    res.status(201).json({ success: true, data: album });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/albuns/:id — Atualizar álbum
router.put('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const album = await pb.collection('albuns').update(req.params.id, req.body);
    res.json({ success: true, data: album });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/albuns/:id — Excluir álbum
router.delete('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();

    // Deletar fotos do S3
    await deleteAlbumFolder(req.params.id);

    // Deletar fotos do banco
    const fotos = await pb.collection('fotos').getFullList({ filter: `album_id = "${req.params.id}"` });
    for (const foto of fotos) {
      await pb.collection('fotos').delete(foto.id);
    }

    await pb.collection('albuns').delete(req.params.id);
    res.json({ success: true, message: 'Álbum excluído' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
