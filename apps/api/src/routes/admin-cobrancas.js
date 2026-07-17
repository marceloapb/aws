const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { criarCobranca, consultarCobranca, cancelarCobranca } = require('../adapters/index');

const router = Router();

async function findCobranca(id) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'COBRANCA', ':sk': `COBRANCA#${id}` },
  }));
  return result.Items?.[0] || null;
}

// GET /api/admin/cobrancas
router.get('/', async (req, res) => {
  try {
    const { status, cliente_id, gateway, page = 1, limit = 50 } = req.query;

    let items = [];
    const params = {
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'COBRANCA' },
    };

    const filters = [];
    const names = {};
    if (status) { filters.push('#s = :status'); names['#s'] = 'status'; params.ExpressionAttributeValues[':status'] = status; }
    if (cliente_id) { filters.push('cliente_id = :cid'); params.ExpressionAttributeValues[':cid'] = cliente_id; }
    if (gateway) { filters.push('gateway = :gw'); params.ExpressionAttributeValues[':gw'] = gateway; }
    if (filters.length > 0) {
      params.FilterExpression = filters.join(' AND ');
      if (Object.keys(names).length > 0) params.ExpressionAttributeNames = names;
    }

    const result = await dynamo.send(new QueryCommand(params));
    items = result.Items || [];

    const total = items.length;
    const start = (Number(page) - 1) * Number(limit);
    const data = items.slice(start, start + Number(limit));

    res.json({ success: true, data, pagination: { page: Number(page), totalPages: Math.ceil(total / Number(limit)), totalItems: total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/cobrancas
router.post('/', async (req, res) => {
  try {
    const dados = req.body;
    const gatewayResult = await criarCobranca(dados.gateway, dados);
    const id = crypto.randomUUID();
    const contratoId = dados.contrato_id || dados.cliente_id;
    const item = {
      id,
      PK: `CONTRATO#${contratoId}`, SK: `COBRANCA#${id}`,
      GSI1PK: 'COBRANCA', GSI1SK: `COBRANCA#${id}`,
      cliente_id: dados.cliente_id,
      orcamento_id: dados.orcamento_id || '',
      gateway: dados.gateway,
      gateway_id: gatewayResult.gateway_id,
      meio_pagamento: dados.meio_pagamento,
      valor: dados.valor,
      parcelas: dados.parcelas || 1,
      status: gatewayResult.status,
      descricao: dados.descricao,
      data_vencimento: dados.data_vencimento,
      link_pagamento: gatewayResult.link_pagamento,
      pix_copia_cola: gatewayResult.pix_copia_cola || '',
      pix_qr_code: gatewayResult.pix_qr_code || '',
      boleto_url: gatewayResult.boleto_url || '',
      created: new Date().toISOString(),
    };
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/admin/cobrancas/:id/consultar
router.get('/:id/consultar', async (req, res) => {
  try {
    const cobranca = await findCobranca(req.params.id);
    if (!cobranca) return res.status(404).json({ success: false, message: 'Cobrança não encontrada' });

    const gatewayResult = await consultarCobranca(cobranca.gateway, cobranca.gateway_id);

    if (gatewayResult.status !== cobranca.status) {
      await dynamo.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: cobranca.PK, SK: cobranca.SK },
        UpdateExpression: 'SET #s = :s, data_pagamento = :d',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': gatewayResult.status, ':d': gatewayResult.data_pagamento || '' },
      }));
    }

    res.json({ success: true, data: gatewayResult });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/cobrancas/:id/cancelar
router.post('/:id/cancelar', async (req, res) => {
  try {
    const cobranca = await findCobranca(req.params.id);
    if (!cobranca) return res.status(404).json({ success: false, message: 'Cobrança não encontrada' });

    await cancelarCobranca(cobranca.gateway, cobranca.gateway_id);
    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: cobranca.PK, SK: cobranca.SK },
      UpdateExpression: 'SET #s = :s',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'cancelado' },
    }));

    res.json({ success: true, message: 'Cobrança cancelada' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
