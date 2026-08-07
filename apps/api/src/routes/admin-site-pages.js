// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-SITE-PAGES.JS — CRUD de páginas do site (Site Builder)
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { randomUUID } = require('crypto');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, GetCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { slugify } = require('../utils/slugify');

const router = Router();
const TENANT = process.env.TENANT_ID || 'default';

// ─── Helpers ────────────────────────────────────────────────

function padOrdem(ordem) {
  return String(ordem).padStart(3, '0');
}

async function checkSlugExists(slug, excludeId = null) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `TENANT#${TENANT}`,
      ':sk': 'SITE_PAGE#',
    },
  }));

  return (result.Items || []).some(
    (item) => item.slug === slug && item.id !== excludeId
  );
}

async function generateUniqueSlug(titulo, excludeId = null) {
  let baseSlug = slugify(titulo);
  if (!baseSlug) baseSlug = 'pagina';

  let slug = baseSlug;
  let counter = 1;

  while (await checkSlugExists(slug, excludeId)) {
    counter++;
    slug = `${baseSlug}-${counter}`.slice(0, 80);
  }

  return slug;
}

// ─── PUT /reorder — Reordenar páginas em lote ───────────────

router.put('/reorder', async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items deve ser um array com {id, ordem}' });
    }

    const now = new Date().toISOString();
    const updates = [];

    for (const item of items) {
      if (!item.id || typeof item.ordem !== 'number') {
        return res.status(400).json({ success: false, message: 'Cada item deve ter id e ordem (number)' });
      }

      // Fetch existing page
      const existing = await dynamo.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: `TENANT#${TENANT}`, SK: `SITE_PAGE#${item.id}` },
      }));

      if (!existing.Item) {
        return res.status(404).json({ success: false, message: `Página ${item.id} não encontrada` });
      }

      const updated = {
        ...existing.Item,
        ordem: item.ordem,
        GSI1PK: 'SITE_PAGES',
        GSI1SK: `ORDER#${padOrdem(item.ordem)}`,
        updated_at: now,
      };

      await dynamo.send(new PutCommand({ TableName: TABLE, Item: updated }));
      updates.push({ id: item.id, ordem: item.ordem });
    }

    res.json({ success: true, data: updates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET / — Listar todas as páginas (ordenadas por ordem) ──

router.get('/', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': 'SITE_PAGES',
        ':sk': 'ORDER#',
      },
    }));

    const pages = (result.Items || []).map((item) => ({
      id: item.id,
      titulo: item.titulo,
      slug: item.slug,
      ordem: item.ordem,
      visivel: item.visivel,
      is_home: item.is_home,
      seo_titulo: item.seo_titulo,
      seo_descricao: item.seo_descricao,
      blocos_count: (item.blocos || []).length,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    res.json({ success: true, data: pages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST / — Criar nova página ─────────────────────────────

router.post('/', async (req, res) => {
  try {
    const { titulo, ordem, visivel, blocos, seo_titulo, seo_descricao, is_home } = req.body;

    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ success: false, message: 'titulo é obrigatório' });
    }
    if (titulo.length > 200) {
      return res.status(400).json({ success: false, message: 'titulo deve ter no máximo 200 caracteres' });
    }

    const id = randomUUID();
    const slug = await generateUniqueSlug(titulo);
    const now = new Date().toISOString();
    const ordemNum = typeof ordem === 'number' ? ordem : 0;

    // Assign UUIDs to blocks that don't have them
    const blocosProcessed = (blocos || []).map((bloco) => ({
      ...bloco,
      id: bloco.id || randomUUID(),
    }));

    const item = {
      PK: `TENANT#${TENANT}`,
      SK: `SITE_PAGE#${id}`,
      GSI1PK: 'SITE_PAGES',
      GSI1SK: `ORDER#${padOrdem(ordemNum)}`,
      id,
      titulo: titulo.trim(),
      slug,
      ordem: ordemNum,
      visivel: visivel !== false,
      blocos: blocosProcessed,
      seo_titulo: seo_titulo || '',
      seo_descricao: seo_descricao || '',
      is_home: is_home === true,
      created_at: now,
      updated_at: now,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /:id — Obter página com todos os blocos ────────────

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `SITE_PAGE#${id}` },
    }));

    if (!result.Item) {
      return res.status(404).json({ success: false, message: 'Página não encontrada' });
    }

    res.json({ success: true, data: result.Item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT /:id — Atualizar página ────────────────────────────

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, slug, ordem, visivel, blocos, seo_titulo, seo_descricao, is_home } = req.body;

    // Fetch existing
    const existing = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `SITE_PAGE#${id}` },
    }));

    if (!existing.Item) {
      return res.status(404).json({ success: false, message: 'Página não encontrada' });
    }

    const page = existing.Item;
    const now = new Date().toISOString();

    // Update titulo
    if (titulo !== undefined) {
      if (!titulo.trim()) {
        return res.status(400).json({ success: false, message: 'titulo não pode ser vazio' });
      }
      if (titulo.length > 200) {
        return res.status(400).json({ success: false, message: 'titulo deve ter no máximo 200 caracteres' });
      }
      page.titulo = titulo.trim();
    }

    // Update slug
    if (slug !== undefined) {
      const newSlug = slugify(slug);
      if (!newSlug) {
        return res.status(400).json({ success: false, message: 'slug inválido' });
      }
      if (await checkSlugExists(newSlug, id)) {
        return res.status(409).json({ success: false, message: 'slug já em uso' });
      }
      page.slug = newSlug;
    }

    // Update ordem
    if (typeof ordem === 'number') {
      page.ordem = ordem;
      page.GSI1SK = `ORDER#${padOrdem(ordem)}`;
    }

    // Update visivel
    if (visivel !== undefined) {
      page.visivel = visivel === true;
    }

    // Update blocos
    if (blocos !== undefined) {
      if (!Array.isArray(blocos)) {
        return res.status(400).json({ success: false, message: 'blocos deve ser um array' });
      }
      page.blocos = blocos.map((bloco) => ({
        ...bloco,
        id: bloco.id || randomUUID(),
      }));
    }

    // Update SEO fields
    if (seo_titulo !== undefined) page.seo_titulo = seo_titulo;
    if (seo_descricao !== undefined) page.seo_descricao = seo_descricao;

    // Update is_home
    if (is_home !== undefined) {
      page.is_home = is_home === true;
    }

    page.updated_at = now;

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: page }));

    res.json({ success: true, data: page });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DELETE /:id — Excluir página ───────────────────────────

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `SITE_PAGE#${id}` },
    }));

    if (!existing.Item) {
      return res.status(404).json({ success: false, message: 'Página não encontrada' });
    }

    await dynamo.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `SITE_PAGE#${id}` },
    }));

    res.json({ success: true, message: 'Página excluída' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
