// ══════════════════════════════════════════════════════════════
// SERVICES/S3-SERVICE.JS — Upload, download e gerenciamento S3
// ══════════════════════════════════════════════════════════════

import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { env } from '../config/env.js';

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = env.S3_BUCKET;
const THUMB_WIDTH = 400;
const THUMB_QUALITY = 80;

export async function uploadFoto(buffer, key, mimeType) {
  // Processar imagem com sharp
  const metadata = await sharp(buffer).metadata();

  // Upload original
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  // Gerar e upload thumbnail
  const thumbBuffer = await sharp(buffer)
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
    url: `https://${env.CLOUDFRONT_DOMAIN}/${key}`,
    url_thumb: `https://${env.CLOUDFRONT_DOMAIN}/${thumbKey}`,
    largura: metadata.width,
    altura: metadata.height,
    tamanho_bytes: buffer.length,
  };
}

export async function deleteFoto(key) {
  const thumbKey = key.replace(/\.[^.]+$/, '_thumb.jpg');

  await s3.send(new DeleteObjectsCommand({
    Bucket: BUCKET,
    Delete: {
      Objects: [{ Key: key }, { Key: thumbKey }],
    },
  }));
}

export async function deleteAlbumFolder(albumId) {
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

export async function getSignedDownloadUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function uploadBackup(buffer, filename) {
  const key = `backups/${filename}`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'application/gzip',
    StorageClass: 'GLACIER_IR',
  }));
  return { s3_key: key };
}

export default { uploadFoto, deleteFoto, deleteAlbumFolder, getSignedDownloadUrl, uploadBackup };
