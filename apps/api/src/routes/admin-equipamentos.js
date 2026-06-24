import { Router } from 'express';
import { dynamo, TABLE } from '../config/dynamodb.js';
import { QueryCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const router = Router();
const TENANT = process.env.TENANT_ID || 'default';

// GET /api/admin/equipamentos
router.get('/', async (req, res) => {
  try {
    const { status, categoria, page = 1, limit = 50 } = req.query;

    const params = {
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'EQUIP#' },
    };
    const filters = [];
    const names = {};
    if (status) { filters.push('#s = :status'); names['#s'] = 'status'; params.ExpressionAttributeValues[':status'] = status; }
    if (categoria) { filters.push('categoria = :cat'); params.ExpressionAttributeValues[':cat'] = categoria; }
    if (filters.length > 0) {
      params.FilterExpression = filters.join(' AND ');
      if (Object.keys(names).length > 0) params.ExpressionAttributeNames = names;
    }

    const result = await dynamo.send(new QueryCommand(params));
    const items = (result.Items || []).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    const total = items.length;
    const start = (Number(page) - 1) * Number(limit);
    const data = items.slice(start, start + Number(limit));

    res.json({ success: true, data, pagination: { page: Number(page), totalPages: Math.ceil(total / Number(limit)), totalItems: total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/equipamentos
router.post('/', async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const item = { ...req.body, id, PK: `TENANT#${TENANT}`, SK: `EQUIP#${id}`, created: new Date().toISOString() };
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/equipamentos/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const keys = Object.keys(updates);
    const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
    const vals = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));
    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `EQUIP#${req.params.id}` },
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

// DELETE /api/admin/equipamentos/:id
router.delete('/:id', async (req, res) => {
  try {
    await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { PK: `TENANT#${TENANT}`, SK: `EQUIP#${req.params.id}` } }));
    res.json({ success: true, message: 'Equipamento excluído' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
