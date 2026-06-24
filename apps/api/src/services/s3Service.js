// ══════════════════════════════════════════════════════════════
// SERVICES/S3-SERVICE.JS — Upload, download e gerenciamento S3
// ══════════════════════════════════════════════════════════════

import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { s3Client } from '../config/s3.js';
import { env } from '../config/env.js';

const THUMB_WIDTH = 400;
const THUMB_QUALITY = 80;

export async function uploadFoto(buffer, key, mimeType) {
  // Upload original
  await s3Client.send(new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  // Gerar e upload thumbnail
  const thumbBuffer = await sharp(buffer)
    .resize(THUMB_WIDTH)
    .jpeg({ quality: THUMB_QUALITY })
    .toBuffer();

  const thumbKey = key.replace(/\/([^/]+)$/, '/thumbs/$1');
  await s3Client.send(new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: thumbKey,
    Body: thumbBuffer,
    ContentType: 'image/jpeg',
  }));

  // Obter metadados da imagem
  const metadata = await sharp(buffer).metadata();

  return {
    s3_key: key,
    s3_key_thumb: thumbKey,
    url: getPublicUrl(key),
    url_thumb: getPublicUrl(thumbKey),
    largura: metadata.width,
    altura: metadata.height,
    tamanho_bytes: buffer.length,
  };
}

export async function deleteFoto(key) {
  await s3Client.send(new DeleteObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  }));

  // Deletar thumbnail também
  const thumbKey = key.replace(/\/([^/]+)$/, '/thumbs/$1');
  await s3Client.send(new DeleteObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: thumbKey,
  }));
}

export async function deleteAlbumFolder(albumId) {
  const prefix = `albuns/${albumId}/`;
  const listResult = await s3Client.send(new ListObjectsV2Command({
    Bucket: env.S3_BUCKET,
    Prefix: prefix,
  }));

  if (listResult.Contents && listResult.Contents.length > 0) {
    for (const obj of listResult.Contents) {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: obj.Key,
      }));
    }
  }
}

export async function getSignedDownloadUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

export function getPublicUrl(key) {
  if (env.CLOUDFRONT_DOMAIN) {
    return `https://${env.CLOUDFRONT_DOMAIN}/${key}`;
  }
  return `https://${env.S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}

export async function uploadBackup(buffer, filename) {
  await s3Client.send(new PutObjectCommand({
    Bucket: env.S3_BACKUP_BUCKET,
    Key: `backups/${filename}`,
    Body: buffer,
    ContentType: 'application/gzip',
  }));

  return { s3_key: `backups/${filename}` };
}
