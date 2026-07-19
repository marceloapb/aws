// ══════════════════════════════════════════════════════════════
// ALB-15: Client Event Tracking Routes
// Mounted at /client/albuns/:slug/track
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const router = Router({ mergeParams: true });

const TIPOS_VALIDOS = ['view', 'download', 'selecao', 'compartilhar'];
const TTL_90_DAYS = 90 * 24 * 60 * 60; // 90 days in seconds

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

// POST / — Fire-and-forget event tracking
router.post('/', async (req, res) => {
  const { slug } = req.params;
  const { tipo, foto_id } = req.body;

  // Validate tipo
  if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ success: false, message: `tipo deve ser um de: ${TIPOS_VALIDOS.join(', ')}` });
  }

  // Return immediately — fire-and-forget
  res.json({ success: true, data: { tracked: true } });

  // Write event asynchronously (don't block response)
  setImmediate(async () => {
    try {
      const album = await resolveAlbumFromSlug(slug);
      if (!album) return;

      const id = crypto.randomUUID();
      const now = new Date();
      const timestamp = now.toISOString();
      const ttl = Math.floor(now.getTime() / 1000) + TTL_90_DAYS;

      await dynamo.send(new PutCommand({
        TableName: TABLE,
        Item: {
          PK: `ALBUM#${album.id}`,
          SK: `EVENTO#${timestamp}#${id}`,
          id,
          album_id: album.id,
          tipo,
          foto_id: foto_id || null,
          timestamp,
          cliente_id: album.cliente_id || null,
          user_agent: null, // Could be extracted from req if needed
          ttl,
        },
      }));
    } catch (error) {
      console.error('[ALB-15] Erro ao registrar evento:', error.message);
    }
  });
});

module.exports = router;
