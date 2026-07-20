// ══════════════════════════════════════════════════════════════
// ROUTES/PUBLIC-SITE.JS — Endpoints públicos do site (sem auth)
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router();
const TENANT = 'TENANT#1';
const VALID_TIPOS = ['home', 'sobre', 'contato'];
const BASE_URL = 'https://www.mbfoto.com.br';

// ─── GET /config — Configuração pública do site ─────────────

router.get('/config', async (req, res) => {
  try {
    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: TENANT, SK: 'CONFIG#SITE' },
    }));

    if (!result.Item) {
      return res.json({ success: true, data: null });
    }

    // Retornar apenas campos públicos
    const { nome, logo_url, logo_dark_url, redes, whatsapp_pessoal } = result.Item;

    res.set('Cache-Control', 'public, max-age=300');
    res.json({ success: true, data: { nome, logo_url, logo_dark_url, redes, whatsapp_pessoal } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /depoimentos — Depoimentos aprovados ──────────────

router.get('/depoimentos', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: 'autoriza_publico = :autoriza AND marcado_depoimento = :marcado',
      ExpressionAttributeValues: {
        ':pk': 'FEEDBACK',
        ':autoriza': true,
        ':marcado': true,
      },
      Limit: 20,
    }));

    const depoimentos = (result.Items || []).map(item => ({
      nome: item.nome ? item.nome.split(' ')[0] : '',
      estrelas: item.estrelas,
      comentario: item.comentario,
      created_at: item.created_at,
    }));

    res.set('Cache-Control', 'public, max-age=600');
    res.json({ success: true, data: depoimentos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /paginas/:tipo — Conteúdo de página CMS ────────────

router.get('/paginas/:tipo', async (req, res) => {
  try {
    const { tipo } = req.params;

    if (!VALID_TIPOS.includes(tipo)) {
      return res.status(400).json({ success: false, message: `tipo inválido. Use: ${VALID_TIPOS.join(', ')}` });
    }

    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: TENANT, SK: `PAGE#${tipo}` },
    }));

    if (!result.Item) {
      return res.json({ success: true, data: { tipo, blocos: [] } });
    }

    // Retornar apenas tipo e blocos
    const { tipo: t, blocos } = result.Item;

    res.set('Cache-Control', 'public, max-age=300');
    res.json({ success: true, data: { tipo: t || tipo, blocos: blocos || [] } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /sitemap.xml — Sitemap dinâmico ────────────────────

router.get('/sitemap.xml', async (req, res) => {
  try {
    const now = new Date().toISOString();

    // Páginas estáticas
    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'weekly' },
      { loc: '/portfolio', priority: '0.8', changefreq: 'weekly' },
      { loc: '/novidades', priority: '0.7', changefreq: 'daily' },
      { loc: '/sobre', priority: '0.5', changefreq: 'monthly' },
      { loc: '/contato', priority: '0.5', changefreq: 'monthly' },
    ];

    // Buscar novidades publicadas (para slugs)
    const novidadesResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: '#s = :status',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':pk': TENANT,
        ':sk': 'NOVIDADE#',
        ':status': 'publicado',
      },
    }));

    const novidades = (novidadesResult.Items || []).map(item => ({
      loc: `/novidades/${item.slug}`,
      lastmod: item.publicado_em || item.updated_at || now,
      priority: '0.6',
      changefreq: 'monthly',
    }));

    // Buscar categorias de portfolio visíveis
    const categoriasResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': TENANT,
        ':sk': 'CATPORTFOLIO#',
      },
    }));

    const categorias = (categoriasResult.Items || [])
      .filter(item => item.visivel !== false)
      .map(item => ({
        loc: `/portfolio/${item.id}`,
        lastmod: item.atualizadoEm || now,
        priority: '0.7',
        changefreq: 'weekly',
      }));

    // Gerar XML
    const urls = [...staticPages, ...novidades, ...categorias];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const url of urls) {
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}${url.loc}</loc>\n`;
      if (url.lastmod) {
        xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
      }
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
      xml += `    <priority>${url.priority}</priority>\n`;
      xml += '  </url>\n';
    }

    xml += '</urlset>';

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /robots.txt — Robots.txt ──────────────────────────

router.get('/robots.txt', (req, res) => {
  const robots = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api',
    '',
    `Sitemap: ${BASE_URL}/sitemap.xml`,
  ].join('\n');

  res.set('Content-Type', 'text/plain');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(robots);
});

module.exports = router;
