const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

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

// GET /client/albuns/:slug/selecao — Get selection status
router.get('/', async (req, res) => {
  try {
    const { slug } = req.params;
    const album = await getAlbumBySlug(slug);
    if (!album) return res.status(404).json({ success: false, message: 'Álbum não encontrado' });

    // Get all photos and filter selected ones
    const fotosResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${album.id}`, ':sk': 'FOTO#' },
    }));

    const fotos = fotosResult.Items || [];
    const selecionadas = fotos.filter(f => f.selecionada === true);

    res.json({
      success: true,
      data: {
        confirmada: album.selecao_confirmada || false,
        total_selecionadas: selecionadas.length,
        cota: album.cota_selecao || null,
        fotos_selecionadas: selecionadas.map(f => ({ id: f.id, s3_key: f.s3_key, ordem: f.ordem })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /client/albuns/:slug/selecao/toggle — Toggle photo selection
router.post('/toggle', async (req, res) => {
  try {
    const { slug } = req.params;
    const { foto_id } = req.body;

    if (!foto_id) return res.status(400).json({ success: false, message: 'foto_id é obrigatório' });

    const album = await getAlbumBySlug(slug);
    if (!album) return res.status(404).json({ success: false, message: 'Álbum não encontrado' });

    // Check if selection is locked
    if (album.selecao_confirmada) {
      return res.status(400).json({ success: false, message: 'Seleção já foi confirmada e não pode ser alterada' });
    }

    // Get all photos to check current state and quota
    const fotosResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${album.id}`, ':sk': 'FOTO#' },
    }));

    const fotos = fotosResult.Items || [];
    const foto = fotos.find(f => f.id === foto_id);
    if (!foto) return res.status(404).json({ success: false, message: 'Foto não encontrada' });

    const currentlySelected = foto.selecionada === true;
    const totalSelecionadas = fotos.filter(f => f.selecionada === true).length;
    const cota = album.cota_selecao || null;

    // If selecting (not deselecting), check quota
    if (!currentlySelected && cota && totalSelecionadas >= cota) {
      return res.status(400).json({
        success: false,
        message: `Cota de seleção atingida (${cota} fotos)`,
        data: { total_selecionadas: totalSelecionadas, cota },
      });
    }

    const newState = !currentlySelected;

    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: foto.PK, SK: foto.SK },
      UpdateExpression: 'SET selecionada = :s',
      ExpressionAttributeValues: { ':s': newState },
    }));

    const newTotal = newState ? totalSelecionadas + 1 : totalSelecionadas - 1;

    res.json({
      success: true,
      data: {
        selecionada: newState,
        total_selecionadas: newTotal,
        cota,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /client/albuns/:slug/selecao/confirmar — Lock selection (irreversible)
router.post('/confirmar', async (req, res) => {
  try {
    const { slug } = req.params;
    const album = await getAlbumBySlug(slug);
    if (!album) return res.status(404).json({ success: false, message: 'Álbum não encontrado' });

    if (album.selecao_confirmada) {
      return res.status(400).json({ success: false, message: 'Seleção já foi confirmada anteriormente' });
    }

    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: album.PK, SK: album.SK },
      UpdateExpression: 'SET selecao_confirmada = :c, selecao_confirmada_em = :t',
      ExpressionAttributeValues: {
        ':c': true,
        ':t': new Date().toISOString(),
      },
    }));

    // Get selected photos count
    const fotosResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'selecionada = :s',
      ExpressionAttributeValues: { ':pk': `ALBUM#${album.id}`, ':sk': 'FOTO#', ':s': true },
      Select: 'COUNT',
    }));

    res.json({
      success: true,
      data: {
        confirmada: true,
        selecao_confirmada_em: new Date().toISOString(),
        total_selecionadas: fotosResult.Count || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
