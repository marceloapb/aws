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
const { registrarAudit, EVENTOS } = require('../services/auditLogService');
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

    // SIG-03: Registrar abertura do link
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    await registrarAudit(contrato.id, EVENTOS.LINK_ABERTO, {
      cliente_id: contrato.cliente_id,
      ip_address: ip,
      user_agent: req.headers['user-agent'] || '',
    });

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
    const { codigo, nome_digitado, aceite_termos } = req.body;

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
      nomeInformado: nome_digitado || '',
      aceiteTermos: !!aceite_termos,
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

/**
 * POST /public/assinatura/contrato/:token/audit
 * SIG-03: Registro de eventos de auditoria do frontend
 */
router.post('/contrato/:token/audit', async (req, res) => {
  try {
    const { token } = req.params;
    const { evento, detalhes } = req.body;

    if (!evento) {
      return res.status(400).json({ success: false, message: 'evento é obrigatório' });
    }

    const contrato = await buscarContratoPorToken(token);
    if (!contrato) {
      return res.status(404).json({ success: false, message: 'Contrato não encontrado.' });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] || req.ip;

    await registrarAudit(contrato.id, evento, {
      cliente_id: contrato.cliente_id,
      ip_address: ip,
      user_agent: req.headers['user-agent'] || '',
      detalhes: detalhes || {},
    });

    res.status(201).json({ success: true, registrado: true });
  } catch (error) {
    logger.error({ action: 'public_audit_error', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /public/assinatura/contrato/:token/canais-otp
 * SIG-05: Lista canais disponíveis para envio de OTP
 */
router.get('/contrato/:token/canais-otp', async (req, res) => {
  try {
    const { token } = req.params;

    const contrato = await buscarContratoPorToken(token);
    if (!contrato) {
      return res.status(404).json({ success: false, message: 'Contrato não encontrado.' });
    }

    // Buscar cliente para verificar dados disponíveis
    const { dynamo, TABLE } = require('../config/dynamodb');
    const { QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

    let cliente = null;
    const cliResult = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: { ':pk': 'CLIENTE', ':sk': `CLIENTE#${contrato.cliente_id}` },
    }));
    cliente = cliResult.Items?.[0];

    if (!cliente) {
      const cli2 = await dynamo.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: `CLIENT#${contrato.cliente_id}`, SK: 'PROFILE' },
      })).catch(() => ({ Item: null }));
      if (cli2?.Item) cliente = cli2.Item;
    }

    // Padrão 3: TENANT#default / CLIENTE#<id> (clientes criados pelo admin)
    if (!cliente) {
      const TENANT = process.env.TENANT_ID || 'default';
      const cli3 = await dynamo.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: `TENANT#${TENANT}`, SK: `CLIENTE#${contrato.cliente_id}` },
      })).catch(() => ({ Item: null }));
      if (cli3?.Item) cliente = { ...cli3.Item, id: contrato.cliente_id };
    }

    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente não encontrado.' });
    }

    const telefone = cliente.whatsapp_numero || cliente.telefone;
    const email = cliente.email;

    const canais = [];

    if (telefone) {
      const parcial = '***' + telefone.replace(/\D/g, '').slice(-4);
      canais.push({ id: 'whatsapp', nome: 'WhatsApp', destino_parcial: parcial, disponivel: true });
    }
    if (email) {
      const [local, domain] = email.split('@');
      const parcial = local[0] + '***@' + domain;
      canais.push({ id: 'email', nome: 'E-mail', destino_parcial: parcial, disponivel: true });
    }
    if (telefone) {
      const parcial = '***' + telefone.replace(/\D/g, '').slice(-4);
      canais.push({ id: 'sms', nome: 'SMS', destino_parcial: parcial, disponivel: true });
    }

    res.json({ success: true, data: { canais } });
  } catch (error) {
    logger.error({ action: 'canais_otp_error', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /public/assinatura/verificar/:codigo
 * SIG-01: Verificar autenticidade de assinatura pelo código do selo
 */
router.get('/verificar/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;

    if (!codigo || !codigo.startsWith('SIG-')) {
      return res.status(400).json({ success: false, message: 'Código de verificação inválido.' });
    }

    // Extrair contratoId parcial do código (primeiros 8 chars após 'SIG-')
    const partes = codigo.split('-');
    const contratoIdParcial = partes[1]; // ex: 'ct_001' ou UUID parcial

    // Buscar contratos assinados que contenham este código
    const { dynamo, TABLE } = require('../config/dynamodb');
    const { QueryCommand } = require('@aws-sdk/lib-dynamodb');

    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: 'contains(selo_assinatura.id, :prefix) OR contains(id, :prefix)',
      ExpressionAttributeValues: {
        ':pk': 'CONTRATO',
        ':prefix': contratoIdParcial,
      },
    }));

    const contrato = result.Items?.find(c => c.status === 'assinado');

    if (!contrato) {
      return res.status(404).json({
        success: false,
        valido: false,
        message: 'Código de verificação não encontrado.',
      });
    }

    const selo = contrato.selo_assinatura || {};

    res.json({
      success: true,
      data: {
        valido: true,
        contrato_id: contrato.id,
        signatario: selo.signatario || 'N/A',
        cpf_parcial: selo.cpf || '***.***.***-**',
        data_aceite: contrato.assinado_em || selo.data,
        status_contrato: contrato.status,
        hash_documento: contrato.hash_documento,
        metodo: 'Assinatura Eletrônica Avançada (Lei 14.063/2020)',
      },
    });
  } catch (error) {
    logger.error({ action: 'verificar_codigo_error', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
