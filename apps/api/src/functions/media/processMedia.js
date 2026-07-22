'use strict';

const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const sharp = require('sharp');

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME = process.env.TABLE_NAME;
const PUBLIC_BUCKET = process.env.MEDIA_PUBLIC_BUCKET;

/**
 * Processing config per contexto.
 * Each entry defines which derived versions to generate and their parameters.
 */
const CONTEXT_CONFIG = {
  album: {
    bucket: 'private',
    versions: {
      web: { maxDimension: 2048, quality: 85, format: 'webp' },
      thumb: { maxDimension: 400, quality: 70, format: 'webp' },
    },
  },
  portfolio: {
    bucket: 'public',
    versions: {
      web: { maxDimension: 2048, quality: 85, format: 'webp' },
      thumb: { maxDimension: 600, quality: 70, format: 'webp' },
    },
  },
  novidades: {
    bucket: 'public',
    versions: {
      web: { maxDimension: 1200, quality: 85, format: 'webp' },
      thumb: { maxDimension: 400, quality: 70, format: 'webp' },
    },
  },
  perfil: {
    bucket: 'public',
    versions: {
      thumb: { maxDimension: 200, quality: 80, format: 'webp' },
    },
  },
};

/**
 * Parse the S3 object key to extract tenant, contexto, entidade, and media identifiers.
 * Expected pattern: {tenant}/{contexto}/{entidade}/{ulid}-original.{ext}
 */
function parseKey(key) {
  const decodedKey = decodeURIComponent(key.replace(/\+/g, ' '));
  const parts = decodedKey.split('/');

  if (parts.length !== 4) {
    throw new Error(`Invalid key structure: expected 4 segments, got ${parts.length} — key: ${decodedKey}`);
  }

  const [tenant_id, contexto, entidade_id, filename] = parts;

  // filename pattern: {ulid}-original.{ext}
  const match = filename.match(/^(.+)-original\.(.+)$/);
  if (!match) {
    throw new Error(`Invalid filename pattern: ${filename} — expected {ulid}-original.{ext}`);
  }

  const [, media_id, extension] = match;

  return { tenant_id, contexto, entidade_id, media_id, extension, filename };
}

/**
 * Download the original image from S3 and return it as a Buffer.
 */
async function downloadOriginal(bucket, key) {
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Process the image buffer into a derived version using Sharp.
 * Uses 'fit: inside' to constrain the longest edge (aresta maior) to maxDimension,
 * preserving aspect ratio without enlarging.
 */
async function processVersion(buffer, config) {
  const maxDim = config.maxDimension || config.maxWidth;
  return sharp(buffer)
    .resize({
      width: maxDim,
      height: maxDim,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: config.quality })
    .toBuffer();
}

/**
 * Upload a processed buffer to S3.
 */
async function uploadVersion(bucket, key, buffer) {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

/**
 * Get metadata from the original image.
 */
async function getOriginalMetadata(buffer) {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
    size: buffer.length,
    format: metadata.format,
  };
}

/**
 * Store the media record in DynamoDB.
 */
async function createDynamoRecord({ tenant_id, contexto, entidade_id, media_id, extension, originalMeta, versions, sourceBucket, targetBucket }) {
  const now = new Date().toISOString();

  const item = {
    PK: `TENANT#${tenant_id}`,
    SK: `MEDIA#${contexto}#${entidade_id}#${media_id}`,
    GSI1PK: `TENANT#${tenant_id}#${contexto}#${entidade_id}`,
    GSI1SK: `MEDIA#${media_id}`,
    entity_type: 'Media',
    tenant_id,
    contexto,
    entidade_id,
    media_id,
    original: {
      bucket: sourceBucket,
      key: `${tenant_id}/${contexto}/${entidade_id}/${media_id}-original.${extension}`,
      width: originalMeta.width,
      height: originalMeta.height,
      size: originalMeta.size,
      format: originalMeta.format,
    },
    versions,
    status: 'active',
    created_at: now,
    updated_at: now,
  };

  await ddb.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: item,
  }));

  return item;
}

/**
 * Process a single S3 record from the SQS event.
 */
async function processRecord(s3Record) {
  const bucket = s3Record.s3.bucket.name;
  const key = s3Record.s3.object.key;

  console.log(`Processing: s3://${bucket}/${key}`);

  // 1. Parse the key
  const { tenant_id, contexto, entidade_id, media_id, extension } = parseKey(key);

  // 2. Validate contexto
  const config = CONTEXT_CONFIG[contexto];
  if (!config) {
    throw new Error(`Unknown contexto: ${contexto}. Valid values: ${Object.keys(CONTEXT_CONFIG).join(', ')}`);
  }

  // 3. Download original
  const originalBuffer = await downloadOriginal(bucket, key);
  console.log(`Downloaded original: ${originalBuffer.length} bytes`);

  // 4. Get original metadata
  const originalMeta = await getOriginalMetadata(originalBuffer);
  console.log(`Original metadata: ${originalMeta.width}x${originalMeta.height}, ${originalMeta.format}`);

  // 5. Determine target bucket
  const targetBucket = config.bucket === 'private' ? bucket : PUBLIC_BUCKET;

  // 6. Process and upload each version
  const versions = {};
  const basePath = `${tenant_id}/${contexto}/${entidade_id}`;

  for (const [versionName, versionConfig] of Object.entries(config.versions)) {
    const processedBuffer = await processVersion(originalBuffer, versionConfig);
    const versionKey = `${basePath}/${media_id}-${versionName}.webp`;

    await uploadVersion(targetBucket, versionKey, processedBuffer);

    const versionMeta = await sharp(processedBuffer).metadata();
    versions[versionName] = {
      bucket: targetBucket,
      key: versionKey,
      width: versionMeta.width,
      height: versionMeta.height,
      size: processedBuffer.length,
      format: 'webp',
    };

    console.log(`Uploaded ${versionName}: s3://${targetBucket}/${versionKey} (${processedBuffer.length} bytes, ${versionMeta.width}x${versionMeta.height})`);
  }

  // 7. Create DynamoDB record
  await createDynamoRecord({
    tenant_id,
    contexto,
    entidade_id,
    media_id,
    extension,
    originalMeta,
    versions,
    sourceBucket: bucket,
    targetBucket,
  });

  console.log(`DynamoDB record created: MEDIA#${contexto}#${entidade_id}#${media_id}`);

  // 8. For portfolio context, update the FOTOPORT# record status to 'pronta'
  if (contexto === 'portfolio') {
    const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
    try {
      await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `TENANT#${tenant_id}`,
          SK: `FOTOPORT#${entidade_id}#${media_id}`,
        },
        UpdateExpression: 'SET #status = :status, #atualizadoEm = :now',
        ExpressionAttributeNames: { '#status': 'status', '#atualizadoEm': 'atualizadoEm' },
        ExpressionAttributeValues: {
          ':status': 'pronta',
          ':now': new Date().toISOString(),
        },
      }));
      console.log(`FOTOPORT# record updated to pronta: ${entidade_id}#${media_id}`);
    } catch (err) {
      console.warn(`Failed to update FOTOPORT# record: ${err.message}`);
    }
  }
}

/**
 * Lambda handler — receives SQS events containing S3 notifications.
 */
exports.handler = async (event) => {
  console.log(`Received ${event.Records.length} SQS message(s)`);

  for (const sqsRecord of event.Records) {
    // Parse the SQS message body which contains the S3 event
    const s3Event = JSON.parse(sqsRecord.body);

    // S3 notifications can contain multiple records
    const s3Records = s3Event.Records || [];

    for (const s3Record of s3Records) {
      // Only process ObjectCreated events
      if (!s3Record.eventName || !s3Record.eventName.startsWith('ObjectCreated')) {
        console.log(`Skipping non-creation event: ${s3Record.eventName}`);
        continue;
      }

      await processRecord(s3Record);
    }
  }

  console.log('All records processed successfully');
  return { statusCode: 200, body: 'OK' };
};
