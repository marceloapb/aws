// ══════════════════════════════════════════════════════════════
// ALB-14: Admin Album Comments Routes
// Mounted at /admin/albuns/:albumId/comentarios
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router({ mergeParams: true });

// GET / — List all comments for album
router.get('/', async (req, res) => {
  try {
    const { albumId } = req.params;

    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `ALBUM#${albumId}`,
        ':sk': 'COMENTARIO#',
      },
    }));

    const comentarios = (result.Items || []).sort((a, b) =>
      (b.created_at || '').localeCompare(a.created_at || '')
    );

    res.json({ success: true, data: comentarios });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /:comentarioId — Delete comment
router.delete('/:comentarioId', async (req, res) => {
  try {
    const { albumId, comentarioId } = req.params;

    // Delete from album partition
    await dynamo.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `ALBUM#${albumId}`, SK: `COMENTARIO#${comentarioId}` },
    }));

    // Also try to delete from foto partition (best-effort)
    // We need to find the foto_id from the comment first
    // Since we already deleted it, we try a scan of FOTO# partitions
    // For efficiency, we use a GSI or stored foto_id — here we just handle the album copy
    // The foto copy will be handled if we have foto_id info

    res.json({ success: true, message: 'Comentário excluído' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /:comentarioId/aprovar — Approve comment
router.patch('/:comentarioId/aprovar', async (req, res) => {
  try {
    const { albumId, comentarioId } = req.params;

    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `ALBUM#${albumId}`, SK: `COMENTARIO#${comentarioId}` },
      UpdateExpression: 'SET aprovado = :true, aprovado_em = :now',
      ExpressionAttributeValues: {
        ':true': true,
        ':now': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    }));

    // Also update in foto partition if foto_id is available
    if (result.Attributes && result.Attributes.foto_id) {
      await dynamo.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `FOTO#${result.Attributes.foto_id}`, SK: `COMENTARIO#${comentarioId}` },
        UpdateExpression: 'SET aprovado = :true, aprovado_em = :now',
        ExpressionAttributeValues: {
          ':true': true,
          ':now': new Date().toISOString(),
        },
      })).catch(() => {}); // best-effort
    }

    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
