// ══════════════════════════════════════════════════════════════
// SERVICES/S3-SERVICE.JS — Upload, download e gerenciamento S3
// ══════════════════════════════════════════════════════════════

import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { v4 as uuid } from 'uuid';

const s3 = new S3Client({ region: env.AWS_REGION });
const BUCKET = process.env.S3_BUCKET_NAME || env.S3_BUCKET_NAME;
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
    url: `https://${BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`,
    url_thumb: `https://${BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${thumbKey}`,
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

export async function generateUploadUrl(tenantId, albumId, contentType) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(contentType)) throw new Error('Content-Type não permitido');
  const ext = contentType.split('/')[1];
  const key = `fotos/${tenantId}/${albumId}/${uuid()}.${ext}`;
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
  return { uploadUrl, key };
}

export async function generateViewUrl(key, expiresInHours = 24) {
  const { getSignedUrl: cfSign } = await import('@aws-sdk/cloudfront-signer');
  const url = `${process.env.CLOUDFRONT_DOMAIN}/${key}`;
  return cfSign({
    url,
    keyPairId: process.env.CF_KEY_PAIR_ID,
    privateKey: process.env.CF_PRIVATE_KEY,
    dateLessThan: new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString(),
  });
}

export async function uploadBackup(buffer, filename) {
  const key = `backups/${filename}`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'application/gzip',
  }));
  return { s3_key: key };
}

export default { uploadFoto, deleteFoto, deleteAlbumFolder, getSignedDownloadUrl, uploadBackup };
