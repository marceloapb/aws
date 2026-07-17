const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router();

async function findOrcamento(id) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'ORCAMENTO', ':sk': `ORCAMENTO#${id}` },
  }));
  return result.Items?.[0] || null;
}

// GET /api/admin/orcamentos
router.get('/', async (req, res) => {
  try {
    const { status, cliente_id, page = 1, limit = 50 } = req.query;

    let items = [];
    if (cliente_id) {
      const result = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `CLIENTE#${cliente_id}`, ':sk': 'ORCAMENTO#' },
      }));
      items = result.Items || [];
    } else {
      const params = {
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'ORCAMENTO' },
      };
      if (status) {
        params.FilterExpression = '#s = :status';
        params.ExpressionAttributeNames = { '#s': 'status' };
        params.ExpressionAttributeValues[':status'] = status;
      }
      const result = await dynamo.send(new QueryCommand(params));
      items = result.Items || [];
    }
    if (status && cliente_id) items = items.filter(o => o.status === status);

    const total = items.length;
    const start = (Number(page) - 1) * Number(limit);
    const data = items.slice(start, start + Number(limit));

    res.json({ success: true, data, pagination: { page: Number(page), totalPages: Math.ceil(total / Number(limit)), totalItems: total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/orcamentos/:id
router.get('/:id', async (req, res) => {
  try {
    const orcamento = await findOrcamento(req.params.id);
    if (!orcamento) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
    res.json({ success: true, data: orcamento });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
  }
});

// POST /api/admin/orcamentos
router.post('/', async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const clienteId = req.body.cliente_id;
    const item = {
      ...req.body, id, status: 'rascunho',
      PK: `CLIENTE#${clienteId}`, SK: `ORCAMENTO#${id}`,
      GSI1PK: 'ORCAMENTO', GSI1SK: `ORCAMENTO#${id}`,
      created: new Date().toISOString(),
    };
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/orcamentos/:id
router.put('/:id', async (req, res) => {
  try {
    const orc = await findOrcamento(req.params.id);
    if (!orc) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });

    const updates = req.body;
    const keys = Object.keys(updates);
    const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
    const vals = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));
    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: orc.PK, SK: orc.SK },
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

// POST /api/admin/orcamentos/:id/enviar
router.post('/:id/enviar', async (req, res) => {
  try {
    const orc = await findOrcamento(req.params.id);
    if (!orc) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: orc.PK, SK: orc.SK },
      UpdateExpression: 'SET #s = :s, enviado_em = :e',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'enviado', ':e': new Date().toISOString() },
      ReturnValues: 'ALL_NEW',
    }));
    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/orcamentos/:id/aprovar
router.post('/:id/aprovar', async (req, res) => {
  try {
    const orc = await findOrcamento(req.params.id);
    if (!orc) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: orc.PK, SK: orc.SK },
      UpdateExpression: 'SET #s = :s, aprovado_em = :a',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'aprovado', ':a': new Date().toISOString() },
      ReturnValues: 'ALL_NEW',
    }));
    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/orcamentos/:id
router.delete('/:id', async (req, res) => {
  try {
    const orc = await findOrcamento(req.params.id);
    if (!orc) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
    await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { PK: orc.PK, SK: orc.SK } }));
    res.json({ success: true, message: 'Orçamento excluído' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
