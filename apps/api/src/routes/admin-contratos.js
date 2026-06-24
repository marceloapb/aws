import { Router } from 'express';
import { dynamo, TABLE } from '../config/dynamodb.js';
import { QueryCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { gerarContrato, enviarParaAssinatura } from '../services/contratoService.js';

const router = Router();

// GET /api/admin/contratos
router.get('/', async (req, res) => {
  try {
    const { status, cliente_id, page = 1, limit = 50 } = req.query;

    let items = [];
    if (cliente_id) {
      const result = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `CLIENTE#${cliente_id}`, ':sk': 'CONTRATO#' },
      }));
      items = result.Items || [];
    } else {
      const params = {
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'CONTRATO' },
      };
      if (status) {
        params.FilterExpression = '#s = :status';
        params.ExpressionAttributeNames = { '#s': 'status' };
        params.ExpressionAttributeValues[':status'] = status;
      }
      const result = await dynamo.send(new QueryCommand(params));
      items = result.Items || [];
    }
    if (status && cliente_id) items = items.filter(c => c.status === status);

    const total = items.length;
    const start = (Number(page) - 1) * Number(limit);
    const data = items.slice(start, start + Number(limit));

    res.json({ success: true, data, pagination: { page: Number(page), totalPages: Math.ceil(total / Number(limit)), totalItems: total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/contratos/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'CONTRATO', ':sk': `CONTRATO#${req.params.id}` },
    }));
    if (!result.Items || result.Items.length === 0) return res.status(404).json({ success: false, message: 'Contrato não encontrado' });
    res.json({ success: true, data: result.Items[0] });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Contrato não encontrado' });
  }
});

// POST /api/admin/contratos/gerar
router.post('/gerar', async (req, res) => {
  try {
    const { orcamento_id } = req.body;
    if (!orcamento_id) return res.status(400).json({ success: false, message: 'orcamento_id é obrigatório' });
    const contrato = await gerarContrato(orcamento_id);
    res.status(201).json({ success: true, data: contrato });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/contratos/:id/enviar
router.post('/:id/enviar', async (req, res) => {
  try {
    const resultado = await enviarParaAssinatura(req.params.id);
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/contratos/:id
router.put('/:id', async (req, res) => {
  try {
    const found = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'CONTRATO', ':sk': `CONTRATO#${req.params.id}` },
    }));
    if (!found.Items || found.Items.length === 0) return res.status(404).json({ success: false, message: 'Contrato não encontrado' });
    const contrato = found.Items[0];

    const updates = req.body;
    const keys = Object.keys(updates);
    const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
    const vals = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));
    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: contrato.PK, SK: contrato.SK },
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

export default router;
