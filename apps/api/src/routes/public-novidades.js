// ══════════════════════════════════════════════════════════════
// ROUTES/PUBLIC-NOVIDADES.JS — Endpoints públicos do blog
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router();
const TENANT = 'TENANT#1';

// ─── GET / — Listar posts publicados ────────────────────────

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 20);
    const lastKey = req.query.lastKey ? JSON.parse(decodeURIComponent(req.query.lastKey)) : undefined;
    const q = req.query.q ? req.query.q.trim() : null;

    let items = [];
    let lastEvaluatedKey = undefined;

    if (q) {
      // Text search: Scan com filtro contains no titulo + status publicado
      const params = {
        TableName: TABLE,
        FilterExpression: 'PK = :pk AND begins_with(SK, :sk) AND #s = :status AND contains(titulo, :q)',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
          ':pk': TENANT,
          ':sk': 'NOVIDADE#',
          ':status': 'publicado',
          ':q': q,
        },
      };

      const result = await dynamo.send(new ScanCommand(params));
      items = (result.Items || [])
        .sort((a, b) => (b.publicado_em || '').localeCompare(a.publicado_em || ''));

      // Paginação manual para scan com filtro
      const startIndex = lastKey ? items.findIndex(i => i.id === lastKey.cursorId) + 1 : 0;
      items = items.slice(startIndex, startIndex + limit);

      if (startIndex + limit < (result.Items || []).length) {
        const lastItem = items[items.length - 1];
        if (lastItem) {
          lastEvaluatedKey = { cursorId: lastItem.id };
        }
      }
    } else {
      // Query normal: buscar todos NOVIDADE# e filtrar publicados
      const params = {
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        FilterExpression: '#s = :status',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
          ':pk': TENANT,
          ':sk': 'NOVIDADE#',
          ':status': 'publicado',
        },
        ScanIndexForward: false,
      };

      if (lastKey) {
        params.ExclusiveStartKey = lastKey;
      }

      // Buscar com over-fetch para compensar o filtro
      params.Limit = limit * 3;

      const result = await dynamo.send(new QueryCommand(params));
      items = (result.Items || [])
        .sort((a, b) => (b.publicado_em || '').localeCompare(a.publicado_em || ''));

      items = items.slice(0, limit);
      lastEvaluatedKey = result.LastEvaluatedKey;
    }

    // Retornar apenas campos públicos
    const data = items.map(item => ({
      titulo: item.titulo,
      slug: item.slug,
      resumo: item.resumo,
      capa_url: item.capa_url,
      publicado_em: item.publicado_em,
    }));

    const response = { success: true, data, count: data.length };

    if (lastEvaluatedKey) {
      response.lastKey = encodeURIComponent(JSON.stringify(lastEvaluatedKey));
    }

    res.set('Cache-Control', 'public, max-age=300');
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /:slug — Obter post por slug ───────────────────────

router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Buscar pelo GSI1 (slug index)
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: {
        ':pk': TENANT,
        ':sk': `SLUG#${slug}`,
      },
    }));

    const post = result.Items && result.Items[0];

    if (!post || post.status !== 'publicado') {
      return res.status(404).json({ success: false, message: 'Post não encontrado' });
    }

    const data = {
      titulo: post.titulo,
      corpo_html: post.corpo_html,
      capa_url: post.capa_url,
      publicado_em: post.publicado_em,
      resumo: post.resumo,
    };

    res.set('Cache-Control', 'public, max-age=600');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
