// ══════════════════════════════════════════════════════════════
// SERVICES/AUDIT-LOG-SERVICE.JS
// SIG-03: Audit Log granular de assinatura
// Registra cada ação do fluxo como evento imutável
// ══════════════════════════════════════════════════════════════

const crypto = require('crypto');
const { dynamo, TABLE } = require('../config/dynamodb');
const { PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const logger = require('../config/logger');

/**
 * Registra um evento de auditoria para um contrato
 * @param {string} contratoId
 * @param {string} evento - Ex: 'contrato.link_aberto', 'contrato.otp_verificado'
 * @param {Object} contexto - { tenant_id, cliente_id, ip_address, user_agent, detalhes }
 */
async function registrarAudit(contratoId, evento, contexto = {}) {
  const agora = new Date().toISOString();
  const id = crypto.randomUUID();

  const item = {
    PK: `CONTRATO#${contratoId}`,
    SK: `AUDIT#${agora}#${id}`,
    GSI1PK: 'AUDIT_LOG',
    GSI1SK: `AUDIT#${contratoId}#${agora}`,
    id,
    contrato_id: contratoId,
    tenant_id: contexto.tenant_id || null,
    cliente_id: contexto.cliente_id || null,
    evento,
    detalhes: contexto.detalhes || {},
    ip_address: contexto.ip_address || null,
    user_agent: contexto.user_agent || null,
    timestamp: agora,
    created_at: agora,
  };

  try {
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    logger.info({ action: 'audit_registrado', contratoId, evento });
  } catch (error) {
    logger.error({ action: 'audit_erro', contratoId, evento, error: error.message });
    // Não propaga erro para não bloquear fluxo principal
  }

  return item;
}

/**
 * Lista todos os eventos de auditoria de um contrato
 * @param {string} contratoId
 * @param {Object} opts - { limite, ordem }
 */
async function listarAuditLog(contratoId, opts = {}) {
  const { limite = 100, ordem = 'asc' } = opts;

  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: {
      ':pk': `CONTRATO#${contratoId}`,
      ':prefix': 'AUDIT#',
    },
    ScanIndexForward: ordem === 'asc',
    Limit: limite,
  }));

  return result.Items || [];
}

/**
 * Eventos auditáveis conforme SIG-03
 */
const EVENTOS = {
  LINK_ABERTO: 'contrato.link_aberto',
  LEITURA_INICIADA: 'contrato.leitura_iniciada',
  LEITURA_COMPLETA: 'contrato.leitura_completa',
  IDENTIDADE_INFORMADA: 'contrato.identidade_informada',
  OTP_SOLICITADO: 'contrato.otp_solicitado',
  OTP_TENTATIVA: 'contrato.otp_tentativa',
  OTP_VERIFICADO: 'contrato.otp_verificado',
  OTP_EXPIRADO: 'contrato.otp_expirado',
  ACEITE_CONFIRMADO: 'contrato.aceite_confirmado',
  ACEITE_REJEITADO: 'contrato.aceite_rejeitado',
  PDF_GERADO: 'contrato.pdf_gerado',
  PDF_DOWNLOAD: 'contrato.pdf_download',
};

module.exports = { registrarAudit, listarAuditLog, EVENTOS };
