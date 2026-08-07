// ══════════════════════════════════════════════════════════════
// ROUTES/PUBLIC-SITE-PAGES.JS — Endpoints públicos das páginas do site
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router();
const TENANT = process.env.TENANT_ID || 'default';

// ─── GET /menu — Menu de páginas visíveis (ordenado) ────────

router.get('/menu', async (req, res) => {
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

    const pages = (result.Items || [])
      .filter((item) => item.visivel === true)
      .map((item) => ({
        id: item.id,
        titulo: item.titulo,
        slug: item.slug,
        is_home: item.is_home || false,
      }));

    res.set('Cache-Control', 'public, max-age=300');
    res.json({ success: true, data: pages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /:slug — Obter página por slug ─────────────────────

router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Query all site pages and find by slug
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `TENANT#${TENANT}`,
        ':sk': 'SITE_PAGE#',
      },
    }));

    const page = (result.Items || []).find((item) => item.slug === slug);

    if (!page) {
      return res.status(404).json({ success: false, message: 'Página não encontrada' });
    }

    if (page.visivel === false) {
      return res.status(404).json({ success: false, message: 'Página não encontrada' });
    }

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      success: true,
      data: {
        titulo: page.titulo,
        blocos: page.blocos || [],
        seo_titulo: page.seo_titulo || '',
        seo_descricao: page.seo_descricao || '',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
