const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: 'cliente_id = :cid',
      ExpressionAttributeValues: { ':pk': 'COBRANCA', ':cid': req.clienteId },
    }));
    const items = (result.Items || []).sort((a, b) => (b.created || '').localeCompare(a.created || ''));
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'COBRANCA', ':sk': `COBRANCA#${req.params.id}` },
    }));
    if (!result.Items || result.Items.length === 0) return res.status(404).json({ success: false, message: 'Cobrança não encontrada' });
    const cobranca = result.Items[0];
    if (cobranca.cliente_id !== req.clienteId) return res.status(403).json({ success: false, message: 'Acesso negado' });
    res.json({ success: true, data: cobranca });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Cobrança não encontrada' });
  }
});

module.exports = router;
