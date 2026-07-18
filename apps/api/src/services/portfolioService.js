const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const logger = require('../config/logger');

const s3 = new S3Client({});
const BUCKET = process.env.S3_BUCKET_NAME;

/**
 * Gera presigned URL para upload direto ao S3
 * @param {string} key - S3 object key
 * @param {string} contentType - MIME type do arquivo
 * @param {number} expiresIn - Tempo de expiração em segundos
 * @returns {Promise<string>} presigned URL
 */
async function gerarPresignedUrl(key, contentType, expiresIn = 600) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn });
  return url;
}

/**
 * Deleta todas as fotos de uma categoria do DDB e S3
 * @param {string} categoriaId - ID da categoria
 */
async function deletarFotosCategoria(categoriaId) {
  // Query all photos for this category
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': 'TENANT#1',
      ':sk': `FOTOPORT#${categoriaId}#`,
    },
  }));

  const fotos = result.Items || [];
  if (fotos.length === 0) return;

  // Delete S3 objects
  const s3Deletes = fotos
    .filter(foto => foto.s3_key)
    .map(foto => s3.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: foto.s3_key,
    })).catch(err => {
      logger.warn({ action: 'portfolio_s3_delete_error', key: foto.s3_key, error: err.message });
    }));

  await Promise.all(s3Deletes);

  // Batch delete from DynamoDB (max 25 per batch)
  const batches = [];
  for (let i = 0; i < fotos.length; i += 25) {
    const batch = fotos.slice(i, i + 25).map(foto => ({
      DeleteRequest: {
        Key: { PK: foto.PK, SK: foto.SK },
      },
    }));
    batches.push(batch);
  }

  for (const batch of batches) {
    await dynamo.send(new BatchWriteCommand({
      RequestItems: {
        [TABLE]: batch,
      },
    }));
  }

  logger.info({ action: 'portfolio_fotos_categoria_deleted', categoriaId, count: fotos.length });
}

/**
 * Placeholder para processamento de foto do portfolio (chamado por S3 trigger)
 * Futuramente usará Sharp para gerar thumbnails e versões otimizadas
 * @param {string} s3Key - Chave do objeto no S3
 * @param {string} fotoId - ID da foto
 * @param {string} categoriaId - ID da categoria
 */
async function processarFotoPortfolio(s3Key, fotoId, categoriaId) {
  logger.info({ action: 'portfolio_processar_foto_start', s3Key, fotoId, categoriaId });

  // TODO: Implementar processamento com Sharp
  // 1. Download da imagem original do S3
  // 2. Gerar thumbnail (400x400)
  // 3. Gerar versão web otimizada (1920px max width)
  // 4. Upload das versões processadas ao S3
  // 5. Atualizar registro no DynamoDB com URLs das versões e status=pronta

  // Placeholder: apenas marca como pronta
  const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: {
      PK: 'TENANT#1',
      SK: `FOTOPORT#${categoriaId}#${fotoId}`,
    },
    UpdateExpression: 'SET #status = :status, processadoEm = :now',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': 'pronta',
      ':now': new Date().toISOString(),
    },
  }));

  logger.info({ action: 'portfolio_processar_foto_done', fotoId, categoriaId });
}

module.exports = {
  gerarPresignedUrl,
  deletarFotosCategoria,
  processarFotoPortfolio,
};
