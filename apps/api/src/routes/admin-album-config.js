// ══════════════════════════════════════════════════════════════
// SPEC G1: Configurações Globais do Álbum (Admin)
// Mounted at /admin/album/config
// Entidade: CONFIG_ALBUM (PK: TENANT#<id>, SK: CONFIG#ALBUM)
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router();

const DEFAULTS = {
  prazo_padrao_dias: 180,
  presets_dias: [30, 60, 90, 180, 365],
  notificacao_dias_antecedencia: [7, 3, 1],
  notificacao_canais: ['whatsapp', 'email'],
  templates_whatsapp: [],
  faixas_extensao: [
    { meses: 1, ativo: false, preco: 0 },
    { meses: 3, ativo: false, preco: 0 },
    { meses: 6, ativo: false, preco: 0 },
    { meses: 12, ativo: false, preco: 0 },
  ],
  bloquear_visualizacao: true,
  bloquear_download: true,
  mensagem_album_expirado: 'Este álbum expirou. Entre em contato para solicitar uma extensão.',
};

// GET /admin/album/config — retorna config ou defaults
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId || '1';
    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${tenantId}`, SK: 'CONFIG#ALBUM' },
    }));

    if (!result.Item) {
      return res.json({ success: true, data: { ...DEFAULTS, tenant_id: tenantId } });
    }

    res.json({ success: true, data: result.Item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /admin/album/config — valida e grava config
router.put('/', async (req, res) => {
  try {
    const tenantId = req.tenantId || '1';
    const body = req.body;

    // Validações
    if (body.prazo_padrao_dias != null && (typeof body.prazo_padrao_dias !== 'number' || body.prazo_padrao_dias <= 0)) {
      return res.status(400).json({ success: false, message: 'prazo_padrao_dias deve ser um número positivo' });
    }

    if (body.notificacao_dias_antecedencia) {
      if (!Array.isArray(body.notificacao_dias_antecedencia) || body.notificacao_dias_antecedencia.some(d => typeof d !== 'number' || d <= 0)) {
        return res.status(400).json({ success: false, message: 'notificacao_dias_antecedencia deve ser array de números positivos' });
      }
    }

    if (body.faixas_extensao) {
      if (!Array.isArray(body.faixas_extensao)) {
        return res.status(400).json({ success: false, message: 'faixas_extensao deve ser um array' });
      }

      const faixasAtivas = body.faixas_extensao.filter(f => f.ativo);
      for (const faixa of faixasAtivas) {
        if (typeof faixa.preco !== 'number' || faixa.preco <= 0) {
          return res.status(400).json({ success: false, message: 'Faixas ativas devem ter preco > 0' });
        }
        if (typeof faixa.meses !== 'number' || faixa.meses <= 0) {
          return res.status(400).json({ success: false, message: 'Faixas devem ter meses > 0' });
        }
      }
    }

    const item = {
      PK: `TENANT#${tenantId}`,
      SK: 'CONFIG#ALBUM',
      tenant_id: tenantId,
      prazo_padrao_dias: body.prazo_padrao_dias ?? DEFAULTS.prazo_padrao_dias,
      presets_dias: body.presets_dias ?? DEFAULTS.presets_dias,
      notificacao_dias_antecedencia: body.notificacao_dias_antecedencia ?? DEFAULTS.notificacao_dias_antecedencia,
      notificacao_canais: body.notificacao_canais ?? DEFAULTS.notificacao_canais,
      templates_whatsapp: body.templates_whatsapp ?? DEFAULTS.templates_whatsapp,
      faixas_extensao: body.faixas_extensao ?? DEFAULTS.faixas_extensao,
      bloquear_visualizacao: body.bloquear_visualizacao ?? DEFAULTS.bloquear_visualizacao,
      bloquear_download: body.bloquear_download ?? DEFAULTS.bloquear_download,
      mensagem_album_expirado: body.mensagem_album_expirado ?? DEFAULTS.mensagem_album_expirado,
      updated_at: new Date().toISOString(),
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
