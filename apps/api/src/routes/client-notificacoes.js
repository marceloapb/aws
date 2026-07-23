// ══════════════════════════════════════════════════════════════
// ROUTES/CLIENT-NOTIFICACOES.JS — Preferencias de notificacao do cliente
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { GetCommand, PutCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamo, TABLE } = require('../config/dynamodb');

const router = Router();
const TENANT = process.env.TENANT_ID || 'default';

// ─── GET /preferencias — Obter preferencias de notificacao do cliente ────────
router.get('/preferencias', async (req, res) => {
  try {
    const clienteId = req.clienteId;

    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: {
        PK: `TENANT#${TENANT}`,
        SK: `CLIENTE_NTF_PREF#${clienteId}`,
      },
    }));

    if (result.Item) {
      return res.json({ success: true, data: result.Item });
    }

    // Retornar defaults se nao existe preferencia salva
    const defaults = getDefaultPreferencias();
    res.json({ success: true, data: { preferencias: defaults } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT /preferencias — Salvar preferencias de notificacao do cliente ───────
router.put('/preferencias', async (req, res) => {
  try {
    const clienteId = req.clienteId;
    const { preferencias } = req.body;

    if (!preferencias || typeof preferencias !== 'object') {
      return res.status(400).json({ success: false, message: 'preferencias e obrigatorio e deve ser um objeto' });
    }

    // Validar estrutura das preferencias
    const canaisValidos = ['inapp', 'email', 'whatsapp'];
    for (const [evento, canais] of Object.entries(preferencias)) {
      if (typeof canais !== 'object') {
        return res.status(400).json({ success: false, message: `Preferencia para ${evento} deve ser um objeto` });
      }
      for (const canal of Object.keys(canais)) {
        if (!canaisValidos.includes(canal)) {
          return res.status(400).json({ success: false, message: `Canal invalido: ${canal}. Validos: ${canaisValidos.join(', ')}` });
        }
        if (typeof canais[canal] !== 'boolean') {
          return res.status(400).json({ success: false, message: `Valor do canal ${canal} deve ser boolean` });
        }
      }
    }

    const now = new Date().toISOString();

    const item = {
      PK: `TENANT#${TENANT}`,
      SK: `CLIENTE_NTF_PREF#${clienteId}`,
      GSI1PK: `TENANT#${TENANT}`,
      GSI1SK: `CLIENTE_NTF_PREF#${clienteId}`,
      cliente_id: clienteId,
      preferencias,
      updated: now,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

    res.json({ success: true, data: item, message: 'Preferencias salvas com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET / — Listar notificacoes in-app do cliente ───────────────────────────
router.get('/', async (req, res) => {
  try {
    const clienteId = req.clienteId;
    const { limit = 30 } = req.query;

    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'destinatario_id = :clienteId OR destinatario = :dest',
      ExpressionAttributeValues: {
        ':pk': `TENANT#${TENANT}`,
        ':sk': 'NTF#',
        ':clienteId': clienteId,
        ':dest': 'cliente',
      },
      ScanIndexForward: false,
      Limit: Number(limit),
    }));

    res.json({ success: true, data: result.Items || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PATCH /:id/lida — Marcar notificacao como lida ──────────────────────────
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

// ─── GET /nao-lidas/count — Contar notificacoes nao lidas do cliente ─────────
router.get('/nao-lidas/count', async (req, res) => {
  try {
    const clienteId = req.clienteId;

    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'lida = :false AND (destinatario_id = :clienteId OR destinatario = :dest)',
      ExpressionAttributeValues: {
        ':pk': `TENANT#${TENANT}`,
        ':sk': 'NTF#',
        ':false': false,
        ':clienteId': clienteId,
        ':dest': 'cliente',
      },
      Select: 'COUNT',
    }));

    res.json({ success: true, data: { count: result.Count || 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDefaultPreferencias() {
  const eventos = [
    'orcamento.enviado',
    'orcamento.aceito',
    'contrato.enviado',
    'contrato.assinado',
    'pagamento.confirmado',
    'pagamento.vencido',
    'evento.confirmado',
    'evento.proximo',
    'album.publicado',
    'mensagem.recebida',
  ];

  const prefs = {};
  eventos.forEach(evento => {
    prefs[evento] = { inapp: true, email: false, whatsapp: false };
  });
  return prefs;
}

module.exports = router;
