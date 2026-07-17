// ══════════════════════════════════════════════════════════════
// SERVICES/S3-SERVICE.JS — Upload, download e gerenciamento S3
// ══════════════════════════════════════════════════════════════

const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { env } = require('../config/env');
const { v4: uuid } = require('uuid');

// Sharp é lazy-loaded pois precisa de binários linux-x64
let _sharp = null;
function getSharp() {
  if (!_sharp) {
    try { _sharp = require('sharp'); } catch (e) { console.warn('Sharp not available:', e.message); }
  }
  return _sharp;
}

const s3 = new S3Client({ region: env.AWS_REGION });
const BUCKET = process.env.S3_BUCKET_NAME || env.S3_BUCKET_NAME;
const THUMB_WIDTH = 400;
const THUMB_QUALITY = 80;

async function uploadFoto(buffer, key, mimeType) {
  // Processar imagem com sharp
  const metadata = await getSharp()(buffer).metadata();

  // Upload original
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  // Gerar e upload thumbnail
  const thumbBuffer = await getSharp()(buffer)
    .resize(THUMB_WIDTH, null, { withoutEnlargement: true })
    .jpeg({ quality: THUMB_QUALITY })
    .toBuffer();

  const thumbKey = key.replace(/\.[^.]+$/, '_thumb.jpg');
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: thumbKey,
    Body: thumbBuffer,
    ContentType: 'image/jpeg',
  }));

  return {
    s3_key: key,
    s3_key_thumb: thumbKey,
    url: `https://${BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`,
    url_thumb: `https://${BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${thumbKey}`,
    largura: metadata.width,
    altura: metadata.height,
    tamanho_bytes: buffer.length,
  };
}

async function deleteFoto(key) {
  const thumbKey = key.replace(/\.[^.]+$/, '_thumb.jpg');

  await s3.send(new DeleteObjectsCommand({
    Bucket: BUCKET,
    Delete: {
      Objects: [{ Key: key }, { Key: thumbKey }],
    },
  }));
}

async function deleteAlbumFolder(albumId) {
  const prefix = `albuns/${albumId}/`;

  const listResult = await s3.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix,
  }));

  if (!listResult.Contents || listResult.Contents.length === 0) return;

  await s3.send(new DeleteObjectsCommand({
    Bucket: BUCKET,
    Delete: {
      Objects: listResult.Contents.map((obj) => ({ Key: obj.Key })),
    },
  }));
}

async function getSignedDownloadUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

async function generateUploadUrl(tenantId, albumId, contentType) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(contentType)) throw new Error('Content-Type não permitido');
  const ext = contentType.split('/')[1];
  const key = `fotos/${tenantId}/${albumId}/${uuid()}.${ext}`;
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
  return { uploadUrl, key };
}

async function generateViewUrl(key, expiresInHours = 24) {
  const { getSignedUrl: cfSign } = require('@aws-sdk/cloudfront-signer');
  const url = `${process.env.CLOUDFRONT_DOMAIN}/${key}`;
  return cfSign({
    url,
    keyPairId: process.env.CF_KEY_PAIR_ID,
    privateKey: process.env.CF_PRIVATE_KEY,
    dateLessThan: new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString(),
  });
}

async function uploadBackup(buffer, filename) {
  const key = `backups/${filename}`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'application/gzip',
  }));
  return { s3_key: key };
}

module.exports = { uploadFoto, deleteFoto, deleteAlbumFolder, getSignedDownloadUrl, generateUploadUrl, generateViewUrl, uploadBackup };
