// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-NOVIDADES.JS — CRUD de posts do blog (Novidades)
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { randomUUID } = require('crypto');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { slugify } = require('../utils/slugify');

const router = Router();
const TENANT = 'TENANT#1';
const s3 = new S3Client({});
const BUCKET = process.env.S3_BUCKET_NAME;
const CDN_BASE_URL = process.env.CDN_BASE_URL || '';

// ─── Helpers ────────────────────────────────────────────────

async function checkSlugExists(slug) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': TENANT, ':sk': `SLUG#${slug}` },
  }));
  return (result.Items && result.Items.length > 0);
}

async function generateUniqueSlug(titulo) {
  let baseSlug = slugify(titulo);
  if (!baseSlug) baseSlug = 'post';

  let slug = baseSlug;
  let counter = 1;

  while (await checkSlugExists(slug)) {
    counter++;
    slug = `${baseSlug}-${counter}`.slice(0, 80);
  }

  return slug;
}

// ─── POST / — Criar post ────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    const { titulo, corpo_html, resumo, capa_url, status } = req.body;

    // Validações
    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ success: false, message: 'titulo é obrigatório' });
    }
    if (titulo.length > 150) {
      return res.status(400).json({ success: false, message: 'titulo deve ter no máximo 150 caracteres' });
    }
    if (resumo && resumo.length > 300) {
      return res.status(400).json({ success: false, message: 'resumo deve ter no máximo 300 caracteres' });
    }
    const validStatus = ['rascunho', 'publicado'];
    const postStatus = validStatus.includes(status) ? status : 'rascunho';

    const id = randomUUID();
    const slug = await generateUniqueSlug(titulo);
    const now = new Date().toISOString();

    const item = {
      PK: TENANT,
      SK: `NOVIDADE#${id}`,
      GSI1PK: TENANT,
      GSI1SK: `SLUG#${slug}`,
      id,
      titulo: titulo.trim(),
      slug,
      corpo_html: corpo_html || '',
      resumo: resumo || '',
      capa_url: capa_url || '',
      status: postStatus,
      criado_em: now,
      atualizado_em: now,
      tipo: 'NOVIDADE',
    };

    if (postStatus === 'publicado') {
      item.publicado_em = now;
    }

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET / — Listar posts (admin, todos os status) ─────────

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const lastKey = req.query.lastKey ? JSON.parse(decodeURIComponent(req.query.lastKey)) : undefined;

    const params = {
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': TENANT, ':sk': 'NOVIDADE#' },
      Limit: limit,
      ScanIndexForward: false,
    };

    if (lastKey) {
      params.ExclusiveStartKey = lastKey;
    }

    const result = await dynamo.send(new QueryCommand(params));

    const response = {
      success: true,
      data: result.Items || [],
      count: (result.Items || []).length,
    };

    if (result.LastEvaluatedKey) {
      response.lastKey = encodeURIComponent(JSON.stringify(result.LastEvaluatedKey));
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /busca — Buscar posts por titulo ───────────────────

router.get('/busca', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Parâmetro q é obrigatório' });
    }

    const result = await dynamo.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'PK = :pk AND begins_with(SK, :sk) AND contains(titulo, :q)',
      ExpressionAttributeValues: {
        ':pk': TENANT,
        ':sk': 'NOVIDADE#',
        ':q': q.trim(),
      },
    }));

    res.json({ success: true, data: result.Items || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /imagens/upload — Presigned URL para upload ───────

router.post('/imagens/upload', async (req, res) => {
  try {
    const { post_id, content_type, filename, size } = req.body;

    if (!post_id || !content_type || !filename) {
      return res.status(400).json({ success: false, message: 'post_id, content_type e filename são obrigatórios' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(content_type)) {
      return res.status(400).json({ success: false, message: 'content_type deve ser image/jpeg, image/png ou image/webp' });
    }

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (size && Number(size) > maxSize) {
      return res.status(400).json({ success: false, message: 'Tamanho máximo permitido: 20MB' });
    }

    const img_id = randomUUID();
    const s3Key = `novidades/${post_id}/${img_id}/original/${filename}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      ContentType: content_type,
    });

    const upload_url = await getSignedUrl(s3, command, { expiresIn: 900 });
    const cdn_url = CDN_BASE_URL ? `${CDN_BASE_URL}/${s3Key}` : `https://${BUCKET}.s3.amazonaws.com/${s3Key}`;

    res.json({
      success: true,
      data: { upload_url, img_id, cdn_url },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /:id — Obter post por ID ──────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: TENANT, SK: `NOVIDADE#${req.params.id}` },
    }));

    if (!result.Item) {
      return res.status(404).json({ success: false, message: 'Post não encontrado' });
    }

    res.json({ success: true, data: result.Item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT /:id — Atualizar post ──────────────────────────────

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Buscar post atual
    const existing = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: TENANT, SK: `NOVIDADE#${id}` },
    }));

    if (!existing.Item) {
      return res.status(404).json({ success: false, message: 'Post não encontrado' });
    }

    // Validações
    if (updates.titulo && updates.titulo.length > 150) {
      return res.status(400).json({ success: false, message: 'titulo deve ter no máximo 150 caracteres' });
    }
    if (updates.resumo && updates.resumo.length > 300) {
      return res.status(400).json({ success: false, message: 'resumo deve ter no máximo 300 caracteres' });
    }
    if (updates.status && !['rascunho', 'publicado'].includes(updates.status)) {
      return res.status(400).json({ success: false, message: 'status deve ser rascunho ou publicado' });
    }

    const now = new Date().toISOString();
    updates.atualizado_em = now;

    // Se mudando para publicado e não tem publicado_em, setar agora
    if (updates.status === 'publicado' && !existing.Item.publicado_em) {
      updates.publicado_em = now;
    }

    // Campos que não devem ser atualizados diretamente
    delete updates.PK;
    delete updates.SK;
    delete updates.GSI1PK;
    delete updates.GSI1SK;
    delete updates.id;
    delete updates.slug;
    delete updates.criado_em;

    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhum campo para atualizar' });
    }

    const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
    const vals = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));

    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: TENANT, SK: `NOVIDADE#${id}` },
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

// ─── POST /:id/agendar — Agendar publicação ────────────────

router.post('/:id/agendar', async (req, res) => {
  try {
    const { id } = req.params;
    const { agendado_para } = req.body;

    if (!agendado_para) {
      return res.status(400).json({ success: false, message: 'agendado_para é obrigatório' });
    }

    const scheduledDate = new Date(agendado_para);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ success: false, message: 'agendado_para deve ser uma data válida' });
    }
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ success: false, message: 'agendado_para deve ser uma data futura' });
    }

    // Verificar se post existe e está em rascunho
    const existing = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: TENANT, SK: `NOVIDADE#${id}` },
    }));

    if (!existing.Item) {
      return res.status(404).json({ success: false, message: 'Post não encontrado' });
    }
    if (existing.Item.status !== 'rascunho') {
      return res.status(400).json({ success: false, message: 'Apenas posts em rascunho podem ser agendados' });
    }

    const now = new Date().toISOString();

    await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: TENANT, SK: `NOVIDADE#${id}` },
      UpdateExpression: 'SET agendado_para = :ap, atualizado_em = :now',
      ExpressionAttributeValues: {
        ':ap': agendado_para,
        ':now': now,
      },
    }));

    // TODO: Criar EventBridge Scheduler rule para publicar automaticamente na data agendada.
    // Por enquanto, um cron job verificará posts com agendado_para <= now e status=rascunho.

    res.json({
      success: true,
      data: { id, agendado_para, message: 'Publicação agendada com sucesso' },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DELETE /:id — Excluir post ─────────────────────────────

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se existe
    const existing = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: TENANT, SK: `NOVIDADE#${id}` },
    }));

    if (!existing.Item) {
      return res.status(404).json({ success: false, message: 'Post não encontrado' });
    }

    await dynamo.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: TENANT, SK: `NOVIDADE#${id}` },
    }));

    res.json({ success: true, message: 'Post excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
