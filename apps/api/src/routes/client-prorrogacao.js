// ══════════════════════════════════════════════════════════════
// ALB-11: Client Prorrogação (Extension) Routes
// Mounted at /client/albuns/prorrogacao
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { getOpcoesProrrogacao, solicitarProrrogacao } = require('../services/albumProrrogacaoService');

const router = Router();

// GET /opcoes — Return available extension tiers
router.get('/opcoes', async (req, res) => {
  try {
    const opcoes = getOpcoesProrrogacao();
    res.json({ success: true, data: opcoes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST / — Request an extension
router.post('/', async (req, res) => {
  try {
    const { album_id, dias } = req.body;

    if (!album_id) {
      return res.status(400).json({ success: false, message: 'album_id é obrigatório' });
    }
    if (!dias) {
      return res.status(400).json({ success: false, message: 'dias é obrigatório' });
    }

    // Validate dias against available tiers
    const opcoes = getOpcoesProrrogacao();
    const opcao = opcoes.find(o => o.dias === Number(dias));
    if (!opcao) {
      return res.status(400).json({
        success: false,
        message: `dias inválido. Opções: ${opcoes.map(o => o.dias).join(', ')}`,
      });
    }

    const prorrogacao = await solicitarProrrogacao(album_id, opcao.dias, opcao.valor);

    res.status(201).json({ success: true, data: prorrogacao });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
