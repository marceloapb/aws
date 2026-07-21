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

    // Map frontend status filter to DB values
    const STATUS_TO_DB = {
      draft: ['rascunho', 'solicitado', 'em_revisao', 'pronto_enviar'],
      sent: ['enviado'],
      accepted: ['aceito', 'aprovado', 'contrato_gerado'],
      rejected: ['recusado', 'cancelado'],
      expired: ['expirado'],
    };

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
      // Apply status filter directly on DynamoDB if it maps to a single value
      const dbStatuses = status ? (STATUS_TO_DB[status] || [status]) : null;
      if (dbStatuses && dbStatuses.length === 1) {
        params.FilterExpression = '#s = :status';
        params.ExpressionAttributeNames = { '#s': 'status' };
        params.ExpressionAttributeValues[':status'] = dbStatuses[0];
      }
      const result = await dynamo.send(new QueryCommand(params));
      items = result.Items || [];
      // Filter in-memory if multiple DB statuses map to one frontend status
      if (dbStatuses && dbStatuses.length > 1) {
        items = items.filter(o => dbStatuses.includes(o.status));
      }
    }
    if (status && cliente_id) {
      const dbStatuses = STATUS_TO_DB[status] || [status];
      items = items.filter(o => dbStatuses.includes(o.status));
    }

    const total = items.length;
    const start = (Number(page) - 1) * Number(limit);
    const pageItems = items.slice(start, start + Number(limit));

    // Resolve client names for items that don't have clientName
    const clienteIds = [...new Set(pageItems.filter(i => i.cliente_id && !i.clientName && !i.nome_completo && !i.cliente_nome).map(i => i.cliente_id))];
    const clienteNomes = {};
    for (const cid of clienteIds.slice(0, 20)) {
      try {
        const profileResult = await dynamo.send(new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND SK = :sk',
          ExpressionAttributeValues: { ':pk': `CLIENT#${cid}`, ':sk': 'PROFILE' },
        }));
        if (profileResult.Items?.[0]?.nome) {
          clienteNomes[cid] = profileResult.Items[0].nome;
        }
      } catch {}
    }

    const data = pageItems.map(item => ({
      ...item,
      clientName: item.clientName || item.nome_completo || item.cliente_nome || clienteNomes[item.cliente_id] || null,
      eventType: item.eventType || item.tipo_evento || item.nome_evento || null,
      eventDate: item.eventDate || item.data_evento || null,
      total: item.total || item.valor_total || 0,
      status: item.status === 'solicitado' ? 'draft'
        : item.status === 'rascunho' ? 'draft'
        : item.status === 'em_revisao' ? 'draft'
        : item.status === 'pronto_enviar' ? 'draft'
        : item.status === 'enviado' ? 'sent'
        : item.status === 'aceito' ? 'accepted'
        : item.status === 'aprovado' ? 'accepted'
        : item.status === 'recusado' ? 'rejected'
        : item.status === 'expirado' ? 'expired'
        : item.status === 'cancelado' ? 'rejected'
        : item.status === 'contrato_gerado' ? 'accepted'
        : (item.status || 'draft'),
      origem_canal: item.origem_canal || null,
    }));

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

    // Normalize: ensure 'cliente' object exists for OrcamentoDetalhe.jsx
    if (!orcamento.cliente && orcamento.cliente_id) {
      try {
        const profileResult = await dynamo.send(new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND SK = :sk',
          ExpressionAttributeValues: { ':pk': `CLIENTE#${orcamento.cliente_id}`, ':sk': 'PROFILE' },
        }));
        const profile = profileResult.Items?.[0];
        if (profile) {
          orcamento.cliente = {
            nome: profile.nome || profile.nome_completo || null,
            email: profile.email || null,
            telefone: profile.telefone || profile.celular || null,
          };
        }
      } catch {}
    }
    // Also try from PK pattern (CLIENTE#<id>)
    if (!orcamento.cliente && orcamento.PK && orcamento.PK.startsWith('CLIENTE#')) {
      const clienteId = orcamento.PK.replace('CLIENTE#', '');
      try {
        const profileResult = await dynamo.send(new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND SK = :sk',
          ExpressionAttributeValues: { ':pk': `CLIENTE#${clienteId}`, ':sk': 'PROFILE' },
        }));
        const profile = profileResult.Items?.[0];
        if (profile) {
          orcamento.cliente = {
            nome: profile.nome || profile.nome_completo || null,
            email: profile.email || null,
            telefone: profile.telefone || profile.celular || null,
          };
        }
      } catch {}
    }
    // Fallback: build cliente from flat fields
    if (!orcamento.cliente) {
      orcamento.cliente = {
        nome: orcamento.clientName || orcamento.nome_completo || orcamento.cliente_nome || null,
        email: orcamento.cliente_email || orcamento.email || null,
        telefone: orcamento.cliente_telefone || orcamento.telefone || null,
      };
    }

    // Normalize status: map legacy values so detail page can match
    if (orcamento.status === 'solicitado') {
      orcamento.status = 'rascunho';
    }
    if (orcamento.status === 'aprovado') {
      orcamento.status = 'aceito';
    }

    // Ensure opcoes is an array (detail page expects it)
    if (!orcamento.opcoes && orcamento.itens) {
      orcamento.opcoes = [{
        id: 'default',
        nome: 'Proposta',
        itens_snapshot: Array.isArray(orcamento.itens) ? orcamento.itens : [],
        desconto_tipo: orcamento.desconto_tipo || null,
        desconto_valor: orcamento.desconto_valor || 0,
      }];
    }

    // Ensure titulo exists
    if (!orcamento.titulo) {
      orcamento.titulo = orcamento.title || orcamento.nome_evento || orcamento.tipo_evento || null;
    }

    // Ensure valor_total exists
    if (!orcamento.valor_total) {
      orcamento.valor_total = orcamento.total || orcamento.valor || 0;
    }

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
      ExpressionAttributeValues: { ':s': 'aceito', ':a': new Date().toISOString() },
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
