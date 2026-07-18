// ══════════════════════════════════════════════════════════════
// SERVICES/MEDIA-UPLOAD-SERVICE.JS — Presigned URL para upload de mídia
// ══════════════════════════════════════════════════════════════

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuid } = require('uuid');

const s3 = new S3Client({});

const PRIVATE_BUCKET = process.env.S3_BUCKET_NAME;
const PUBLIC_BUCKET = process.env.MEDIA_PUBLIC_BUCKET || process.env.S3_BUCKET_NAME;

// Regras de validação por contexto
const CONTEXT_RULES = {
  album: {
    bucket: 'private',
    maxBytes: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['image/jpeg', 'image/png'],
    suffix: true,
  },
  portfolio: {
    bucket: 'public',
    maxBytes: 30 * 1024 * 1024, // 30MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    suffix: true,
  },
  novidades: {
    bucket: 'public',
    maxBytes: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    suffix: true,
  },
  perfil: {
    bucket: 'public',
    maxBytes: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png'],
    suffix: true,
  },
  config: {
    bucket: 'public',
    maxBytes: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/svg+xml'],
    suffix: false, // NO suffix (-original)
  },
};

/**
 * Gera ULID-like ID (timestamp sortable + random)
 */
function generateMediaId() {
  const ts = Date.now().toString(36).padStart(9, '0');
  const rand = uuid().replace(/-/g, '').slice(0, 12);
  return `${ts}${rand}`.toUpperCase();
}

/**
 * Extrai extensão do filename ou content_type
 */
function getExtension(filename, contentType) {
  if (filename) {
    const parts = filename.split('.');
    if (parts.length > 1) return parts.pop().toLowerCase();
  }
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };
  return map[contentType] || 'bin';
}

/**
 * Gera presigned PUT URL para upload direto ao S3
 * @param {object} params
 * @returns {{ upload_url, media_id, key, expires_in, bucket }}
 */
async function generateUploadUrl({ tenant_id, contexto, entidade_id, filename, content_type, size_bytes }) {
  // Validar contexto
  const rules = CONTEXT_RULES[contexto];
  if (!rules) {
    throw new Error(`Contexto inválido: ${contexto}. Permitidos: ${Object.keys(CONTEXT_RULES).join(', ')}`);
  }

  // Validar content_type
  if (!rules.allowedTypes.includes(content_type)) {
    throw new Error(`Content-Type não permitido para ${contexto}. Permitidos: ${rules.allowedTypes.join(', ')}`);
  }

  // Validar tamanho
  if (size_bytes > rules.maxBytes) {
    const maxMB = Math.round(rules.maxBytes / (1024 * 1024));
    throw new Error(`Arquivo excede o limite de ${maxMB}MB para ${contexto}`);
  }

  // Gerar IDs e key
  const media_id = generateMediaId();
  const ext = getExtension(filename, content_type);
  const suffix = rules.suffix ? `-original` : '';
  const key = `${tenant_id}/${contexto}/${entidade_id}/${media_id}${suffix}.${ext}`;

  // Selecionar bucket
  const bucket = rules.bucket === 'private' ? PRIVATE_BUCKET : PUBLIC_BUCKET;

  // Gerar presigned URL
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: content_type,
    Metadata: {
      'tenant-id': tenant_id,
      'contexto': contexto,
      'entidade-id': entidade_id,
      'media-id': media_id,
      'original-filename': filename || '',
    },
  });

  const upload_url = await getSignedUrl(s3, command, { expiresIn: 300 });

  return {
    upload_url,
    media_id,
    key,
    bucket,
    expires_in: 300,
  };
}

module.exports = { generateUploadUrl, CONTEXT_RULES, generateMediaId };
