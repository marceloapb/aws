// ══════════════════════════════════════════════════════════════
// ADMIN CALENDAR RULES — Regras de notificação baseadas em datas
// Mounted at /admin/notificacoes/calendario
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const router = Router();
const TENANT = process.env.TENANT_ID || '1';

// GET /admin/notificacoes/calendario — Listar regras de calendário
router.get('/', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'CALENDAR_RULE#' },
    }));
    res.json({ success: true, data: result.Items || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /admin/notificacoes/calendario — Criar regra
router.post('/', async (req, res) => {
  try {
    const { nome, gatilho, momento, dias, canais, destinatario, mensagem, ativa } = req.body;

    if (!nome || !gatilho || !canais || canais.length === 0) {
      return res.status(400).json({ success: false, message: 'nome, gatilho e canais são obrigatórios' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const item = {
      PK: `TENANT#${TENANT}`,
      SK: `CALENDAR_RULE#${id}`,
      GSI1PK: `CALENDAR_RULE#${TENANT}`,
      GSI1SK: `${gatilho}#${momento}#${id}`,
      id,
      nome,
      gatilho,
      momento: momento || 'antes',
      dias: Number(dias) || 0,
      canais,
      destinatario: destinatario || 'cliente',
      mensagem: mensagem || '',
      ativa: ativa !== false,
      created_at: now,
      updated_at: now,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /admin/notificacoes/calendario/:id — Atualizar regra
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, gatilho, momento, dias, canais, destinatario, mensagem, ativa } = req.body;

    const item = {
      PK: `TENANT#${TENANT}`,
      SK: `CALENDAR_RULE#${id}`,
      GSI1PK: `CALENDAR_RULE#${TENANT}`,
      GSI1SK: `${gatilho || 'manual'}#${momento || 'antes'}#${id}`,
      id,
      nome,
      gatilho,
      momento: momento || 'antes',
      dias: Number(dias) || 0,
      canais: canais || [],
      destinatario: destinatario || 'cliente',
      mensagem: mensagem || '',
      ativa: ativa !== false,
      updated_at: new Date().toISOString(),
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /admin/notificacoes/calendario/:id — Remover regra
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dynamo.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `CALENDAR_RULE#${id}` },
    }));
    res.json({ success: true, message: 'Regra removida' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
