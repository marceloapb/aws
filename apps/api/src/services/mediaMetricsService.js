// ══════════════════════════════════════════════════════════════
// SERVICES/MEDIA-METRICS-SERVICE.JS — Métricas de armazenamento de mídia
// ══════════════════════════════════════════════════════════════

const { dynamo, TABLE } = require('../config/dynamodb');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const s3 = new S3Client({});
const BUCKET = process.env.S3_BUCKET_NAME || 'mbf-backend-v3-fotos';

/**
 * Formata bytes em string legível
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = (bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0);
  return `${value} ${units[i]}`;
}

/**
 * Calcula métricas de armazenamento para um contexto (prefix no S3)
 */
async function getStorageMetrics(contexto) {
  let totalBytes = 0;
  let totalFiles = 0;
  let continuationToken = undefined;

  const TENANT = process.env.TENANT_ID || '3438a468-a031-7040-2d21-abc059a80915';

  // Map contexto to S3 prefix (estrutura real do bucket)
  const prefixMap = {
    album: `${TENANT}/album/`,
    portfolio: '1/portfolio/',
    perfil: 'fotos/',
    avatars: 'avatars/',
    backups: 'backups/',
    whatsapp: 'whatsapp/',
  };
  const prefix = prefixMap[contexto] || `${contexto}/`;

  do {
    const result = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));
    for (const obj of (result.Contents || [])) {
      totalBytes += obj.Size || 0;
      totalFiles++;
    }
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);

  return {
    totalBytes,
    totalFiles,
    formatted: formatBytes(totalBytes),
    byStatus: { processed: totalFiles, processing: 0, error: 0, deleted: 0 },
  };
}

/**
 * Calcula métricas agregadas de TODOS os contextos via S3
 */
async function getAllStorageMetrics() {
  let totalBytes = 0;
  let totalFiles = 0;
  let continuationToken = undefined;
  const recentUploads = [];

  // Listar tudo no bucket
  do {
    const result = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      ContinuationToken: continuationToken,
    }));
    for (const obj of (result.Contents || [])) {
      totalBytes += obj.Size || 0;
      totalFiles++;
      // Coletar últimos uploads
      if (recentUploads.length < 10 || obj.LastModified > recentUploads[recentUploads.length - 1]?.created_at) {
        recentUploads.push({
          media_id: obj.Key.split('/').pop(),
          contexto: obj.Key.split('/')[1] || obj.Key.split('/')[0],
          key: obj.Key,
          size: obj.Size,
          status: 'processed',
          created_at: obj.LastModified?.toISOString() || '',
        });
      }
    }
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);

  // Ordenar e pegar top 10
  recentUploads.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  return {
    totalBytes,
    totalFiles,
    processedOk: totalFiles,
    errorsDlq: 0,
    dlqMessages: 0,
    lastDlqError: null,
    recentUploads: recentUploads.slice(0, 10),
    formatted: formatBytes(totalBytes),
  };
}

module.exports = { getStorageMetrics, getAllStorageMetrics, formatBytes };
