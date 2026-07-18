'use strict';

const { S3Client, PutObjectTaggingCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME = process.env.TABLE_NAME;
const PUBLIC_BUCKET = process.env.MEDIA_PUBLIC_BUCKET;

/**
 * Calculate the cutoff date (30 days ago) in ISO format.
 */
function getCutoffDate() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return cutoff.toISOString();
}

/**
 * Query DynamoDB for media items with status='deleted' and deleted_at > 30 days ago.
 * Uses GSI2 on status + deleted_at for efficient querying.
 * Handles pagination automatically.
 */
async function queryDeletedItems(cutoffDate) {
  const items = [];
  let lastEvaluatedKey = undefined;

  do {
    const params = {
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: '#status = :status AND deleted_at <= :cutoff',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'deleted',
        ':cutoff': cutoffDate,
      },
      Limit: 100,
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    const result = await ddb.send(new QueryCommand(params));
    items.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;

    console.log(`Fetched ${result.Items?.length || 0} items (total: ${items.length})`);
  } while (lastEvaluatedKey);

  return items;
}

/**
 * Tag all S3 objects (original + derived versions) with status=deleted.
 * This triggers S3 lifecycle rules to eventually purge the objects.
 */
async function tagObjectsForDeletion(item) {
  const objectsToTag = [];

  // Original object
  if (item.original?.bucket && item.original?.key) {
    objectsToTag.push({ bucket: item.original.bucket, key: item.original.key });
  }

  // Derived versions
  if (item.versions) {
    for (const version of Object.values(item.versions)) {
      if (version.bucket && version.key) {
        objectsToTag.push({ bucket: version.bucket, key: version.key });
      }
    }
  }

  const tagging = {
    TagSet: [{ Key: 'status', Value: 'deleted' }],
  };

  const results = await Promise.allSettled(
    objectsToTag.map((obj) =>
      s3.send(new PutObjectTaggingCommand({
        Bucket: obj.bucket,
        Key: obj.key,
        Tagging: tagging,
      }))
    )
  );

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    console.warn(`${failures.length}/${objectsToTag.length} tagging operations failed for media_id=${item.media_id}`);
    for (const failure of failures) {
      console.warn(`  Error: ${failure.reason?.message || failure.reason}`);
    }
    // If all failed, throw so we don't mark as purged
    if (failures.length === objectsToTag.length) {
      throw new Error(`All tagging operations failed for media_id=${item.media_id}`);
    }
  }

  return objectsToTag.length - failures.length;
}

/**
 * Update the DynamoDB record status to 'purged'.
 */
async function markAsPurged(item) {
  const now = new Date().toISOString();

  await ddb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: item.PK, SK: item.SK },
    UpdateExpression: 'SET #status = :purged, purged_at = :now, updated_at = :now',
    ConditionExpression: '#status = :deleted',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':purged': 'purged',
      ':now': now,
      ':deleted': 'deleted',
    },
  }));
}

/**
 * Lambda handler — runs on a daily schedule (EventBridge/CloudWatch Events).
 * Processes deleted media items older than 30 days, tagging their S3 objects
 * for lifecycle expiration and updating their DynamoDB status to 'purged'.
 */
exports.handler = async (event) => {
  console.log('Starting lifecycle rules application');

  const cutoffDate = getCutoffDate();
  console.log(`Cutoff date: ${cutoffDate} (items deleted before this will be purged)`);

  // Query all eligible items
  const items = await queryDeletedItems(cutoffDate);
  console.log(`Found ${items.length} items eligible for purging`);

  if (items.length === 0) {
    console.log('No items to process. Done.');
    return { statusCode: 200, processed: 0, errors: 0 };
  }

  let processed = 0;
  let errors = 0;

  // Process items in batches to avoid overwhelming S3
  const BATCH_SIZE = 25;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (item) => {
        try {
          // Tag S3 objects
          const tagged = await tagObjectsForDeletion(item);
          console.log(`Tagged ${tagged} objects for media_id=${item.media_id}`);

          // Update DynamoDB status
          await markAsPurged(item);
          console.log(`Marked as purged: media_id=${item.media_id}`);

          return true;
        } catch (err) {
          console.error(`Failed to process media_id=${item.media_id}: ${err.message}`);
          throw err;
        }
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        processed++;
      } else {
        errors++;
      }
    }

    console.log(`Batch progress: ${i + batch.length}/${items.length} (processed: ${processed}, errors: ${errors})`);
  }

  const summary = {
    statusCode: 200,
    total: items.length,
    processed,
    errors,
    cutoffDate,
  };

  console.log('Lifecycle rules application complete:', JSON.stringify(summary));
  return summary;
};
