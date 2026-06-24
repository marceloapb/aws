import { Router } from 'express';
import { dynamo, TABLE } from '../config/dynamodb.js';
import { QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { deleteAlbumFolder } from '../services/s3Service.js';
import { ALBUM_STATUS } from '../config/constants.js';

const router = Router();

// GET /api/admin/albuns
router.get('/', async (req, res) => {
  try {
    const { status, cliente_id, page = 1, limit = 50 } = req.query;

    let items = [];
    if (cliente_id) {
      const result = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `CLIENTE#${cliente_id}`, ':sk': 'ALBUM#' },
      }));
      items = result.Items || [];
    } else {
      // GSI1: query por status
      const params = {
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'ALBUM' },
      };
      if (status) {
        params.FilterExpression = '#s = :status';
        params.ExpressionAttributeNames = { '#s': 'status' };
        params.ExpressionAttributeValues[':status'] = status;
      }
      const result = await dynamo.send(new QueryCommand(params));
      items = result.Items || [];
    }

    if (status && cliente_id) items = items.filter(a => a.status === status);

    const total = items.length;
    const start = (Number(page) - 1) * Number(limit);
    const data = items.slice(start, start + Number(limit));

    res.json({ success: true, data, pagination: { page: Number(page), totalPages: Math.ceil(total / Number(limit)), totalItems: total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/albuns/:id
router.get('/:id', async (req, res) => {
  try {
    // Album PK=CLIENTE#<clienteId> SK=ALBUM#<id> — busca via GSI ou scan
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'ALBUM', ':sk': `ALBUM#${req.params.id}` },
    }));
    if (!result.Items || result.Items.length === 0) return res.status(404).json({ success: false, message: 'Álbum não encontrado' });
    const album = result.Items[0];

    const fotosResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${album.id}`, ':sk': 'FOTO#' },
    }));
    const fotos = (fotosResult.Items || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    res.json({ success: true, data: { ...album, fotos } });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Álbum não encontrado' });
  }
});

// POST /api/admin/albuns
router.post('/', async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + 30);
    const clienteId = req.body.cliente_id;

    const item = {
      ...req.body,
      id,
      PK: `CLIENTE#${clienteId}`,
      SK: `ALBUM#${id}`,
      GSI1PK: 'ALBUM',
      GSI1SK: `ALBUM#${id}`,
      status: ALBUM_STATUS.ATIVO,
      data_expiracao: dataExpiracao.toISOString().split('T')[0],
      created: new Date().toISOString(),
    };
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/albuns/:id
router.put('/:id', async (req, res) => {
  try {
    // Buscar PK atual via GSI
    const found = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'ALBUM', ':sk': `ALBUM#${req.params.id}` },
    }));
    if (!found.Items || found.Items.length === 0) return res.status(404).json({ success: false, message: 'Álbum não encontrado' });
    const album = found.Items[0];

    const updates = req.body;
    const keys = Object.keys(updates);
    const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
    const vals = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));
    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: album.PK, SK: album.SK },
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

// DELETE /api/admin/albuns/:id
router.delete('/:id', async (req, res) => {
  try {
    const found = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'ALBUM', ':sk': `ALBUM#${req.params.id}` },
    }));
    if (!found.Items || found.Items.length === 0) return res.status(404).json({ success: false, message: 'Álbum não encontrado' });
    const album = found.Items[0];

    await deleteAlbumFolder(req.params.id);

    const fotos = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${req.params.id}`, ':sk': 'FOTO#' },
    }));
    for (const foto of (fotos.Items || [])) {
      await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { PK: foto.PK, SK: foto.SK } }));
    }

    await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { PK: album.PK, SK: album.SK } }));
    res.json({ success: true, message: 'Álbum excluído' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
