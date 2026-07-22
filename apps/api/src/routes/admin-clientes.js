const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router();
const TENANT = process.env.TENANT_ID || 'default';

// GET /api/admin/clientes
// Busca clientes de todas as origens:
//   1) TENANT#<tenant> / CLIENTE#<id>  (criados pelo admin)
//   2) CLIENT#<id> / PROFILE           (self-signup do cliente)
//   3) PHOTOGRAPHER#<id> / CLIENT#<id> (importação CSV)
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const photographerId = req.user?.sub || req.adminId;

    // Query 1: clientes criados pelo admin (padrão original)
    const adminClientsPromise = dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'CLIENTE#' },
    }));

    // Query 2: clientes que fizeram self-signup (PK=CLIENT#<id>, SK=PROFILE)
    // Usa Scan com filtro pois não há GSI que agrupe todos os CLIENT#/PROFILE
    const selfSignupPromise = dynamo.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'begins_with(PK, :pkPrefix) AND SK = :sk',
      ExpressionAttributeValues: { ':pkPrefix': 'CLIENT#', ':sk': 'PROFILE' },
    }));

    // Query 3: clientes importados via CSV (PK=PHOTOGRAPHER#<id>, SK=CLIENT#<id>)
    const importedClientsPromise = photographerId
      ? dynamo.send(new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: { ':pk': `PHOTOGRAPHER#${photographerId}`, ':sk': 'CLIENT#' },
        }))
      : Promise.resolve({ Items: [] });

    const [adminResult, selfSignupResult, importedResult] = await Promise.all([
      adminClientsPromise,
      selfSignupPromise,
      importedClientsPromise,
    ]);

    // Normalizar itens de cada origem para um formato consistente
    const adminItems = (adminResult.Items || []).map(item => ({
      ...item,
      _origem: 'admin',
    }));

    const selfSignupItems = (selfSignupResult.Items || []).map(item => ({
      ...item,
      id: item.PK.replace('CLIENT#', ''),
      nome: item.nome_completo || item.nome || '',
      telefone: item.telefone || '',
      _origem: 'signup',
    }));

    const importedItems = (importedResult.Items || []).map(item => ({
      ...item,
      id: item.id || item.SK.replace('CLIENT#', ''),
      _origem: 'import',
    }));

    // Deduplicar por email (prioridade: admin > signup > import)
    const seen = new Map();
    const allItems = [...adminItems, ...selfSignupItems, ...importedItems];
    for (const item of allItems) {
      const key = item.email?.toLowerCase() || item.id || item.SK;
      if (!seen.has(key)) {
        seen.set(key, item);
      }
    }
    let items = [...seen.values()];

    // Filtro de busca
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(c =>
        (c.nome || c.nome_completo || '').toLowerCase().includes(s) ||
        (c.email || '').toLowerCase().includes(s) ||
        (c.whatsapp_numero || c.telefone || '').includes(s)
      );
    }

    const total = items.length;
    const start = (Number(page) - 1) * Number(limit);
    const data = items.slice(start, start + Number(limit));

    res.json({ success: true, data, pagination: { page: Number(page), totalPages: Math.ceil(total / Number(limit)), totalItems: total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/clientes/:id
// Busca em todas as origens possíveis
router.get('/:id', async (req, res) => {
  try {
    const clienteId = req.params.id;
    const photographerId = req.user?.sub || req.adminId;

    // Tentar padrão 1: TENANT#<tenant> / CLIENTE#<id>
    const result1 = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `CLIENTE#${clienteId}` },
    }));
    if (result1.Item) return res.json({ success: true, data: result1.Item });

    // Tentar padrão 2: CLIENT#<id> / PROFILE (self-signup)
    const result2 = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `CLIENT#${clienteId}`, SK: 'PROFILE' },
    }));
    if (result2.Item) {
      const item = { ...result2.Item, id: clienteId, nome: result2.Item.nome_completo || result2.Item.nome };
      return res.json({ success: true, data: item });
    }

    // Tentar padrão 3: PHOTOGRAPHER#<id> / CLIENT#<id> (importação CSV)
    if (photographerId) {
      const result3 = await dynamo.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: `PHOTOGRAPHER#${photographerId}`, SK: `CLIENT#${clienteId}` },
      }));
      if (result3.Item) return res.json({ success: true, data: result3.Item });
    }

    return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Cliente não encontrado' });
  }
});

// POST /api/admin/clientes
router.post('/', async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const item = { ...req.body, id, PK: `TENANT#${TENANT}`, SK: `CLIENTE#${id}`, created: new Date().toISOString() };
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/clientes/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const keys = Object.keys(updates);
    if (keys.length === 0) return res.status(400).json({ success: false, message: 'Nenhum campo para atualizar' });

    const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
    const vals = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));

    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `CLIENTE#${req.params.id}` },
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

// DELETE /api/admin/clientes/:id
router.delete('/:id', async (req, res) => {
  try {
    await dynamo.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `CLIENTE#${req.params.id}` },
    }));
    res.json({ success: true, message: 'Cliente excluído' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
