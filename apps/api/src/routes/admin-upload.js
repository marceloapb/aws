// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-UPLOAD.JS — Upload genérico com presigned URL (por folder)
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuid } = require('uuid');

const router = Router();
const s3 = new S3Client({});

const PUBLIC_BUCKET = process.env.MEDIA_PUBLIC_BUCKET || process.env.S3_BUCKET_NAME;

// Folders permitidos e suas regras
const FOLDER_RULES = {
  'template-headers': {
    maxBytes: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    description: 'Imagens de header para templates WhatsApp',
  },
  'email-headers': {
    maxBytes: 3 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    description: 'Imagens de header para emails',
  },
  'general': {
    maxBytes: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    description: 'Upload genérico',
  },
};

/**
 * POST /presign
 * Body: { filename, contentType, folder }
 * Returns: { success, data: { upload_url, key, expires_in } }
 */
router.post('/presign', async (req, res) => {
  try {
    const { filename, contentType, folder } = req.body;

    if (!filename || !contentType || !folder) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: filename, contentType, folder',
      });
    }

    // Validar folder
    const rules = FOLDER_RULES[folder];
    if (!rules) {
      return res.status(400).json({
        success: false,
        message: `Folder inválido: ${folder}. Permitidos: ${Object.keys(FOLDER_RULES).join(', ')}`,
      });
    }

    // Validar content type
    if (!rules.allowedTypes.includes(contentType)) {
      return res.status(400).json({
        success: false,
        message: `Content-Type não permitido para ${folder}. Permitidos: ${rules.allowedTypes.join(', ')}`,
      });
    }

    // Gerar key única no S3
    const ext = filename.split('.').pop()?.toLowerCase() || 'bin';
    const fileId = uuid();
    const key = `${folder}/${fileId}.${ext}`;

    // Gerar presigned URL
    const command = new PutObjectCommand({
      Bucket: PUBLIC_BUCKET,
      Key: key,
      ContentType: contentType,
      Metadata: {
        'original-filename': filename,
        'folder': folder,
      },
    });

    const upload_url = await getSignedUrl(s3, command, { expiresIn: 300 });

    res.json({
      success: true,
      data: {
        upload_url,
        key,
        expires_in: 300,
        cdn_url: `https://d2112x4m4e89fv.cloudfront.net/${key}`,
      },
    });
  } catch (error) {
    console.error('[UPLOAD] Erro ao gerar presigned URL:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
