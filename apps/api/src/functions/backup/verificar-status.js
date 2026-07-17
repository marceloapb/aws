const { DynamoDBClient, DescribeContinuousBackupsCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, GetBucketLifecycleConfigurationCommand } = require('@aws-sdk/client-s3');

const dynamodb = new DynamoDBClient({});
const s3 = new S3Client({});

const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

const handler = async () => {
  const results = {};

  // Check PITR status
  try {
    const backups = await dynamodb.send(new DescribeContinuousBackupsCommand({
      TableName: TABLE_NAME,
    }));
    const pitr = backups.ContinuousBackupsDescription?.PointInTimeRecoveryDescription;
    results.pitr_enabled = pitr?.PointInTimeRecoveryStatus === 'ENABLED';
    results.pitr_earliest_restore = pitr?.EarliestRestorableDateTime?.toISOString() || null;
    results.pitr_latest_restore = pitr?.LatestRestorableDateTime?.toISOString() || null;
  } catch (error) {
    results.pitr_enabled = false;
    results.pitr_error = error.message;
  }

  // Check S3 lifecycle
  try {
    const lifecycle = await s3.send(new GetBucketLifecycleConfigurationCommand({
      Bucket: BUCKET_NAME,
    }));
    results.s3_lifecycle_rules_count = lifecycle.Rules?.length || 0;
    results.s3_lifecycle_rules = (lifecycle.Rules || []).map(r => ({
      id: r.ID,
      status: r.Status,
      prefix: r.Prefix || r.Filter?.Prefix || '*',
    }));
  } catch (error) {
    results.s3_lifecycle_rules_count = 0;
    results.s3_lifecycle_error = error.message;
  }

  results.last_verified = new Date().toISOString();

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, data: results }),
  };
};

module.exports = { handler };
