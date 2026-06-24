import { Router } from 'express';
import { dynamo, TABLE } from '../config/dynamodb.js';
import { QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { criarEvento, atualizarEvento, excluirEvento } from '../services/googleCalendarService.js';
import { features } from '../config/env.js';
import { SYNC_STATUS } from '../config/constants.js';

const router = Router();
const TENANT = process.env.TENANT_ID || 'default';

async function findEvento(id) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'AGENDA', ':sk': `AGENDA#${id}` },
  }));
  return result.Items?.[0] || null;
}

async function getCliente(clienteId) {
  if (!clienteId) return null;
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'CLIENTE', ':sk': `CLIENTE#${clienteId}` },
  }));
  return result.Items?.[0] || null;
}

// GET /api/admin/agenda
router.get('/', async (req, res) => {
  try {
    const { data_inicio, data_fim, status, tipo_evento, page = 1, limit = 50 } = req.query;

    const params = {
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'AGENDA#' },
    };

    const filters = [];
    const names = {};
    if (data_inicio) { filters.push('data_evento >= :di'); params.ExpressionAttributeValues[':di'] = data_inicio; }
    if (data_fim) { filters.push('data_evento <= :df'); params.ExpressionAttributeValues[':df'] = data_fim; }
    if (status) { filters.push('#s = :status'); names['#s'] = 'status'; params.ExpressionAttributeValues[':status'] = status; }
    if (tipo_evento) { filters.push('tipo_evento = :te'); params.ExpressionAttributeValues[':te'] = tipo_evento; }
    if (filters.length > 0) {
      params.FilterExpression = filters.join(' AND ');
      if (Object.keys(names).length > 0) params.ExpressionAttributeNames = names;
    }

    const result = await dynamo.send(new QueryCommand(params));
    const items = (result.Items || []).sort((a, b) =>
      (a.data_evento + (a.horario_inicio || '')).localeCompare(b.data_evento + (b.horario_inicio || ''))
    );

    const total = items.length;
    const start = (Number(page) - 1) * Number(limit);
    const data = items.slice(start, start + Number(limit));

    res.json({ success: true, data, pagination: { page: Number(page), totalPages: Math.ceil(total / Number(limit)), totalItems: total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/agenda/:id
router.get('/:id', async (req, res) => {
  try {
    const evento = await findEvento(req.params.id);
    if (!evento) return res.status(404).json({ success: false, message: 'Evento não encontrado' });
    res.json({ success: true, data: evento });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Evento não encontrado' });
  }
});

// POST /api/admin/agenda
router.post('/', async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const dados = req.body;
    const item = {
      ...dados, id,
      PK: `TENANT#${TENANT}`, SK: `AGENDA#${dados.data_evento || ''}#${id}`,
      GSI1PK: 'AGENDA', GSI1SK: `AGENDA#${id}`,
      sync_status: SYNC_STATUS.PENDENTE,
      created: new Date().toISOString(),
    };
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

    if (features.googleCalendar) {
      try {
        const cliente = await getCliente(dados.cliente_id);
        const googleEvent = await criarEvento({ ...dados, cliente_nome: cliente?.nome, cliente_telefone: cliente?.whatsapp_numero });
        await dynamo.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: item.PK, SK: item.SK },
          UpdateExpression: 'SET google_event_id = :g, sync_status = :s',
          ExpressionAttributeValues: { ':g': googleEvent.id, ':s': SYNC_STATUS.SINCRONIZADO },
        }));
        item.google_event_id = googleEvent.id;
        item.sync_status = SYNC_STATUS.SINCRONIZADO;
      } catch (syncError) {
        console.error('[AGENDA] Erro sync Google Calendar:', syncError.message);
        await dynamo.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: item.PK, SK: item.SK },
          UpdateExpression: 'SET sync_status = :s, erro = :e',
          ExpressionAttributeValues: { ':s': SYNC_STATUS.ERRO, ':e': syncError.message },
        }));
      }
    }

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/agenda/:id
router.put('/:id', async (req, res) => {
  try {
    const evento = await findEvento(req.params.id);
    if (!evento) return res.status(404).json({ success: false, message: 'Evento não encontrado' });
    const dados = req.body;

    const updates = { ...dados, sync_status: SYNC_STATUS.PENDENTE };
    const keys = Object.keys(updates);
    const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
    const vals = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));
    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: evento.PK, SK: evento.SK },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
      ReturnValues: 'ALL_NEW',
    }));

    if (features.googleCalendar && evento.google_event_id) {
      try {
        const cliente = await getCliente(evento.cliente_id);
        await atualizarEvento(evento.google_event_id, { ...dados, cliente_nome: cliente?.nome, cliente_telefone: cliente?.whatsapp_numero });
        await dynamo.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: evento.PK, SK: evento.SK },
          UpdateExpression: 'SET sync_status = :s',
          ExpressionAttributeValues: { ':s': SYNC_STATUS.SINCRONIZADO },
        }));
      } catch (syncError) {
        console.error('[AGENDA] Erro sync update:', syncError.message);
      }
    }

    res.json({ success: true, data: result.Attributes });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/agenda/:id
router.delete('/:id', async (req, res) => {
  try {
    const evento = await findEvento(req.params.id);
    if (!evento) return res.status(404).json({ success: false, message: 'Evento não encontrado' });

    if (features.googleCalendar && evento.google_event_id) {
      try { await excluirEvento(evento.google_event_id); } catch (e) { console.error('[AGENDA] Erro ao excluir do Google:', e.message); }
    }

    await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { PK: evento.PK, SK: evento.SK } }));
    res.json({ success: true, message: 'Evento excluído' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
