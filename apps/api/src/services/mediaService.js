// ══════════════════════════════════════════════════════════════
// SERVICES/MEDIA-SERVICE.JS — CRUD de registros de mídia no DynamoDB
// ══════════════════════════════════════════════════════════════

const { dynamo, TABLE } = require('../config/dynamodb');
const { PutCommand, GetCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const TENANT_PK = 'TENANT#1';

/**
 * Cria registro de mídia no DynamoDB
 * @param {object} data - { media_id, contexto, entidade_id, key, bucket, content_type, size_bytes, status, ordem, ... }
 */
async function createMediaRecord(data) {
  const {
    media_id,
    contexto,
    entidade_id,
    key,
    bucket,
    content_type,
    size_bytes,
    status = 'processing',
    ordem = 0,
    original_filename,
    tenant_id,
  } = data;

  const now = new Date().toISOString();

  const item = {
    PK: TENANT_PK,
    SK: `MEDIA#${contexto}#${entidade_id}#${media_id}`,
    GSI1PK: `${TENANT_PK}#MEDIA#${contexto}`,
    GSI1SK: `${entidade_id}#${String(ordem).padStart(5, '0')}`,
    media_id,
    contexto,
    entidade_id,
    key,
    bucket,
    content_type,
    size_bytes,
    original_size: size_bytes,
    web_size: 0,
    thumb_size: 0,
    web_key: null,
    thumb_key: null,
    status,
    ordem,
    original_filename: original_filename || null,
    tenant_id: tenant_id || null,
    created_at: now,
    updated_at: now,
  };

  await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
}

/**
 * Lista mídias de um contexto/entidade (GSI1 query)
 * Filtra status != 'deleted' e != 'purged'
 */
async function listMedia(contexto, entidade_id) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
    FilterExpression: '#s <> :deleted AND #s <> :purged',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':pk': `${TENANT_PK}#MEDIA#${contexto}`,
      ':sk': `${entidade_id}#`,
      ':deleted': 'deleted',
      ':purged': 'purged',
    },
  }));

  return (result.Items || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
}

/**
 * Soft-delete de mídia (marca status=deleted)
 */
async function deleteMedia(media_id, contexto, entidade_id) {
  const now = new Date().toISOString();

  const result = await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: {
      PK: TENANT_PK,
      SK: `MEDIA#${contexto}#${entidade_id}#${media_id}`,
    },
    UpdateExpression: 'SET #s = :status, deleted_at = :now, updated_at = :now',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':status': 'deleted',
      ':now': now,
    },
    ReturnValues: 'ALL_NEW',
  }));

  return result.Attributes;
}

/**
 * Busca mídia por ID (GetItem)
 */
async function getMediaById(media_id, contexto, entidade_id) {
  const result = await dynamo.send(new GetCommand({
    TableName: TABLE,
    Key: {
      PK: TENANT_PK,
      SK: `MEDIA#${contexto}#${entidade_id}#${media_id}`,
    },
  }));

  return result.Item || null;
}

/**
 * Atualiza ordem de mídia
 */
async function updateOrdem(media_id, contexto, entidade_id, ordem) {
  const result = await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: {
      PK: TENANT_PK,
      SK: `MEDIA#${contexto}#${entidade_id}#${media_id}`,
    },
    UpdateExpression: 'SET ordem = :ordem, GSI1SK = :gsi1sk, updated_at = :now',
    ExpressionAttributeValues: {
      ':ordem': ordem,
      ':gsi1sk': `${entidade_id}#${String(ordem).padStart(5, '0')}`,
      ':now': new Date().toISOString(),
    },
    ReturnValues: 'ALL_NEW',
  }));

  return result.Attributes;
}

/**
 * Query todas as mídias de um contexto (para métricas)
 */
async function queryAllByContext(contexto) {
  const items = [];
  let lastKey = undefined;

  do {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `${TENANT_PK}#MEDIA#${contexto}`,
      },
      ExclusiveStartKey: lastKey,
    }));

    items.push(...(result.Items || []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

module.exports = {
  createMediaRecord,
  listMedia,
  deleteMedia,
  getMediaById,
  updateOrdem,
  queryAllByContext,
};
