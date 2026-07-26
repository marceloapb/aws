const { getParameter } = require('../../utils/ssm');
const { validatePayload } = require('./validator');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const TABLE = process.env.TABLE_NAME;
const BUCKET = process.env.S3_BUCKET_NAME || 'mbf-backend-v3-fotos';
const PREFIX = process.env.SSM_PREFIX || '/mbf/prod';

let cachedVerifyToken = null;
let cachedAccessToken = null;

async function getWhatsAppConfig() {
  if (cachedVerifyToken && cachedAccessToken) return { verifyToken: cachedVerifyToken, accessToken: cachedAccessToken };
  const [vt, at] = await Promise.all([
    getParameter(`${PREFIX}/WHATSAPP_VERIFY_TOKEN`, true),
    getParameter(`${PREFIX}/WHATSAPP_ACCESS_TOKEN`, true),
  ]);
  cachedVerifyToken = vt;
  cachedAccessToken = at;
  return { verifyToken: vt, accessToken: at };
}

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

  const { accessToken } = await getWhatsAppConfig();

  for (const entry of body.entry) {
    for (const change of (entry.changes || [])) {
      if (change.field !== 'messages') continue;
      const value = change.value || {};

      for (const msg of (value.messages || [])) {
        const mediaId = msg[msg.type]?.id || null;
        let mediaS3Key = null;
        let mediaMime = null;

        // Download media if present (image, audio, video, document, sticker)
        if (mediaId && accessToken && ['image', 'audio', 'video', 'document', 'sticker'].includes(msg.type)) {
          try {
            const mediaResult = await downloadAndSaveMedia(mediaId, msg.from, msg.type, accessToken);
            mediaS3Key = mediaResult.s3Key;
            mediaMime = mediaResult.mimeType;
          } catch (err) {
            console.log(JSON.stringify({ level: 'warn', message: 'Falha ao baixar mídia', mediaId, error: err.message }));
          }
        }

        await ddb.send(new PutCommand({
          TableName: TABLE,
          Item: {
            PK: `WHATSAPP#${msg.from}`,
            SK: `MSG#${msg.timestamp}#${msg.id}`,
            type: msg.type,
            text: msg.text?.body || msg[msg.type]?.caption || null,
            mediaId: mediaId,
            mediaS3Key: mediaS3Key,
            mediaMime: mediaMime,
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

/**
 * Download media from Meta Graph API and upload to S3
 */
async function downloadAndSaveMedia(mediaId, fromNumber, mediaType, accessToken) {
  // Step 1: Get media URL from Meta
  const metaResp = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000),
  });
  const metaData = await metaResp.json();

  if (!metaResp.ok || !metaData.url) {
    throw new Error(`Media URL not found: ${JSON.stringify(metaData.error || metaData)}`);
  }

  const mimeType = metaData.mime_type || 'application/octet-stream';

  // Step 2: Download the actual file
  const fileResp = await fetch(metaData.url, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(30000),
  });

  if (!fileResp.ok) {
    throw new Error(`Failed to download media: ${fileResp.status}`);
  }

  const buffer = Buffer.from(await fileResp.arrayBuffer());

  // Step 3: Determine file extension
  const extMap = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
    'audio/ogg': '.ogg', 'audio/ogg; codecs=opus': '.ogg', 'audio/mpeg': '.mp3', 'audio/mp4': '.m4a', 'audio/aac': '.aac',
    'video/mp4': '.mp4', 'video/3gpp': '.3gp',
    'application/pdf': '.pdf',
    'image/webp': '.webp',
  };
  const ext = extMap[mimeType.split(';')[0]] || '';

  // Step 4: Upload to S3
  const s3Key = `whatsapp/media/${fromNumber}/${Date.now()}-${mediaId.slice(-8)}${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: buffer,
    ContentType: mimeType,
  }));

  console.log(JSON.stringify({ level: 'info', message: 'Mídia salva no S3', s3Key, mimeType, size: buffer.length }));

  return { s3Key, mimeType };
}

module.exports = { main };
