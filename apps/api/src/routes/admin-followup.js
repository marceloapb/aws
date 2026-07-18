/**
 * ══════════════════════════════════════════════════════════════
 * ADMIN FOLLOW-UP ROUTES — CRUD réguas, execuções, log, métricas
 * ══════════════════════════════════════════════════════════════
 */

const { Router } = require('express');
const followupService = require('../services/followupService');

const router = Router();

// ══════════ RÉGUAS ══════════

// GET /admin/followup/reguas — Listar réguas
router.get('/reguas', async (req, res) => {
  try {
    const { ativo, gatilho } = req.query;
    const reguas = await followupService.listarReguas({ ativo, gatilho });
    res.json({ success: true, data: reguas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /admin/followup/reguas/:id — Obter régua por ID
router.get('/reguas/:id', async (req, res) => {
  try {
    const regua = await followupService.obterRegua(req.params.id);
    if (!regua) return res.status(404).json({ success: false, message: 'Régua não encontrada' });
    res.json({ success: true, data: regua });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /admin/followup/reguas — Criar régua
router.post('/reguas', async (req, res) => {
  try {
    const { nome, gatilho, natureza, canal_inicial, canal_escalonado, tentativa_escalonamento, intervalo_dias, tentativas_max, template_msg, ao_esgotar_gerar_pendencia, passos } = req.body;
    if (!nome) return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
    if (!gatilho) return res.status(400).json({ success: false, message: 'Gatilho é obrigatório' });

    const regua = await followupService.criarRegua({
      nome, gatilho, natureza, canal_inicial, canal_escalonado,
      tentativa_escalonamento, intervalo_dias, tentativas_max,
      template_msg, ao_esgotar_gerar_pendencia, passos,
    });
    res.status(201).json({ success: true, data: regua });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /admin/followup/reguas/:id — Atualizar régua
router.put('/reguas/:id', async (req, res) => {
  try {
    const regua = await followupService.atualizarRegua(req.params.id, req.body);
    if (!regua) return res.status(404).json({ success: false, message: 'Régua não encontrada' });
    res.json({ success: true, data: regua });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /admin/followup/reguas/:id — Excluir régua
router.delete('/reguas/:id', async (req, res) => {
  try {
    await followupService.deletarRegua(req.params.id);
    res.json({ success: true, message: 'Régua excluída' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ══════════ EXECUÇÕES ══════════

// GET /admin/followup/execucoes — Listar execuções (log)
router.get('/execucoes', async (req, res) => {
  try {
    const { status, referencia_tipo, page, limit } = req.query;
    const result = await followupService.listarExecucoes({ status, referencia_tipo, page, limit });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /admin/followup/execucoes — Criar execução manualmente
router.post('/execucoes', async (req, res) => {
  try {
    const { regua_id, referencia_id, referencia_tipo, cliente_id, cliente_nome, cliente_email, cliente_whatsapp } = req.body;
    if (!regua_id || !referencia_id) {
      return res.status(400).json({ success: false, message: 'regua_id e referencia_id são obrigatórios' });
    }
    const exec = await followupService.criarExecucao({
      regua_id, referencia_id, referencia_tipo, cliente_id, cliente_nome, cliente_email, cliente_whatsapp,
    });
    res.status(201).json({ success: true, data: exec });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /admin/followup/execucoes/:sk/cancelar — Cancelar execução
router.post('/execucoes/:sk/cancelar', async (req, res) => {
  try {
    const sk = decodeURIComponent(req.params.sk);
    const result = await followupService.cancelarExecucao(sk);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /admin/followup/execucoes/:sk/silenciar — Silenciar execução
router.post('/execucoes/:sk/silenciar', async (req, res) => {
  try {
    const sk = decodeURIComponent(req.params.sk);
    const { dias } = req.body;
    const result = await followupService.silenciarExecucao(sk, dias);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /admin/followup/resolver — Resolver por evento (ex: contrato assinado)
router.post('/resolver', async (req, res) => {
  try {
    const { referencia_id, motivo } = req.body;
    if (!referencia_id) return res.status(400).json({ success: false, message: 'referencia_id é obrigatório' });
    const count = await followupService.resolverPorEvento(referencia_id, motivo || 'resolucao_manual');
    res.json({ success: true, data: { resolvidos: count } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ══════════ MÉTRICAS ══════════

// GET /admin/followup/metricas — Dashboard de métricas
router.get('/metricas', async (req, res) => {
  try {
    const metricas = await followupService.obterMetricas();
    res.json({ success: true, data: metricas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
