// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-SITE.JS — CMS do site público (config + páginas)
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router();
const TENANT = process.env.TENANT_ID || 'default';
const VALID_TIPOS = ['home', 'sobre', 'contato'];

// ─── PUT /config — Atualizar configuração do site ───────────

router.put('/config', async (req, res) => {
  try {
    const { logo_url, logo_dark_url, nome, redes, whatsapp_pessoal } = req.body;

    // Validações
    if (!nome || !nome.trim()) {
      return res.status(400).json({ success: false, message: 'nome é obrigatório' });
    }
    if (nome.length > 100) {
      return res.status(400).json({ success: false, message: 'nome deve ter no máximo 100 caracteres' });
    }
    if (redes && !Array.isArray(redes)) {
      return res.status(400).json({ success: false, message: 'redes deve ser um array' });
    }
    if (redes) {
      for (const rede of redes) {
        if (!rede.tipo || !rede.url) {
          return res.status(400).json({ success: false, message: 'Cada rede deve ter tipo e url' });
        }
      }
    }

    const now = new Date().toISOString();

    const item = {
      PK: `TENANT#${TENANT}`,
      SK: 'CONFIG#SITE',
      logo_url: logo_url || '',
      logo_dark_url: logo_dark_url || '',
      nome: nome.trim(),
      redes: redes || [],
      whatsapp_pessoal: whatsapp_pessoal || '',
      updated_at: now,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /config — Obter configuração do site ───────────────

router.get('/config', async (req, res) => {
  try {
    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: 'CONFIG#SITE' },
    }));

    if (!result.Item) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: result.Item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /paginas/:tipo — Obter conteúdo de página CMS ─────

router.get('/paginas/:tipo', async (req, res) => {
  try {
    const { tipo } = req.params;

    if (!VALID_TIPOS.includes(tipo)) {
      return res.status(400).json({ success: false, message: `tipo inválido. Use: ${VALID_TIPOS.join(', ')}` });
    }

    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `PAGE#${tipo}` },
    }));

    if (!result.Item) {
      return res.json({ success: true, data: { tipo, blocos: [] } });
    }

    res.json({ success: true, data: result.Item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT /paginas/:tipo — Atualizar conteúdo de página CMS ──

router.put('/paginas/:tipo', async (req, res) => {
  try {
    const { tipo } = req.params;

    if (!VALID_TIPOS.includes(tipo)) {
      return res.status(400).json({ success: false, message: `tipo inválido. Use: ${VALID_TIPOS.join(', ')}` });
    }

    const { blocos } = req.body;

    if (!blocos || !Array.isArray(blocos)) {
      return res.status(400).json({ success: false, message: 'blocos é obrigatório e deve ser um array' });
    }

    // Validar estrutura dos blocos
    for (const bloco of blocos) {
      if (!bloco.key || !bloco.type) {
        return res.status(400).json({ success: false, message: 'Cada bloco deve ter key e type' });
      }
    }

    const now = new Date().toISOString();

    const item = {
      PK: `TENANT#${TENANT}`,
      SK: `PAGE#${tipo}`,
      tipo,
      blocos,
      updated_at: now,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /seo — Obter configuração SEO ──────────────────────

router.get('/seo', async (req, res) => {
  try {
    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: 'CONFIG#SEO' },
    }));

    if (!result.Item) {
      return res.json({ success: true, data: null });
    }

    const { PK, SK, ...data } = result.Item;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT /seo — Atualizar configuração SEO ──────────────────

router.put('/seo', async (req, res) => {
  try {
    const {
      titulo_padrao,
      descricao_padrao,
      keywords,
      og_image_url,
      og_image_key,
      google_analytics_id,
      google_search_console,
      google_place_id,
      schema_type,
      schema_nome,
      schema_descricao,
      schema_endereco,
      schema_cidade,
      schema_estado,
      schema_cep,
      schema_telefone,
      schema_email,
      schema_preco_min,
      schema_preco_max,
      schema_areas_atuacao,
      meta_facebook_pixel,
      meta_custom_head,
    } = req.body;

    // Validações
    if (titulo_padrao && titulo_padrao.length > 70) {
      return res.status(400).json({ success: false, message: 'titulo_padrao deve ter no máximo 70 caracteres' });
    }
    if (descricao_padrao && descricao_padrao.length > 320) {
      return res.status(400).json({ success: false, message: 'descricao_padrao deve ter no máximo 320 caracteres' });
    }

    const now = new Date().toISOString();

    const item = {
      PK: `TENANT#${TENANT}`,
      SK: 'CONFIG#SEO',
      titulo_padrao: titulo_padrao || '',
      descricao_padrao: descricao_padrao || '',
      keywords: keywords || '',
      og_image_url: og_image_url || '',
      og_image_key: og_image_key || '',
      google_analytics_id: google_analytics_id || '',
      google_search_console: google_search_console || '',
      google_place_id: google_place_id || '',
      schema_type: schema_type || 'Photographer',
      schema_nome: schema_nome || '',
      schema_descricao: schema_descricao || '',
      schema_endereco: schema_endereco || '',
      schema_cidade: schema_cidade || '',
      schema_estado: schema_estado || '',
      schema_cep: schema_cep || '',
      schema_telefone: schema_telefone || '',
      schema_email: schema_email || '',
      schema_preco_min: schema_preco_min || '',
      schema_preco_max: schema_preco_max || '',
      schema_areas_atuacao: schema_areas_atuacao || [],
      meta_facebook_pixel: meta_facebook_pixel || '',
      meta_custom_head: meta_custom_head || '',
      updated_at: now,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

    const { PK, SK, ...data } = item;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
