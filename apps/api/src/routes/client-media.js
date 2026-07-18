// ══════════════════════════════════════════════════════════════
// ROUTES/CLIENT-MEDIA.JS — Rotas de mídia para clientes
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { generateUploadUrl } = require('../services/mediaUploadService');
const { getMediaById, listMedia } = require('../services/mediaService');
const { getPresignedReadUrl, getBatchUrls, getKeyForVersion } = require('../services/mediaUrlService');

const router = Router();
const TENANT = process.env.TENANT_ID || 'default';

// POST /upload-url — Upload APENAS para contexto 'perfil'
router.post('/upload-url', async (req, res) => {
  try {
    const { entidade_id, filename, content_type, size_bytes } = req.body;
    const contexto = 'perfil';

    if (!entidade_id || !filename || !content_type || !size_bytes) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios: entidade_id, filename, content_type, size_bytes' });
    }

    // Cliente só pode fazer upload para seu próprio perfil
    const clienteId = req.user.sub || req.clienteId;
    if (entidade_id !== clienteId) {
      return res.status(403).json({ success: false, message: 'Acesso negado: entidade_id deve ser o seu próprio ID' });
    }

    const tenant_id = TENANT;
    const result = await generateUploadUrl({ tenant_id, contexto, entidade_id, filename, content_type, size_bytes });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /urls — Batch de URLs presigned para múltiplas mídias
router.post('/urls', async (req, res) => {
  try {
    const { media_ids, version = 'web' } = req.body;

    if (!media_ids || !Array.isArray(media_ids) || media_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Campo obrigatório: media_ids (array)' });
    }

    if (!['web', 'thumb', 'original'].includes(version)) {
      return res.status(400).json({ success: false, message: 'version deve ser: web, thumb ou original' });
    }

    if (media_ids.length > 50) {
      return res.status(400).json({ success: false, message: 'Máximo de 50 media_ids por requisição' });
    }

    const clienteId = req.user.sub || req.clienteId;

    // Buscar itens e validar ownership
    // Para cliente, verificamos se o item pertence a um album do cliente
    const items = [];
    for (const id of media_ids) {
      // Tentamos buscar no contexto album (principal uso do cliente)
      const item = await getMediaById(id, 'album', clienteId);
      if (item && item.status !== 'deleted' && item.status !== 'purged') {
        items.push(item);
      }
    }

    const itemsWithUrls = await getBatchUrls(items, version);

    res.json({
      success: true,
      data: itemsWithUrls.map(item => ({
        media_id: item.media_id,
        url: item.url,
        key: item.key,
        content_type: item.content_type,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /:media_id/url — URL presigned para uma única mídia
router.get('/:media_id/url', async (req, res) => {
  try {
    const { media_id } = req.params;
    const { version = 'web' } = req.query;
    const clienteId = req.user.sub || req.clienteId;

    // Tentar buscar no contexto album (cliente acessa apenas seus álbuns)
    let item = await getMediaById(media_id, 'album', clienteId);

    if (!item || item.status === 'deleted' || item.status === 'purged') {
      return res.status(404).json({ success: false, message: 'Mídia não encontrada ou acesso negado' });
    }

    const key = getKeyForVersion(item, version);
    if (!key) {
      return res.status(404).json({ success: false, message: 'Versão não disponível' });
    }

    const url = await getPresignedReadUrl(key, item.bucket);

    res.json({
      success: true,
      data: {
        media_id: item.media_id,
        url,
        key,
        content_type: item.content_type,
        expires_in: key.includes('-original') ? 3600 : 900,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
