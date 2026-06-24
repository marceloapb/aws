// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-FOTOS.JS — Upload e gerenciamento de fotos
// ══════════════════════════════════════════════════════════════

import { Router } from 'express';
import multer from 'multer';
import { getPocketbaseClient } from '../config/pocketbase.js';
import { uploadFoto, deleteFoto } from '../services/s3Service.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// POST /api/admin/fotos/upload — Upload de fotos (batch)
router.post('/upload', upload.array('fotos', 50), async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const { album_id } = req.body;

    if (!album_id) {
      return res.status(400).json({ success: false, message: 'album_id é obrigatório' });
    }

    // Verificar se álbum existe
    await pb.collection('albuns').getOne(album_id);

    // Obter última ordem
    const fotosExistentes = await pb.collection('fotos').getFullList({ filter: `album_id = "${album_id}"`, sort: '-ordem' });
    let ordem = fotosExistentes.length > 0 ? fotosExistentes[0].ordem + 1 : 1;

    const resultados = [];

    for (const file of req.files) {
      const key = `albuns/${album_id}/${Date.now()}-${file.originalname}`;
      const s3Result = await uploadFoto(file.buffer, key, file.mimetype);

      const foto = await pb.collection('fotos').create({
        album_id,
        nome_arquivo: file.originalname,
        s3_key: s3Result.s3_key,
        s3_key_thumb: s3Result.s3_key_thumb,
        url: s3Result.url,
        url_thumb: s3Result.url_thumb,
        largura: s3Result.largura,
        altura: s3Result.altura,
        tamanho_bytes: s3Result.tamanho_bytes,
        mime_type: file.mimetype,
        ordem: ordem++,
      });

      resultados.push(foto);
    }

    // Atualizar contagem no álbum
    const totalFotos = await pb.collection('fotos').getFullList({ filter: `album_id = "${album_id}"` });
    await pb.collection('albuns').update(album_id, { total_fotos: totalFotos.length });

    res.status(201).json({ success: true, data: resultados, total: resultados.length });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/fotos/:id — Excluir foto
router.delete('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const foto = await pb.collection('fotos').getOne(req.params.id);

    // Deletar do S3
    await deleteFoto(foto.s3_key);

    // Deletar do banco
    await pb.collection('fotos').delete(req.params.id);

    // Atualizar contagem
    const totalFotos = await pb.collection('fotos').getFullList({ filter: `album_id = "${foto.album_id}"` });
    await pb.collection('albuns').update(foto.album_id, { total_fotos: totalFotos.length });

    res.json({ success: true, message: 'Foto excluída' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/fotos/reordenar — Reordenar fotos
router.put('/reordenar', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const { fotos } = req.body; // [{ id, ordem }]

    for (const item of fotos) {
      await pb.collection('fotos').update(item.id, { ordem: item.ordem });
    }

    res.json({ success: true, message: 'Fotos reordenadas' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
