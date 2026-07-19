const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { getSignedDownloadUrl } = require('../services/s3Service');
const { ALBUM_STATUS } = require('../config/constants');

const router = Router();

async function assinarFotos(fotos) {
  return Promise.all(fotos.map(async (f) => {
    const key = f.s3_key_media || f.s3_key || f.url_media || '';
    const thumbKey = f.s3_key_thumb || f.url_thumb || '';
    return {
      ...f,
      url: key ? await getSignedDownloadUrl(key, 86400) : null,
      url_thumb: thumbKey ? await getSignedDownloadUrl(thumbKey, 86400) : (key ? await getSignedDownloadUrl(key, 86400) : null),
    };
  }));
}

router.get('/', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: '#s <> :excluido',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':pk': `CLIENTE#${req.clienteId}`, ':sk': 'ALBUM#', ':excluido': ALBUM_STATUS.PRONTO_EXCLUSAO },
    }));
    const items = (result.Items || []).sort((a, b) => (b.created || '').localeCompare(a.created || ''));
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Rota pública /publico/:slug — antes de /:id
router.get('/publico/:slug', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: '#s = :status AND slug = :slug',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':pk': 'ALBUM', ':status': ALBUM_STATUS.ATIVO, ':slug': req.params.slug },
    }));
    if (!result.Items || result.Items.length === 0) return res.status(404).json({ success: false, message: 'Álbum não encontrado ou expirado' });
    const album = result.Items[0];

    if (album.senha_acesso) {
      const { senha } = req.query;
      if (!senha || senha !== album.senha_acesso) {
        return res.json({ success: true, data: { id: album.id, titulo: album.titulo, requer_senha: true } });
      }
    }

    const fotosResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${album.id}`, ':sk': 'FOTO#' },
    }));
    const fotos = await assinarFotos((fotosResult.Items || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)));

    res.json({ success: true, data: { ...album, fotos } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: { ':pk': `CLIENTE#${req.clienteId}`, ':sk': `ALBUM#${req.params.id}` },
    }));
    if (!result.Items || result.Items.length === 0) return res.status(403).json({ success: false, message: 'Acesso negado' });
    const album = result.Items[0];

    if (album.status === ALBUM_STATUS.EXPIRADO && !album.protegido) return res.status(410).json({ success: false, message: 'Álbum expirado' });

    const fotosResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${album.id}`, ':sk': 'FOTO#' },
    }));
    const fotos = await assinarFotos((fotosResult.Items || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)));

    res.json({ success: true, data: { ...album, fotos } });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Álbum não encontrado' });
  }
});

module.exports = router;
