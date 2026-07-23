// ══════════════════════════════════════════════════════════════
// ROUTES/PUBLIC-ASSINATURA.JS
// Rotas públicas para assinatura eletrônica de contratos
// Acesso via token único (sem autenticação Cognito)
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const {
  gerarEEnviarOTP,
  validarOTPEAssinar,
  buscarContratoPorToken,
  verificarIntegridade,
} = require('../services/assinaturaEletronicaService');
const logger = require('../config/logger');

const router = Router();

/**
 * GET /public/contrato/:token
 * Visualizar contrato via link único (RF01)
 * RNF02: Interface otimizada para mobile
 */
router.get('/contrato/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const contrato = await buscarContratoPorToken(token);
    if (!contrato) {
      return res.status(404).json({
        success: false,
        message: 'Contrato não encontrado ou link expirado.',
      });
    }

    // Retornar dados do contrato para visualização (sem dados sensíveis internos)
    const dadosPublicos = {
      id: contrato.id,
      conteudo_html: contrato.conteudo_html,
      status: contrato.status,
      created: contrato.created,
      tipo_evento: contrato.tipo_evento,
      assinado_em: contrato.assinado_em || null,
      selo_assinatura: contrato.selo_assinatura || null,
    };

    res.json({ success: true, data: dadosPublicos });
  } catch (error) {
    logger.error({ action: 'public_contrato_view_error', error: error.message });
    res.status(500).json({ success: false, message: 'Erro ao carregar contrato.' });
  }
});

/**
 * POST /public/contrato/:token/solicitar-otp
 * Solicita envio do código OTP para o cliente (RF02)
 * O cliente clica em "Assinar" e recebe o código
 */
router.post('/contrato/:token/solicitar-otp', async (req, res) => {
  try {
    const { token } = req.params;
    const { canal } = req.body; // 'whatsapp', 'sms' ou 'email'

    const contrato = await buscarContratoPorToken(token);
    if (!contrato) {
      return res.status(404).json({
        success: false,
        message: 'Contrato não encontrado.',
      });
    }

    if (contrato.status === 'assinado') {
      return res.status(400).json({
        success: false,
        message: 'Este contrato já foi assinado.',
      });
    }

    if (contrato.status !== 'enviado' && contrato.status !== 'pendente_assinatura') {
      return res.status(400).json({
        success: false,
        message: 'Este contrato não está disponível para assinatura no momento.',
      });
    }

    const resultado = await gerarEEnviarOTP(contrato.id, canal || 'whatsapp');

    res.json({
      success: true,
      data: {
        mensagem: `Código de verificação enviado via ${resultado.canalUtilizado}.`,
        canal: resultado.canalUtilizado,
        destino: resultado.mascaraDestino,
        expiraEm: resultado.expiraEm,
      },
    });
  } catch (error) {
    logger.error({ action: 'solicitar_otp_error', error: error.message, token: req.params.token });
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /public/contrato/:token/verificar-otp
 * Valida o OTP e processa a assinatura eletrônica (RF03)
 */
router.post('/contrato/:token/verificar-otp', async (req, res) => {
  try {
    const { token } = req.params;
    const { codigo } = req.body;

    if (!codigo || codigo.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Código de verificação deve ter 6 dígitos.',
      });
    }

    const contrato = await buscarContratoPorToken(token);
    if (!contrato) {
      return res.status(404).json({
        success: false,
        message: 'Contrato não encontrado.',
      });
    }

    if (contrato.status === 'assinado') {
      return res.status(400).json({
        success: false,
        message: 'Este contrato já foi assinado.',
      });
    }

    // Capturar metadados para log de auditoria (Seção 3 da spec)
    const metadados = {
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
          req.headers['x-real-ip'] ||
          req.connection?.remoteAddress ||
          req.ip,
      userAgent: req.headers['user-agent'] || '',
    };

    const resultado = await validarOTPEAssinar(contrato.id, codigo, metadados);

    res.json({
      success: true,
      data: {
        mensagem: 'Contrato assinado com sucesso!',
        hashDocumento: resultado.hashDocumento,
        assinadoEm: resultado.assinadoEm,
        signatario: resultado.signatario,
        selo: resultado.selo,
      },
    });
  } catch (error) {
    logger.error({ action: 'verificar_otp_error', error: error.message, token: req.params.token });
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /public/contrato/:token/verificar-integridade
 * Verifica integridade do documento assinado (RNF03)
 * Qualquer pessoa com o link pode verificar se o documento foi alterado
 */
router.get('/contrato/:token/verificar-integridade', async (req, res) => {
  try {
    const { token } = req.params;

    const contrato = await buscarContratoPorToken(token);
    if (!contrato) {
      return res.status(404).json({
        success: false,
        message: 'Contrato não encontrado.',
      });
    }

    if (contrato.status !== 'assinado') {
      return res.status(400).json({
        success: false,
        message: 'Este contrato ainda não foi assinado.',
      });
    }

    const resultado = await verificarIntegridade(contrato.id);

    res.json({ success: true, data: resultado });
  } catch (error) {
    logger.error({ action: 'verificar_integridade_error', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
