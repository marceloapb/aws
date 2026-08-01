const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { assinarContrato } = require('../services/contratoService');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `CLIENTE#${req.clienteId}`, ':sk': 'CONTRATO#' },
    }));
    const items = (result.Items || []).sort((a, b) => (b.created || '').localeCompare(a.created || ''));
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:token', async (req, res) => {
  try {
    const clienteId = req.clienteId || req.user?.sub;
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: 'token_assinatura = :token',
      ExpressionAttributeValues: { ':pk': 'CONTRATO', ':token': req.params.token },
    }));
    if (!result.Items || result.Items.length === 0) return res.status(404).json({ success: false, message: 'Contrato não encontrado' });
    // Verify ownership
    const contrato = result.Items[0];
    if (contrato.cliente_id && contrato.cliente_id !== clienteId) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }
    res.json({ success: true, data: contrato });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:token/assinar', async (req, res) => {
  try {
    const resultado = await assinarContrato(req.params.token, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      hash: req.body.hash || '',
      nome_digitado: req.body.nome_digitado || '',
      aceite_termos: req.body.aceite_termos || false,
    });
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
