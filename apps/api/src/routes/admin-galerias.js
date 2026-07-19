const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const router = Router({ mergeParams: true });

// GET /admin/albuns/:albumId/galerias — List galleries ordered by ordem
router.get('/', async (req, res) => {
  try {
    const { albumId } = req.params;

    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${albumId}`, ':sk': 'GALERIA#' },
    }));

    const galerias = (result.Items || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    res.json({ success: true, data: galerias });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /admin/albuns/:albumId/galerias — Create gallery
router.post('/', async (req, res) => {
  try {
    const { albumId } = req.params;
    const { nome } = req.body;

    if (!nome) return res.status(400).json({ success: false, message: 'nome é obrigatório' });

    // Check max 20 galleries per album
    const existing = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${albumId}`, ':sk': 'GALERIA#' },
      Select: 'COUNT',
    }));

    if ((existing.Count || 0) >= 20) {
      return res.status(400).json({ success: false, message: 'Máximo de 20 galerias por álbum' });
    }

    const id = crypto.randomUUID();
    const ordem = existing.Count || 0;

    const item = {
      PK: `ALBUM#${albumId}`,
      SK: `GALERIA#${id}`,
      id,
      album_id: albumId,
      nome,
      ordem,
      created: new Date().toISOString(),
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /admin/albuns/:albumId/galerias/reorder — Batch reorder
router.put('/reorder', async (req, res) => {
  try {
    const { albumId } = req.params;
    const { galerias } = req.body;

    if (!Array.isArray(galerias)) {
      return res.status(400).json({ success: false, message: 'galerias deve ser um array de [{id, ordem}]' });
    }

    for (const item of galerias) {
      await dynamo.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `ALBUM#${albumId}`, SK: `GALERIA#${item.id}` },
        UpdateExpression: 'SET ordem = :o',
        ExpressionAttributeValues: { ':o': item.ordem },
      }));
    }

    res.json({ success: true, message: 'Galerias reordenadas' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /admin/albuns/:albumId/galerias/:galeriaId — Update gallery
router.put('/:galeriaId', async (req, res) => {
  try {
    const { albumId, galeriaId } = req.params;
    const { nome, ordem } = req.body;

    const updates = {};
    if (nome !== undefined) updates.nome = nome;
    if (ordem !== undefined) updates.ordem = ordem;

    const keys = Object.keys(updates);
    if (keys.length === 0) return res.status(400).json({ success: false, message: 'Nenhum campo para atualizar' });

    const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
    const vals = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));

    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `ALBUM#${albumId}`, SK: `GALERIA#${galeriaId}` },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
      ReturnValues: 'ALL_NEW',
    }));

    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /admin/albuns/:albumId/galerias/:galeriaId — Delete if empty
router.delete('/:galeriaId', async (req, res) => {
  try {
    const { albumId, galeriaId } = req.params;

    // Check if gallery has photos
    const fotosResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'galeria_id = :gid',
      ExpressionAttributeValues: { ':pk': `ALBUM#${albumId}`, ':sk': 'FOTO#', ':gid': galeriaId },
      Select: 'COUNT',
    }));

    if ((fotosResult.Count || 0) > 0) {
      return res.status(400).json({ success: false, message: 'Não é possível excluir galeria com fotos. Mova as fotos primeiro.' });
    }

    await dynamo.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `ALBUM#${albumId}`, SK: `GALERIA#${galeriaId}` },
    }));

    res.json({ success: true, message: 'Galeria excluída' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
