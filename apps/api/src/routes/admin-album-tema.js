// ══════════════════════════════════════════════════════════════
// SPEC G3: TEMA_ALBUM — CRUD (Admin)
// Mounted at /admin/album/:albumId/tema
// Entidade: TEMA_ALBUM (PK: ALBUM#<album_id>, SK: TEMA)
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router({ mergeParams: true });

const LAYOUTS = ['grade', 'mosaico', 'colagem', 'slider', 'coluna', 'ladrilhos'];
const ANIMACOES = ['none', 'fade', 'slide', 'zoom'];
const CAPA_MODOS = ['cover', 'contain', 'fill'];
const LOGO_POSICOES = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];
const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

const DEFAULTS = {
  capa_foto_id: null,
  capa_modo: 'cover',
  cores: { fundo: '#FFFFFF', texto: '#1A1A1A', acento: '#EA580C' },
  layout: 'grade',
  fonte_titulo: 'Inter',
  fonte_corpo: 'Inter',
  animacao: 'none',
  logo_posicao: 'top-left',
};

// GET /admin/album/:albumId/tema — retorna tema ou defaults
router.get('/', async (req, res) => {
  try {
    const { albumId } = req.params;

    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `ALBUM#${albumId}`, SK: 'TEMA' },
    }));

    if (!result.Item) {
      return res.json({ success: true, data: { ...DEFAULTS, album_id: albumId } });
    }

    res.json({ success: true, data: result.Item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /admin/album/:albumId/tema — valida e grava
router.put('/', async (req, res) => {
  try {
    const { albumId } = req.params;
    const body = req.body;

    // Validações
    if (body.cores) {
      const { fundo, texto, acento } = body.cores;
      if (fundo && !HEX_REGEX.test(fundo)) return res.status(400).json({ success: false, message: 'cores.fundo deve ser hex válido (#RRGGBB)' });
      if (texto && !HEX_REGEX.test(texto)) return res.status(400).json({ success: false, message: 'cores.texto deve ser hex válido (#RRGGBB)' });
      if (acento && !HEX_REGEX.test(acento)) return res.status(400).json({ success: false, message: 'cores.acento deve ser hex válido (#RRGGBB)' });
    }

    if (body.layout && !LAYOUTS.includes(body.layout)) {
      return res.status(400).json({ success: false, message: `layout deve ser um de: ${LAYOUTS.join(', ')}` });
    }

    if (body.animacao && !ANIMACOES.includes(body.animacao)) {
      return res.status(400).json({ success: false, message: `animacao deve ser um de: ${ANIMACOES.join(', ')}` });
    }

    if (body.capa_modo && !CAPA_MODOS.includes(body.capa_modo)) {
      return res.status(400).json({ success: false, message: `capa_modo deve ser um de: ${CAPA_MODOS.join(', ')}` });
    }

    if (body.logo_posicao && !LOGO_POSICOES.includes(body.logo_posicao)) {
      return res.status(400).json({ success: false, message: `logo_posicao deve ser um de: ${LOGO_POSICOES.join(', ')}` });
    }

    if (body.fonte_titulo !== undefined && (typeof body.fonte_titulo !== 'string' || body.fonte_titulo.trim() === '')) {
      return res.status(400).json({ success: false, message: 'fonte_titulo não pode ser vazio' });
    }

    if (body.fonte_corpo !== undefined && (typeof body.fonte_corpo !== 'string' || body.fonte_corpo.trim() === '')) {
      return res.status(400).json({ success: false, message: 'fonte_corpo não pode ser vazio' });
    }

    const item = {
      PK: `ALBUM#${albumId}`,
      SK: 'TEMA',
      album_id: albumId,
      capa_foto_id: body.capa_foto_id ?? DEFAULTS.capa_foto_id,
      capa_modo: body.capa_modo ?? DEFAULTS.capa_modo,
      cores: {
        fundo: body.cores?.fundo ?? DEFAULTS.cores.fundo,
        texto: body.cores?.texto ?? DEFAULTS.cores.texto,
        acento: body.cores?.acento ?? DEFAULTS.cores.acento,
      },
      layout: body.layout ?? DEFAULTS.layout,
      fonte_titulo: body.fonte_titulo ?? DEFAULTS.fonte_titulo,
      fonte_corpo: body.fonte_corpo ?? DEFAULTS.fonte_corpo,
      animacao: body.animacao ?? DEFAULTS.animacao,
      logo_posicao: body.logo_posicao ?? DEFAULTS.logo_posicao,
      updated_at: new Date().toISOString(),
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
