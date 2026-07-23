// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-ASSINATURAS.JS
// Rotas administrativas para gerenciamento de assinaturas eletrônicas
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
const {
  gerarEEnviarOTP,
  verificarIntegridade,
  obterLogAuditoria,
  gerarHashDocumento,
} = require('../services/assinaturaEletronicaService');
const { gerarContratoPDF } = require('../services/contratoPdfService');
const { enviarParaAssinatura } = require('../services/contratoService');
const logger = require('../config/logger');

const router = Router();

/**
 * GET /admin/assinaturas
 * Lista todos os contratos com status de assinatura
 */
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'CONTRATO' },
    }));

    let items = result.Items || [];

    // Filtrar por status se especificado
    if (status) {
      items = items.filter(c => c.status === status);
    }

    // Ordenar por data de criação (mais recente primeiro)
    items.sort((a, b) => (b.created || '').localeCompare(a.created || ''));

    // Paginação
    const total = items.length;
    const start = (Number(page) - 1) * Number(limit);
    const data = items.slice(start, start + Number(limit));

    // Enriquecer com informações de assinatura
    const enriched = data.map(contrato => ({
      id: contrato.id,
      cliente_id: contrato.cliente_id,
      status: contrato.status,
      created: contrato.created,
      enviado_em: contrato.enviado_em || null,
      assinado_em: contrato.assinado_em || null,
      hash_documento: contrato.hash_documento || null,
      assinatura_metodo: contrato.assinatura_metodo || null,
      ip_assinatura: contrato.ip_assinatura || null,
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: {
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
      },
    });
  } catch (error) {
    logger.error({ action: 'admin_listar_assinaturas_error', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /admin/assinaturas/:contratoId/auditoria
 * Retorna log de auditoria completo de um contrato (Seção 3 da spec)
 */
router.get('/:contratoId/auditoria', async (req, res) => {
  try {
    const { contratoId } = req.params;
    const logs = await obterLogAuditoria(contratoId);

    if (!logs || logs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum registro de auditoria encontrado para este contrato.',
      });
    }

    res.json({ success: true, data: logs });
  } catch (error) {
    logger.error({ action: 'admin_auditoria_error', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /admin/assinaturas/:contratoId/integridade
 * Verifica integridade do documento assinado (RNF03)
 */
router.get('/:contratoId/integridade', async (req, res) => {
  try {
    const { contratoId } = req.params;
    const resultado = await verificarIntegridade(contratoId);
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /admin/assinaturas/:contratoId/enviar
 * Envia (ou reenvia) contrato para assinatura do cliente (RF01)
 */
router.post('/:contratoId/enviar', async (req, res) => {
  try {
    const { contratoId } = req.params;
    const { canal } = req.body; // opcional: forçar canal específico

    const resultado = await enviarParaAssinatura(contratoId);

    res.json({
      success: true,
      data: {
        ...resultado,
        mensagem: 'Contrato enviado para assinatura com sucesso.',
      },
    });
  } catch (error) {
    logger.error({ action: 'admin_enviar_assinatura_error', error: error.message });
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /admin/assinaturas/:contratoId/reenviar-otp
 * Reenvia OTP para o cliente (caso tenha expirado ou não recebido)
 */
router.post('/:contratoId/reenviar-otp', async (req, res) => {
  try {
    const { contratoId } = req.params;
    const { canal } = req.body;

    const resultado = await gerarEEnviarOTP(contratoId, canal || 'whatsapp');

    res.json({
      success: true,
      data: {
        mensagem: `Novo código enviado via ${resultado.canalUtilizado}.`,
        canal: resultado.canalUtilizado,
        destino: resultado.mascaraDestino,
        expiraEm: resultado.expiraEm,
      },
    });
  } catch (error) {
    logger.error({ action: 'admin_reenviar_otp_error', error: error.message });
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /admin/assinaturas/:contratoId/pdf
 * Gera PDF do contrato com selo de assinatura e página de auditoria
 */
router.get('/:contratoId/pdf', async (req, res) => {
  try {
    const { contratoId } = req.params;
    const pdfBuffer = await gerarContratoPDF(contratoId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contrato-${contratoId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error({ action: 'admin_gerar_pdf_error', error: error.message });
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /admin/assinaturas/dashboard
 * Métricas resumidas para o painel do fotógrafo
 */
router.get('/dashboard', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'CONTRATO' },
    }));

    const contratos = result.Items || [];

    const metricas = {
      total: contratos.length,
      rascunho: contratos.filter(c => c.status === 'rascunho').length,
      enviados: contratos.filter(c => c.status === 'enviado' || c.status === 'pendente_assinatura').length,
      assinados: contratos.filter(c => c.status === 'assinado').length,
      expirados: contratos.filter(c => c.status === 'expirado').length,
      taxaAssinatura: contratos.length > 0
        ? ((contratos.filter(c => c.status === 'assinado').length / contratos.length) * 100).toFixed(1)
        : 0,
    };

    res.json({ success: true, data: metricas });
  } catch (error) {
    logger.error({ action: 'admin_dashboard_assinaturas_error', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
