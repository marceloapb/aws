// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-SITE.JS — CMS do site público (config + páginas)
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router();
const TENANT = 'TENANT#1';
const VALID_TIPOS = ['home', 'sobre', 'contato'];

// ─── PUT /config — Atualizar configuração do site ───────────

router.put('/config', async (req, res) => {
  try {
    const { logo_url, nome, redes, whatsapp_pessoal } = req.body;

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
      PK: TENANT,
      SK: 'CONFIG#SITE',
      logo_url: logo_url || '',
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
      Key: { PK: TENANT, SK: 'CONFIG#SITE' },
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
      Key: { PK: TENANT, SK: `PAGE#${tipo}` },
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
      PK: TENANT,
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

module.exports = router;
