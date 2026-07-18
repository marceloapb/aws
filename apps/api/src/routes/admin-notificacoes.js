// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-NOTIFICACOES.JS — Notificações e regras de notificação
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const crypto = require('crypto');
const { QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamo, TABLE } = require('../config/dynamodb');

const router = Router();
const TENANT = process.env.TENANT_ID || 'default';

// ─── NOTIFICAÇÕES IN-APP ─────────────────────────────────────

// GET / — listar notificações in-app (mais recentes primeiro)
router.get('/', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `TENANT#${TENANT}`,
        ':sk': 'NTF#',
      },
      ScanIndexForward: false,
      Limit: Number(limit),
    }));

    res.json({ success: true, data: result.Items || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /:id/lida — marcar notificação como lida
router.patch('/:id/lida', async (req, res) => {
  try {
    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `NTF#${req.params.id}` },
      UpdateExpression: 'SET lida = :true, lida_em = :now',
      ExpressionAttributeValues: { ':true': true, ':now': new Date().toISOString() },
      ReturnValues: 'ALL_NEW',
    }));

    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /marcar-todas-lidas — marcar todas notificações como lidas
router.post('/marcar-todas-lidas', async (req, res) => {
  try {
    // Buscar notificações não lidas
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'lida = :false',
      ExpressionAttributeValues: {
        ':pk': `TENANT#${TENANT}`,
        ':sk': 'NTF#',
        ':false': false,
      },
    }));

    const items = result.Items || [];
    if (items.length === 0) {
      return res.json({ success: true, data: { atualizadas: 0 } });
    }

    const now = new Date().toISOString();

    // Atualizar em lotes de 25 (limite DynamoDB BatchWrite)
    const batches = [];
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);
      const updates = batch.map(item =>
        dynamo.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: item.PK, SK: item.SK },
          UpdateExpression: 'SET lida = :true, lida_em = :now',
          ExpressionAttributeValues: { ':true': true, ':now': now },
        }))
      );
      batches.push(...updates);
    }

    await Promise.all(batches);

    res.json({ success: true, data: { atualizadas: items.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /nao-lidas/count — contar notificações não lidas
router.get('/nao-lidas/count', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'lida = :false',
      ExpressionAttributeValues: {
        ':pk': `TENANT#${TENANT}`,
        ':sk': 'NTF#',
        ':false': false,
      },
      Select: 'COUNT',
    }));

    res.json({ success: true, data: { count: result.Count || 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── REGRAS DE NOTIFICAÇÃO ───────────────────────────────────

// GET /regras — listar regras de notificação
router.get('/regras', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `TENANT#${TENANT}`,
        ':sk': 'REGRA_NTF#',
      },
    }));

    res.json({ success: true, data: result.Items || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /regras — criar regra de notificação
router.post('/regras', async (req, res) => {
  try {
    const { tipo_evento, tipos_evento, canais, destinatario, titulo_template, mensagem_template, email_destinatario, whatsapp_destinatario, whatsapp_template } = req.body;

    // Validações
    if (!tipo_evento && (!tipos_evento || tipos_evento.length === 0)) {
      return res.status(400).json({ success: false, message: 'tipo_evento é obrigatório' });
    }
    if (!canais || !Array.isArray(canais) || canais.length === 0) {
      return res.status(400).json({ success: false, message: 'canais deve ser um array não vazio' });
    }
    const canaisValidos = ['inapp', 'email', 'whatsapp'];
    const canaisInvalidos = canais.filter(c => !canaisValidos.includes(c));
    if (canaisInvalidos.length > 0) {
      return res.status(400).json({ success: false, message: `Canais inválidos: ${canaisInvalidos.join(', ')}. Válidos: ${canaisValidos.join(', ')}` });
    }
    const destinatariosValidos = ['admin', 'cliente', 'fotografo', 'todos'];
    if (destinatario && !destinatariosValidos.includes(destinatario)) {
      return res.status(400).json({ success: false, message: `destinatario inválido. Válidos: ${destinatariosValidos.join(', ')}` });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const item = {
      PK: `TENANT#${TENANT}`,
      SK: `REGRA_NTF#${id}`,
      id,
      tipo_evento: tipo_evento || tipos_evento[0],
      tipos_evento: tipos_evento || [tipo_evento],
      canais,
      destinatario: destinatario || 'admin',
      titulo_template: titulo_template || '',
      mensagem_template: mensagem_template || '',
      email_destinatario: email_destinatario || '',
      whatsapp_destinatario: whatsapp_destinatario || '',
      whatsapp_template: whatsapp_template || '',
      status: 'ativa',
      created: now,
      updated: now,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /regras/:id — atualizar regra de notificação
router.put('/regras/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated: new Date().toISOString() };
    delete updates.id;
    delete updates.PK;
    delete updates.SK;

    const keys = Object.keys(updates);
    if (keys.length === 0) return res.status(400).json({ success: false, message: 'Nenhum campo para atualizar' });

    const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
    const vals = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));

    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `REGRA_NTF#${req.params.id}` },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
      ReturnValues: 'ALL_NEW',
    }));

    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /regras/:id — excluir regra de notificação
router.delete('/regras/:id', async (req, res) => {
  try {
    await dynamo.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `REGRA_NTF#${req.params.id}` },
    }));
    res.json({ success: true, message: 'Regra excluída' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── LOG DE ENTREGA ──────────────────────────────────────────

// GET /log — audit log com filtros
router.get('/log', async (req, res) => {
  try {
    const { canal, status, tipo_evento, limit = 50, page = 1 } = req.query;

    let params;

    if (canal) {
      // Usar GSI1 para filtrar por canal
      params = {
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `TENANT#${TENANT}`,
          ':sk': `CANAL#${canal}#`,
        },
        ScanIndexForward: false,
      };
    } else {
      // Busca geral por LOG_NTF
      params = {
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `TENANT#${TENANT}`,
          ':sk': 'LOG_NTF#',
        },
        ScanIndexForward: false,
      };
    }

    // Filtros adicionais
    const filters = [];
    if (status) {
      filters.push('#status = :status');
      params.ExpressionAttributeNames = params.ExpressionAttributeNames || {};
      params.ExpressionAttributeNames['#status'] = 'status';
      params.ExpressionAttributeValues[':status'] = status;
    }
    if (tipo_evento) {
      filters.push('tipo_evento = :tipo_evento');
      params.ExpressionAttributeValues[':tipo_evento'] = tipo_evento;
    }
    if (filters.length > 0) {
      params.FilterExpression = filters.join(' AND ');
    }

    const result = await dynamo.send(new QueryCommand(params));

    let items = result.Items || [];
    const total = items.length;
    const start = (Number(page) - 1) * Number(limit);
    const data = items.slice(start, start + Number(limit));

    res.json({
      success: true,
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalItems: total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
