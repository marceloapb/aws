// ══════════════════════════════════════════════════════════════
// FUNCTIONS/CONTRATOS/GERAR-MANIFESTO.JS
// SIG-04: Trigger automático para gerar manifesto PDF após assinatura
// Ativado via DynamoDB Stream quando contrato.status → 'assinado'
// ══════════════════════════════════════════════════════════════

const { dynamo, TABLE } = require('../../config/dynamodb');
const { QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { montarManifesto, gerarHTMLManifesto } = require('../../services/manifestoService');
const { listarAuditLog } = require('../../services/auditLogService');
const { uploadComIntegridade, CONTRATOS_BUCKET } = require('../../services/integrityService');
const { registrarAudit, EVENTOS } = require('../../services/auditLogService');
const logger = require('../../config/logger');

/**
 * Handler Lambda — DynamoDB Stream trigger
 * Detecta alteração de status para 'assinado' e gera manifesto automaticamente
 */
exports.handler = async (event) => {
  const records = event.Records || [];
  let processados = 0;
  let erros = 0;

  for (const record of records) {
    // Apenas MODIFY events (atualização de item)
    if (record.eventName !== 'MODIFY') continue;

    const newImage = record.dynamodb?.NewImage;
    const oldImage = record.dynamodb?.OldImage;

    if (!newImage || !oldImage) continue;

    // Verificar se é um contrato que mudou para 'assinado'
    const novoStatus = newImage.status?.S;
    const antigoStatus = oldImage.status?.S;
    const gsi1pk = newImage.GSI1PK?.S;

    if (gsi1pk !== 'CONTRATO') continue;
    if (novoStatus !== 'assinado' || antigoStatus === 'assinado') continue;

    // Extrair contratoId
    const contratoId = newImage.id?.S;
    if (!contratoId) continue;

    try {
      await gerarManifestoParaContrato(contratoId);
      processados++;
      logger.info({ action: 'manifesto_trigger_sucesso', contratoId });
    } catch (error) {
      erros++;
      logger.error({
        action: 'manifesto_trigger_erro',
        contratoId,
        error: error.message,
      });
    }
  }

  logger.info({
    action: 'manifesto_trigger_batch',
    total: records.length,
    processados,
    erros,
  });

  return { processados, erros };
};

/**
 * Gera o manifesto PDF para um contrato específico
 * Pode ser chamado pelo trigger ou manualmente via endpoint admin
 */
async function gerarManifestoParaContrato(contratoId) {
  // Buscar contrato
  const contratoResult = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': 'CONTRATO', ':sk': `CONTRATO#${contratoId}` },
  }));
  const contrato = contratoResult.Items?.[0];
  if (!contrato) throw new Error(`Contrato ${contratoId} não encontrado`);
  if (contrato.status !== 'assinado') throw new Error('Contrato ainda não foi assinado');

  // Buscar audit log completo
  const auditLog = await listarAuditLog(contratoId, { limite: 200, ordem: 'asc' });

  // Montar dados do aceite a partir do log_auditoria salvo no contrato
  const aceite = contrato.log_auditoria || {
    timestamp: contrato.assinado_em,
    enderecoIP: contrato.ip_assinatura,
    userAgent: contrato.user_agent_assinatura,
    signatario: { nomeCompleto: contrato.selo_assinatura?.signatario },
    autenticacao: { canal: 'whatsapp' },
  };

  // Montar manifesto
  const dadosManifesto = await montarManifesto(contrato, aceite, auditLog);

  // Gerar HTML do manifesto
  const htmlManifesto = gerarHTMLManifesto(dadosManifesto);

  // Converter HTML para buffer (pronto para PDF — em produção usar puppeteer/chromium)
  const manifestoBuffer = Buffer.from(htmlManifesto, 'utf-8');

  // Upload para S3 com integridade + Object Lock
  const s3Key = `contratos/${contratoId}/manifesto-${Date.now()}.html`;
  const { hash, retain_until } = await uploadComIntegridade(
    s3Key,
    manifestoBuffer,
    'text/html'
  );

  // Atualizar contrato com referência ao manifesto
  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: contrato.PK, SK: contrato.SK },
    UpdateExpression: 'SET manifesto_s3_key = :key, manifesto_hash = :hash, manifesto_gerado_em = :data, manifesto_retain_until = :retain',
    ExpressionAttributeValues: {
      ':key': s3Key,
      ':hash': hash,
      ':data': new Date().toISOString(),
      ':retain': retain_until,
    },
  }));

  // Registrar evento de auditoria
  await registrarAudit(contratoId, EVENTOS.PDF_GERADO, {
    cliente_id: contrato.cliente_id,
    detalhes: {
      tipo: 'manifesto',
      s3_key: s3Key,
      hash,
      retain_until,
    },
  });

  logger.info({
    action: 'manifesto_gerado',
    contratoId,
    s3Key,
    hash: hash.slice(0, 16) + '...',
  });

  return { s3Key, hash, retain_until };
}

module.exports = { handler: exports.handler, gerarManifestoParaContrato };
