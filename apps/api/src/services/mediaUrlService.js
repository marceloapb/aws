// ══════════════════════════════════════════════════════════════
// SERVICES/MEDIA-URL-SERVICE.JS — Geração de URLs de leitura (presigned/CDN)
// ══════════════════════════════════════════════════════════════

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({});

const PRIVATE_BUCKET = process.env.S3_BUCKET_NAME;
const PUBLIC_BUCKET = process.env.MEDIA_PUBLIC_BUCKET || process.env.S3_BUCKET_NAME;
const CDN_DOMAIN = process.env.CDN_DOMAIN || '';

/**
 * Gera presigned GET URL para acesso a arquivos privados
 * @param {string} key - S3 key
 * @param {string} bucket - Bucket (default: private)
 * @param {number} ttl - TTL em segundos (default: 900 = 15min, original: 3600 = 60min)
 * @returns {string} presigned URL
 */
async function getPresignedReadUrl(key, bucket, ttl) {
  const targetBucket = bucket || PRIVATE_BUCKET;

  // Default TTL: 15min para variantes, 60min para originais
  let expiresIn = ttl;
  if (!expiresIn) {
    expiresIn = key.includes('-original') ? 3600 : 900;
  }

  const command = new GetObjectCommand({
    Bucket: targetBucket,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Retorna URL pública via CDN
 * @param {string} key - S3 key
 * @returns {string} CDN URL
 */
function getPublicUrl(key) {
  if (!CDN_DOMAIN) return null;
  return `https://${CDN_DOMAIN}/${key}`;
}

/**
 * Retorna URL de acordo com o bucket (presigned para private, CDN para public)
 * @param {object} item - Media item com key e bucket
 * @param {string} version - Versão desejada: 'web', 'thumb', 'original'
 * @returns {string|null} URL
 */
async function getUrlForItem(item, version = 'web') {
  const key = getKeyForVersion(item, version);
  if (!key) return null;

  // Se bucket público e CDN configurado, retorna URL pública
  if (item.bucket === PUBLIC_BUCKET && CDN_DOMAIN) {
    return getPublicUrl(key);
  }

  // Caso contrário, presigned
  return getPresignedReadUrl(key, item.bucket);
}

/**
 * Resolve a key de acordo com a versão solicitada
 */
function getKeyForVersion(item, version) {
  switch (version) {
    case 'thumb':
      return item.thumb_key || item.key;
    case 'original':
      return item.key;
    case 'web':
    default:
      return item.web_key || item.key;
  }
}

/**
 * Gera URLs em batch para múltiplos itens
 * @param {Array} media_items - Array de media items
 * @param {string} version - Versão: 'web', 'thumb', 'original'
 * @returns {Array} Items com url adicionada
 */
async function getBatchUrls(media_items, version = 'web') {
  const results = await Promise.all(
    media_items.map(async (item) => {
      const url = await getUrlForItem(item, version);
      return { ...item, url };
    })
  );
  return results;
}

module.exports = {
  getPresignedReadUrl,
  getPublicUrl,
  getBatchUrls,
  getUrlForItem,
  getKeyForVersion,
};
