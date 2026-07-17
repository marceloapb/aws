const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { publicarCarrossel, publicarFotoUnica } = require('../services/instagramService');
const { INSTAGRAM_STATUS } = require('../config/constants');

const router = Router();

// GET /api/admin/instagram
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    const params = {
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'INSTAGRAM' },
    };
    if (status) {
      params.FilterExpression = '#s = :status';
      params.ExpressionAttributeNames = { '#s': 'status' };
      params.ExpressionAttributeValues[':status'] = status;
    }

    const result = await dynamo.send(new QueryCommand(params));
    const items = result.Items || [];
    const total = items.length;
    const start = (Number(page) - 1) * Number(limit);
    const data = items.slice(start, start + Number(limit));

    res.json({ success: true, data, pagination: { page: Number(page), totalPages: Math.ceil(total / Number(limit)), totalItems: total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/instagram
router.post('/', async (req, res) => {
  try {
    const { fotos_ids, caption, agendado_para, album_id } = req.body;
    if (!fotos_ids || fotos_ids.length === 0) return res.status(400).json({ success: false, message: 'Selecione pelo menos 1 foto' });
    if (fotos_ids.length > 10) return res.status(400).json({ success: false, message: 'Máximo 10 fotos por carrossel' });

    const id = crypto.randomUUID();
    const item = {
      id, fotos_ids,
      PK: `INSTAGRAM#${id}`, SK: `INSTAGRAM#${id}`,
      GSI1PK: 'INSTAGRAM', GSI1SK: `INSTAGRAM#${agendado_para || new Date().toISOString()}`,
      caption: caption || '',
      agendado_para: agendado_para || new Date().toISOString(),
      album_id: album_id || '',
      status: INSTAGRAM_STATUS.AGENDADO,
      created: new Date().toISOString(),
    };
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/instagram/:id/publicar-agora
router.post('/:id/publicar-agora', async (req, res) => {
  try {
    const pubResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: { ':pk': 'INSTAGRAM', ':id': req.params.id },
    }));
    const pub = pubResult.Items?.[0];
    if (!pub) return res.status(404).json({ success: false, message: 'Publicação não encontrada' });

    // Buscar fotos
    const fotosResults = await Promise.all(pub.fotos_ids.map(fid =>
      dynamo.send(new QueryCommand({
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
        ExpressionAttributeValues: { ':pk': 'FOTO', ':sk': `FOTO#${fid}` },
      }))
    ));
    const fotosKeys = fotosResults.flatMap(r => (r.Items || []).map(f => f.s3_key));

    let resultado;
    if (fotosKeys.length === 1) {
      resultado = await publicarFotoUnica(fotosKeys[0], pub.caption || '');
    } else {
      resultado = await publicarCarrossel(fotosKeys, pub.caption || '');
    }

    if (resultado.success) {
      await dynamo.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: pub.PK, SK: pub.SK },
        UpdateExpression: 'SET #s = :s, publicado_em = :pe, instagram_post_id = :pi, instagram_permalink = :pp',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
          ':s': INSTAGRAM_STATUS.PUBLICADO,
          ':pe': new Date().toISOString(),
          ':pi': resultado.instagram_post_id,
          ':pp': resultado.instagram_permalink,
        },
      }));
      res.json({ success: true, data: resultado });
    } else {
      throw new Error(resultado.error);
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/instagram/:id
router.delete('/:id', async (req, res) => {
  try {
    await dynamo.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `INSTAGRAM#${req.params.id}`, SK: `INSTAGRAM#${req.params.id}` },
    }));
    res.json({ success: true, message: 'Publicação cancelada' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
