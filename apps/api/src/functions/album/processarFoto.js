/**
 * Processamento assíncrono de fotos de álbum
 * Triggered by SQS queue
 * Gera: thumb (400px WebP), media/web (2048px WebP), preserva original
 * Bucket: privado (mbf-backend-v3-fotos)
 */

const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME;
const BUCKET = process.env.S3_BUCKET_NAME;

const VERSIONS = [
  { name: 'web', maxWidth: 2048, quality: 85, format: 'webp' },
  { name: 'thumb', maxWidth: 400, quality: 70, format: 'webp' },
];

const handler = async (event) => {
  for (const record of event.Records) {
    const message = JSON.parse(record.body);
    const { tenant_id, album_id, galeria_id, foto_id, s3_key_original } = message;

    try {
      // 1. Baixar original do S3
      const getResult = await s3.send(new GetObjectCommand({
        Bucket: BUCKET,
        Key: s3_key_original,
      }));
      const buffer = Buffer.from(await getResult.Body.transformToByteArray());

      // 2. Carregar sharp
      let sharp;
      try {
        sharp = require('sharp');
      } catch (e) {
        console.warn('Sharp not available, marking as processed without resize:', e.message);
        await updateFoto(tenant_id, album_id, foto_id, {
          status_processamento: 'completo',
          s3_key_media: s3_key_original,
          s3_key_thumb: s3_key_original,
        });
        continue;
      }

      // 3. Ler metadados
      const metadata = await sharp(buffer).metadata();
      const { width, height } = metadata;

      // 4. Gerar versões
      const basePath = s3_key_original.replace(/\.[^.]+$/, '');
      const urls = {};

      for (const version of VERSIONS) {
        const needsResize = width > version.maxWidth;
        let processed;

        if (needsResize) {
          processed = await sharp(buffer)
            .resize(version.maxWidth, null, { withoutEnlargement: true, fit: 'inside' })
            .webp({ quality: version.quality })
            .toBuffer();
        } else {
          processed = await sharp(buffer)
            .webp({ quality: version.quality })
            .toBuffer();
        }

        // ALB-13: Apply watermark using company logo
        try {
          const { GetCommand } = require('@aws-sdk/lib-dynamodb');
          const configResult = await ddb.send(new GetCommand({
            TableName: TABLE,
            Key: { PK: `TENANT#${tenant_id}`, SK: 'CONFIG#logoKey' },
          }));
          const logoKey = configResult.Item?.valor;
          if (logoKey) {
            const logoResult = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: logoKey }));
            const logoBuffer = Buffer.from(await logoResult.Body.transformToByteArray());
            // Resize logo to 15% of image width with transparency
            const logoResized = await sharp(logoBuffer)
              .resize(Math.round((version.maxWidth || width) * 0.15), null, { fit: 'inside' })
              .ensureAlpha()
              .modulate({ brightness: 1 })
              .composite([{ input: Buffer.from([255, 255, 255, 128]), raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: 'dest-in' }])
              .png()
              .toBuffer();
            processed = await sharp(processed)
              .composite([{ input: logoResized, gravity: 'southeast', blend: 'over' }])
              .webp({ quality: version.quality })
              .toBuffer();
          }
        } catch (wmErr) {
          console.warn(`[FOTO] Watermark skipped for ${foto_id}:`, wmErr.message);
        }

        const key = `${basePath}-${version.name}.webp`;
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: processed,
          ContentType: 'image/webp',
          CacheControl: 'private, max-age=31536000',
        }));
        urls[`s3_key_${version.name === 'web' ? 'media' : version.name}`] = key;
      }

      // 5. Atualizar DynamoDB
      await updateFoto(tenant_id, album_id, foto_id, {
        status_processamento: 'completo',
        s3_key_media: urls.s3_key_media || s3_key_original,
        s3_key_thumb: urls.s3_key_thumb || s3_key_original,
        width,
        height,
        tamanho_bytes: buffer.length,
        processado_em: new Date().toISOString(),
      });

      console.log(`[FOTO] Processado: ${foto_id} (${width}x${height}) → web+thumb WebP`);
    } catch (error) {
      console.error(`[FOTO] Erro processando ${foto_id}:`, error.message);
      await updateFoto(tenant_id, album_id, foto_id, {
        status_processamento: 'erro',
        erro_processamento: error.message,
      }).catch(() => {});
      throw error; // Re-throw para SQS retry → DLQ
    }
  }
};

async function updateFoto(tenantId, albumId, fotoId, updates) {
  const keys = Object.keys(updates);
  const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
  const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
  const values = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));

  // Tenta com PK do álbum (padrão novo)
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `ALBUM#${albumId}`, SK: `FOTO#${fotoId}` },
    UpdateExpression: expr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

module.exports = { handler };
