import { getWhatsAppConfig } from '../../utils/ssm.js';
import { validatePayload } from './validator.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME;

export const main = async (event) => {
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

  const { verifyToken } = await getWhatsAppConfig();

  if (mode === 'subscribe' && token === verifyToken) {
    console.log(JSON.stringify({ level: 'info', message: 'Webhook verificado com sucesso' }));
    return { statusCode: 200, body: challenge };
  }

  console.log(JSON.stringify({ level: 'warn', message: 'Verificação falhou', mode, token }));
  return { statusCode: 403, body: 'Forbidden' };
}

async function handleNotification(event) {
  const body = JSON.parse(event.body || '{}');

  if (!validatePayload(body)) {
    return { statusCode: 200, body: 'ignored' };
  }

  for (const entry of body.entry) {
    for (const change of (entry.changes || [])) {
      if (change.field !== 'messages') continue;
      const value = change.value || {};

      for (const msg of (value.messages || [])) {
        await ddb.send(new PutCommand({
          TableName: TABLE,
          Item: {
            PK: `WHATSAPP#${msg.from}`,
            SK: `MSG#${msg.timestamp}#${msg.id}`,
            type: msg.type,
            text: msg.text?.body || null,
            mediaId: msg[msg.type]?.id || null,
            timestamp: msg.timestamp,
            raw: JSON.stringify(msg),
            createdAt: new Date().toISOString(),
          },
        }));
      }

      for (const status of (value.statuses || [])) {
        await ddb.send(new PutCommand({
          TableName: TABLE,
          Item: {
            PK: `WHATSAPP#${status.recipient_id}`,
            SK: `STATUS#${status.timestamp}#${status.id}`,
            status: status.status,
            messageId: status.id,
            timestamp: status.timestamp,
            createdAt: new Date().toISOString(),
          },
        }));
      }
    }
  }

  return { statusCode: 200, body: 'ok' };
}
