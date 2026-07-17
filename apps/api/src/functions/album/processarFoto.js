/**
 * ALB-03: Processamento assíncrono de 3 versões de foto
 * Triggered by SQS queue
 * Gera: thumb (400px), media (2048px), preserva original
 */

const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME;
const BUCKET = process.env.S3_BUCKET_NAME;

const VERSIONS = [
  { name: 'thumb', maxWidth: 400, quality: 75 },
  { name: 'media', maxWidth: 2048, quality: 85 },
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

      // 2. Tentar carregar sharp (pode não estar disponível em todas as Lambdas)
      let sharp;
      try {
        sharp = require('sharp');
      } catch (e) {
        console.warn('Sharp not available, skipping image processing:', e.message);
        // Marcar como completo sem processamento
        await updateFoto(tenant_id, foto_id, {
          status_processamento: 'completo_sem_resize',
          url_media: s3_key_original,
          url_thumb: s3_key_original,
        });
        continue;
      }

      // 3. Ler metadados
      const metadata = await sharp(buffer).metadata();
      const { width, height } = metadata;

      // 4. Gerar versões
      const basePath = s3_key_original.replace(/\/original\//, '/').replace(/\.[^.]+$/, '');
      const ext = s3_key_original.split('.').pop() || 'jpg';
      const urls = {};

      for (const version of VERSIONS) {
        // Só redimensiona se imagem é maior que o maxWidth
        if (width > version.maxWidth) {
          const resized = await sharp(buffer)
            .resize(version.maxWidth, null, { withoutEnlargement: true })
            .jpeg({ quality: version.quality })
            .toBuffer();

          const key = `${version.name}/${tenant_id}/${album_id}/${foto_id}.jpg`;
          await s3.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: resized,
            ContentType: 'image/jpeg',
          }));
          urls[`url_${version.name}`] = key;
        } else {
          // Imagem já é pequena o suficiente
          urls[`url_${version.name}`] = s3_key_original;
        }
      }

      // 5. Atualizar DynamoDB
      await updateFoto(tenant_id, foto_id, {
        status_processamento: 'completo',
        url_media: urls.url_media || s3_key_original,
        url_thumb: urls.url_thumb || s3_key_original,
        width,
        height,
        processado_em: new Date().toISOString(),
      });

      console.log(`[FOTO] Processado: ${foto_id} (${width}x${height})`);
    } catch (error) {
      console.error(`[FOTO] Erro processando ${foto_id}:`, error.message);
      // Marcar como erro no DynamoDB
      await updateFoto(tenant_id, foto_id, {
        status_processamento: 'erro',
        erro_processamento: error.message,
      }).catch(() => {});
      throw error; // Re-throw para SQS retry
    }
  }
};

async function updateFoto(tenantId, fotoId, updates) {
  const keys = Object.keys(updates);
  const expr = 'SET ' + keys.map((k, i) => `#f${i} = :v${i}`).join(', ');
  const names = Object.fromEntries(keys.map((k, i) => [`#f${i}`, k]));
  const values = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updates[k]]));

  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `TENANT#${tenantId}`, SK: `FOTO#${fotoId}` },
    UpdateExpression: expr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

module.exports = { handler };
