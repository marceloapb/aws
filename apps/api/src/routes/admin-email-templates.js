// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-EMAIL-TEMPLATES.JS — CRUD de templates de e-mail
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const emailTemplateService = require('../services/emailTemplateService');

const router = Router();

// GET /api/admin/email-templates — Listar todos os templates
router.get('/', async (req, res) => {
  try {
    const templates = await emailTemplateService.listarTemplates();
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/email-templates/tipos — Listar tipos disponíveis com variáveis
router.get('/tipos', async (req, res) => {
  try {
    res.json({ success: true, data: emailTemplateService.TEMPLATE_TYPES });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/email-templates/config — Buscar configuração de remetente/logo
router.get('/config', async (req, res) => {
  try {
    const config = await emailTemplateService.buscarConfigEmail();
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/email-templates/config — Salvar configuração de remetente/logo
router.put('/config', async (req, res) => {
  try {
    const { remetente_nome, logo_url, logo_key, cor_primaria, rodape_texto } = req.body;
    const result = await emailTemplateService.salvarConfigEmail({ remetente_nome, logo_url, logo_key, cor_primaria, rodape_texto });
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/admin/email-templates/:tipo — Buscar template específico
router.get('/:tipo', async (req, res) => {
  try {
    const template = await emailTemplateService.buscarTemplate(req.params.tipo);
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/email-templates/:tipo — Salvar/atualizar template
router.put('/:tipo', async (req, res) => {
  try {
    const { assunto, corpo, ativo } = req.body;
    if (!assunto || !corpo) {
      return res.status(400).json({ success: false, message: 'assunto e corpo são obrigatórios' });
    }
    const result = await emailTemplateService.salvarTemplate(req.params.tipo, { assunto, corpo, ativo });
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/email-templates/:tipo — Resetar template ao padrão
router.delete('/:tipo', async (req, res) => {
  try {
    const result = await emailTemplateService.resetarTemplate(req.params.tipo);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/email-templates/:tipo/preview — Preview do template renderizado
router.post('/:tipo/preview', async (req, res) => {
  try {
    const variaveis = req.body.variaveis || {};
    // Usar dados de exemplo se não fornecidos
    const exemplos = {
      cliente_nome: 'Maria Silva',
      tipo_evento: 'Casamento',
      data_evento: '15/03/2026',
      valor_total: '3.500,00',
      valor: '1.750,00',
      data_vencimento: '01/03/2026',
      album_titulo: 'Ensaio Pré-Wedding',
      qtd_fotos: '150',
      data_expiracao: '30 dias',
      titulo: 'Atualização importante',
      mensagem: 'Temos novidades sobre seu evento!',
      email_cliente: 'maria@email.com',
      link_assinatura: '#',
      link_orcamento: '#',
      link_album: '#',
      link_pagamento: '#',
      link_portal: '#',
      link_feedback: '#',
      link: '#',
    };

    const variaveisMerged = { ...exemplos, ...variaveis };
    const rendered = await emailTemplateService.renderizarTemplate(req.params.tipo, variaveisMerged);

    if (!rendered) {
      return res.json({ success: true, data: { desativado: true, message: 'Template desativado' } });
    }

    res.json({ success: true, data: rendered });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/email-templates/:tipo/enviar-teste — Enviar e-mail de teste
router.post('/:tipo/enviar-teste', async (req, res) => {
  try {
    const { email_destino } = req.body;
    if (!email_destino) {
      return res.status(400).json({ success: false, message: 'email_destino é obrigatório' });
    }

    const exemplos = {
      cliente_nome: 'Teste',
      tipo_evento: 'Casamento (Teste)',
      data_evento: '15/03/2026',
      valor_total: '3.500,00',
      valor: '1.750,00',
      data_vencimento: '01/03/2026',
      album_titulo: 'Álbum de Teste',
      qtd_fotos: '100',
      data_expiracao: '30 dias',
      titulo: 'E-mail de Teste',
      mensagem: 'Este é um e-mail de teste do sistema de templates.',
      email_cliente: email_destino,
      link_assinatura: 'https://www.marcelobloisefotografia.com.br',
      link_orcamento: 'https://www.marcelobloisefotografia.com.br',
      link_album: 'https://www.marcelobloisefotografia.com.br',
      link_pagamento: 'https://www.marcelobloisefotografia.com.br',
      link_portal: 'https://www.marcelobloisefotografia.com.br',
      link_feedback: 'https://www.marcelobloisefotografia.com.br',
      link: 'https://www.marcelobloisefotografia.com.br',
    };

    const rendered = await emailTemplateService.renderizarTemplate(req.params.tipo, exemplos);
    if (!rendered) {
      return res.status(400).json({ success: false, message: 'Template desativado' });
    }

    const { enviarEmail } = require('../services/emailService');
    const result = await enviarEmail({
      para: email_destino,
      assunto: `[TESTE] ${rendered.assunto}`,
      html: rendered.html,
      texto: rendered.texto,
    });

    res.json({ success: true, message: `E-mail de teste enviado para ${email_destino}`, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
