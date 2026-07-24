// ══════════════════════════════════════════════════════════════
// SERVICES/INTEGRITY-SERVICE.JS
// SIG-06: Hash SHA-256 + S3 Object Lock
// Garante integridade e imutabilidade dos documentos assinados
// ══════════════════════════════════════════════════════════════

const crypto = require('crypto');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  PutObjectRetentionCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('../config/logger');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const CONTRATOS_BUCKET = process.env.CONTRATOS_BUCKET || 'mbf-contratos-prod';

/**
 * Calcula SHA-256 de um buffer
 */
function calcularHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Upload com hash nos metadados + Object Lock COMPLIANCE
 * @param {string} key - S3 key
 * @param {Buffer} buffer - Conteúdo do arquivo
 * @param {string} contentType - MIME type
 * @returns {{ hash: string, retain_until: string }}
 */
async function uploadComIntegridade(key, buffer, contentType = 'application/pdf') {
  const hash = calcularHash(buffer);
  const agora = new Date();

  // Upload com hash nos metadados
  await s3.send(new PutObjectCommand({
    Bucket: CONTRATOS_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: {
      'sha256': hash,
      'gerado-em': agora.toISOString(),
    },
  }));

  // Aplicar Object Lock (COMPLIANCE = ninguém pode deletar/modificar)
  const retainUntil = new Date(agora);
  retainUntil.setFullYear(retainUntil.getFullYear() + 5); // 5 anos

  try {
    await s3.send(new PutObjectRetentionCommand({
      Bucket: CONTRATOS_BUCKET,
      Key: key,
      Retention: {
        Mode: 'COMPLIANCE',
        RetainUntilDate: retainUntil,
      },
    }));
  } catch (err) {
    // Object Lock pode não estar habilitado no bucket
    logger.warn({ action: 'object_lock_falha', key, error: err.message });
  }

  logger.info({ action: 'upload_integridade', key, hash: hash.slice(0, 16) + '...' });

  return { hash, retain_until: retainUntil.toISOString() };
}

/**
 * Verifica integridade comparando hash armazenado com hash atual do S3
 */
async function verificarIntegridadeS3(key, hashEsperado) {
  try {
    const response = await s3.send(new GetObjectCommand({
      Bucket: CONTRATOS_BUCKET,
      Key: key,
    }));

    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const hashAtual = calcularHash(buffer);

    return {
      integro: hashAtual === hashEsperado,
      hash_esperado: hashEsperado,
      hash_atual: hashAtual,
    };
  } catch (err) {
    return {
      integro: false,
      hash_esperado: hashEsperado,
      hash_atual: null,
      erro: err.message,
    };
  }
}

/**
 * Gera URL assinada para download temporário (5 min)
 */
async function gerarUrlAssinada(key, expiresIn = 300) {
  const command = new GetObjectCommand({
    Bucket: CONTRATOS_BUCKET,
    Key: key,
  });
  return await getSignedUrl(s3, command, { expiresIn });
}

module.exports = {
  calcularHash,
  uploadComIntegridade,
  verificarIntegridadeS3,
  gerarUrlAssinada,
  CONTRATOS_BUCKET,
};
