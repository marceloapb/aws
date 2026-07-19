const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { getSignedDownloadUrl } = require('../services/s3Service');

const router = Router({ mergeParams: true });

// Helper: find album by slug
async function getAlbumBySlug(slug) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    FilterExpression: 'slug = :slug',
    ExpressionAttributeValues: { ':pk': 'ALBUM', ':slug': slug },
  }));
  return result.Items?.[0] || null;
}

// GET /client/albuns/:slug/download/:fotoId — Individual photo download
router.get('/:fotoId', async (req, res) => {
  try {
    const { slug, fotoId } = req.params;
    const album = await getAlbumBySlug(slug);
    if (!album) return res.status(404).json({ success: false, message: 'Álbum não encontrado' });

    // Check album not expired
    if (album.data_expiracao) {
      const expDate = new Date(album.data_expiracao);
      if (expDate < new Date() && !album.protegido) {
        return res.status(410).json({ success: false, message: 'Álbum expirado' });
      }
    }

    // Check permite_download
    if (album.permite_download === false) {
      return res.status(403).json({ success: false, message: 'Download não permitido para este álbum' });
    }

    // Get photo
    const fotoResult = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `ALBUM#${album.id}`, SK: `FOTO#${fotoId}` },
    }));

    if (!fotoResult.Item) return res.status(404).json({ success: false, message: 'Foto não encontrada' });

    const foto = fotoResult.Item;
    const key = foto.s3_key_original || foto.s3_key;

    if (!key) return res.status(404).json({ success: false, message: 'Arquivo não disponível' });

    // Generate presigned GET URL (60 minutes)
    const url = await getSignedDownloadUrl(key, 3600);

    res.json({ success: true, data: { url, foto_id: fotoId, filename: foto.filename || key.split('/').pop() } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /client/albuns/:slug/download/zip — Start ZIP job (Phase 3 placeholder)
router.post('/zip', async (req, res) => {
  try {
    const { slug } = req.params;
    const { foto_ids } = req.body;

    const album = await getAlbumBySlug(slug);
    if (!album) return res.status(404).json({ success: false, message: 'Álbum não encontrado' });

    // Check album not expired
    if (album.data_expiracao) {
      const expDate = new Date(album.data_expiracao);
      if (expDate < new Date() && !album.protegido) {
        return res.status(410).json({ success: false, message: 'Álbum expirado' });
      }
    }

    // Check permite_download
    if (album.permite_download === false) {
      return res.status(403).json({ success: false, message: 'Download não permitido para este álbum' });
    }

    // Get photos to download
    let fotos;
    if (foto_ids && Array.isArray(foto_ids) && foto_ids.length > 0) {
      if (foto_ids.length > 500) {
        return res.status(400).json({ success: false, message: 'Máximo de 500 fotos por ZIP' });
      }
      // Get specific photos
      const fotosResult = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `ALBUM#${album.id}`, ':sk': 'FOTO#' },
      }));
      fotos = (fotosResult.Items || []).filter(f => foto_ids.includes(f.id));
    } else {
      // Get all photos (max 500)
      const fotosResult = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `ALBUM#${album.id}`, ':sk': 'FOTO#' },
      }));
      fotos = (fotosResult.Items || []).slice(0, 500);
    }

    if (fotos.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhuma foto encontrada' });
    }

    // Phase 3 placeholder: return presigned URLs for each photo
    const urls = await Promise.all(
      fotos.map(async (foto) => {
        const key = foto.s3_key_original || foto.s3_key;
        if (!key) return null;
        const url = await getSignedDownloadUrl(key, 3600);
        return { foto_id: foto.id, url, filename: foto.filename || key.split('/').pop() };
      })
    );

    res.json({
      success: true,
      data: {
        total: urls.filter(Boolean).length,
        urls: urls.filter(Boolean),
        message: 'ZIP generation will be available in Phase 3. Use individual URLs for now.',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
