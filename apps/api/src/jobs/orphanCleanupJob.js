// ══════════════════════════════════════════════════════════════
// JOBS/ORPHAN-CLEANUP-JOB.JS — Limpeza semanal de arquivos órfãos no S3
// ══════════════════════════════════════════════════════════════

const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({});
const BUCKET = process.env.S3_BUCKET_NAME || 'mbf-backend-v3-fotos';
const TENANT_PREFIX = '3438a468-a031-7040-2d21-abc059a80915';

/**
 * Busca todos os álbuns ativos no DynamoDB
 */
async function getAlbumIds() {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'ALBUM' },
    ProjectionExpression: 'id',
  }));
  return (result.Items || []).map(a => a.id);
}

/**
 * Busca todas as s3_keys registradas para um álbum
 */
async function getValidKeys(albumId) {
  const keys = new Set();
  let lastKey = undefined;

  do {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ALBUM#${albumId}`, ':sk': 'FOTO#' },
      ProjectionExpression: 's3_key, s3_key_original, s3_key_media, s3_key_thumb',
      ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
    }));

    for (const item of (result.Items || [])) {
      if (item.s3_key) keys.add(item.s3_key);
      if (item.s3_key_original) keys.add(item.s3_key_original);
      if (item.s3_key_media) keys.add(item.s3_key_media);
      if (item.s3_key_thumb) keys.add(item.s3_key_thumb);
    }
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return keys;
}

/**
 * Lista todos os arquivos S3 de um álbum
 */
async function listS3Keys(albumId) {
  const prefix = `${TENANT_PREFIX}/album/${albumId}/`;
  const keys = [];
  let continuationToken = undefined;

  do {
    const result = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));
    for (const obj of (result.Contents || [])) {
      keys.push(obj.Key);
    }
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

/**
 * Executa limpeza de órfãos
 */
async function executarLimpeza() {
  console.log('[ORPHAN CLEANUP] Iniciando...');
  const albumIds = await getAlbumIds();
  console.log(`[ORPHAN CLEANUP] ${albumIds.length} álbuns encontrados`);

  let totalOrphans = 0;
  let totalDeleted = 0;

  for (const albumId of albumIds) {
    const validKeys = await getValidKeys(albumId);
    const s3Keys = await listS3Keys(albumId);

    const orphans = s3Keys.filter(key => !validKeys.has(key));

    if (orphans.length === 0) continue;

    console.log(`[ORPHAN CLEANUP] Album ${albumId}: ${orphans.length} órfãos de ${s3Keys.length} total`);
    totalOrphans += orphans.length;

    // Deletar em batches de 1000
    for (let i = 0; i < orphans.length; i += 1000) {
      const batch = orphans.slice(i, i + 1000);
      await s3.send(new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: {
          Objects: batch.map(Key => ({ Key })),
          Quiet: true,
        },
      }));
      totalDeleted += batch.length;
    }
  }

  // Verificar pastas de álbuns que não existem mais no DynamoDB
  const prefix = `${TENANT_PREFIX}/album/`;
  const listResult = await s3.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix,
    Delimiter: '/',
  }));

  const s3Folders = (listResult.CommonPrefixes || [])
    .map(p => p.Prefix.replace(prefix, '').replace('/', ''))
    .filter(f => f.match(/^[0-9a-f]{8}-/)); // Só UUIDs (ignora email-logo, favicon, etc)

  const orphanFolders = s3Folders.filter(f => !albumIds.includes(f));

  for (const folder of orphanFolders) {
    const folderKeys = await listS3Keys(folder);
    if (folderKeys.length > 0) {
      console.log(`[ORPHAN CLEANUP] Pasta órfã ${folder}: ${folderKeys.length} arquivos`);
      for (let i = 0; i < folderKeys.length; i += 1000) {
        const batch = folderKeys.slice(i, i + 1000);
        await s3.send(new DeleteObjectsCommand({
          Bucket: BUCKET,
          Delete: { Objects: batch.map(Key => ({ Key })), Quiet: true },
        }));
        totalDeleted += batch.length;
      }
      totalOrphans += folderKeys.length;
    }
  }

  console.log(`[ORPHAN CLEANUP] Concluído: ${totalOrphans} órfãos encontrados, ${totalDeleted} deletados`);
  return { totalOrphans, totalDeleted, albumsChecked: albumIds.length, orphanFolders: orphanFolders.length };
}

// Lambda handler
exports.handler = async (event) => {
  try {
    const result = await executarLimpeza();
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    console.error('[ORPHAN CLEANUP] Erro:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

module.exports = { executarLimpeza };
