const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, UpdateCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `CLIENTE#${req.clienteId}`, ':sk': 'ORCAMENTO#' },
    }));
    const items = (result.Items || []).sort((a, b) => (b.created || '').localeCompare(a.created || ''));
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:token', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: 'token_acesso = :token',
      ExpressionAttributeValues: { ':pk': 'ORCAMENTO', ':token': req.params.token },
    }));
    if (!result.Items || result.Items.length === 0) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
    res.json({ success: true, data: result.Items[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /client/orcamentos - Solicitar novo orçamento
router.post('/', async (req, res) => {
  try {
    const { tipo_evento, data_evento, local, observacoes } = req.body;
    if (!tipo_evento) return res.status(400).json({ success: false, message: 'Tipo de evento é obrigatório' });

    const id = require('crypto').randomUUID();
    const clienteId = req.clienteId;
    const item = {
      id,
      tipo_evento,
      data_evento: data_evento || null,
      local: local || null,
      observacoes: observacoes || null,
      status: 'solicitado',
      origem: 'portal_cliente',
      PK: `CLIENTE#${clienteId}`,
      SK: `ORCAMENTO#${id}`,
      GSI1PK: 'ORCAMENTO',
      GSI1SK: `ORCAMENTO#${id}`,
      created: new Date().toISOString(),
      cliente_id: clienteId,
    };
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/aprovar', async (req, res) => {
  try {
    // Verificar ownership
    const check = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: { ':pk': `CLIENTE#${req.clienteId}`, ':sk': `ORCAMENTO#${req.params.id}` },
    }));
    if (!check.Items || check.Items.length === 0) return res.status(403).json({ success: false, message: 'Acesso negado' });
    const orcamento = check.Items[0];
    if (orcamento.status !== 'enviado') return res.status(400).json({ success: false, message: 'Orçamento não pode ser aprovado neste status' });

    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: orcamento.PK, SK: orcamento.SK },
      UpdateExpression: 'SET #s = :s, aprovado_em = :a',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'aprovado', ':a': new Date().toISOString() },
    }));
    res.json({ success: true, message: 'Orçamento aprovado' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
