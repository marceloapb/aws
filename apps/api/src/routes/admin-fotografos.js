import { Router } from 'express';
import { dynamo, TABLE } from '../config/dynamodb.js';
import { QueryCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const router = Router();
const TENANT = process.env.TENANT_ID || 'default';

// GET /api/admin/fotografos
router.get('/', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'FOTOGRAFO#' },
    }));
    const items = (result.Items || []).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/fotografos
router.post('/', async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const item = { ...req.body, id, PK: `TENANT#${TENANT}`, SK: `FOTOGRAFO#${id}`, created: new Date().toISOString() };
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/fotografos/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const keys = Object.keys(updates);
    const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
    const vals = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));
    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `FOTOGRAFO#${req.params.id}` },
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

// DELETE /api/admin/fotografos/:id
router.delete('/:id', async (req, res) => {
  try {
    await dynamo.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `FOTOGRAFO#${req.params.id}` },
    }));
    res.json({ success: true, message: 'Fotógrafo excluído' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
