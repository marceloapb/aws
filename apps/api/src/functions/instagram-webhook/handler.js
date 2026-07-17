const crypto = require('crypto');
const { getParam } = require('../../utils/ssm');
const { validatePayload } = require('./validator');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME;
const PREFIX = process.env.SSM_PREFIX || '/mbf/prod';

const main = async (event) => {
  const method = event.requestContext?.http?.method;

  if (method === 'GET') return handleVerification(event);
  if (method === 'POST') return handleNotification(event);

  return { statusCode: 405, body: 'Method Not Allowed' };
};

async function handleVerification(event) {
  const params = event.queryStringParameters || {};
  const mode = params['hub.mode'];
  const token = params['hub.verify_token'];
  const challenge = params['hub.challenge'];

  const verifyToken = await getParam(`${PREFIX}/INSTAGRAM_VERIFY_TOKEN`);

  if (mode === 'subscribe' && token === verifyToken) {
    console.log(JSON.stringify({ level: 'info', event: 'ig_webhook_verified' }));
    return { statusCode: 200, body: challenge };
  }

  console.log(JSON.stringify({ level: 'warn', event: 'ig_webhook_verify_failed', mode }));
  return { statusCode: 403, body: 'Forbidden' };
}

async function handleNotification(event) {
  const appSecret = await getParam(`${PREFIX}/INSTAGRAM_APP_SECRET`);
  const signature = event.headers?.['x-hub-signature-256'] || '';
  const expectedSig = 'sha256=' + crypto.createHmac('sha256', appSecret).update(event.body || '').digest('hex');

  if (signature !== expectedSig) {
    console.log(JSON.stringify({ level: 'warn', event: 'ig_invalid_signature' }));
    return { statusCode: 401, body: 'Invalid signature' };
  }

  const body = JSON.parse(event.body || '{}');
  if (!validatePayload(body)) return { statusCode: 200, body: 'ignored' };

  for (const entry of body.entry) {
    for (const change of (entry.changes || [])) {
      await ddb.send(new PutCommand({
        TableName: TABLE,
        Item: {
          PK: `INSTAGRAM#${entry.id}`,
          SK: `EVENT#${Date.now()}#${change.field}`,
          field: change.field,
          value: JSON.stringify(change.value),
          createdAt: new Date().toISOString(),
        },
      }));
    }
  }

  return { statusCode: 200, body: 'ok' };
}

module.exports = { main };
