// ══════════════════════════════════════════════════════════════
// ALB-14: Client Album Comments Routes
// Mounted at /client/albuns/:slug/comentarios
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const router = Router({ mergeParams: true });

/**
 * Helper: resolve albumId from slug parameter
 */
async function resolveAlbumFromSlug(slug) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    FilterExpression: 'slug = :slug',
    ExpressionAttributeValues: { ':pk': 'ALBUM', ':slug': slug },
  }));
  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
}

// GET /:fotoId — List approved comments for a photo
router.get('/:fotoId', async (req, res) => {
  try {
    const { fotoId } = req.params;

    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'aprovado = :true',
      ExpressionAttributeValues: {
        ':pk': `FOTO#${fotoId}`,
        ':sk': 'COMENTARIO#',
        ':true': true,
      },
    }));

    const comentarios = (result.Items || []).sort((a, b) =>
      (a.created_at || '').localeCompare(b.created_at || '')
    );

    res.json({ success: true, data: comentarios });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /:fotoId — Add comment to a photo
router.post('/:fotoId', async (req, res) => {
  try {
    const { slug, fotoId } = req.params;
    const { texto } = req.body;

    // Validate texto
    if (!texto || typeof texto !== 'string') {
      return res.status(400).json({ success: false, message: 'texto é obrigatório' });
    }
    if (texto.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'texto deve ter no mínimo 3 caracteres' });
    }
    if (texto.length > 500) {
      return res.status(400).json({ success: false, message: 'texto deve ter no máximo 500 caracteres' });
    }

    // Resolve album from slug
    const album = await resolveAlbumFromSlug(slug);
    if (!album) {
      return res.status(404).json({ success: false, message: 'Álbum não encontrado' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const autorNome = (req.user && req.user.name) || (req.user && req.user.email) || 'Anônimo';

    const comentario = {
      id,
      foto_id: fotoId,
      album_id: album.id,
      autor_nome: autorNome,
      texto: texto.trim(),
      aprovado: false,
      created_at: now,
    };

    // Write to FOTO# partition (for client queries)
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `FOTO#${fotoId}`,
        SK: `COMENTARIO#${id}`,
        ...comentario,
      },
    }));

    // Write to ALBUM# partition (for admin listing)
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `ALBUM#${album.id}`,
        SK: `COMENTARIO#${id}`,
        ...comentario,
      },
    }));

    res.status(201).json({ success: true, data: comentario });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
