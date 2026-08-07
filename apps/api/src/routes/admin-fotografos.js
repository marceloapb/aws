const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { stripReservedFields } = require('../middlewares/validateFields');

const router = Router();
const TENANT = process.env.TENANT_ID || '1';

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
router.post('/', stripReservedFields, async (req, res) => {
  try {
    const { nome, email, telefone, whatsapp, especialidade, comissao, ativo, observacoes } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ success: false, message: 'nome é obrigatório' });
    }
    const id = crypto.randomUUID();
    const item = { nome: nome.trim(), email, telefone, whatsapp, especialidade, comissao, ativo, observacoes, id, PK: `TENANT#${TENANT}`, SK: `FOTOGRAFO#${id}`, created: new Date().toISOString() };
    // Remove campos undefined
    Object.keys(item).forEach(k => item[k] === undefined && delete item[k]);
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/fotografos/:id
router.put('/:id', stripReservedFields, async (req, res) => {
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

module.exports = router;
