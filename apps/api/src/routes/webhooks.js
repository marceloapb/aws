const { Router } = require('express');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const router = Router();
const sqs = new SQSClient({});
const ssm = new SSMClient({ region: 'us-east-1' });
const QUEUE_URL = process.env.WEBHOOK_QUEUE_URL;

const GATEWAYS = new Set(['asaas', 'stripe', 'mercadopago', 'pagarme', 'pagbank', 'picpay', 'sumup', 'banco-inter', 'stone', 'infinitepay']);

let cachedWebhookToken = null;
async function getAsaasWebhookToken() {
  if (cachedWebhookToken) return cachedWebhookToken;
  try {
    const result = await ssm.send(new GetParameterCommand({ Name: '/mbf/prod/ASAAS_WEBHOOK_TOKEN', WithDecryption: true }));
    cachedWebhookToken = result.Parameter.Value;
  } catch { cachedWebhookToken = ''; }
  return cachedWebhookToken;
}

router.post('/:gateway', async (req, res) => {
  const { gateway } = req.params;
  if (!GATEWAYS.has(gateway)) return res.status(400).json({ success: false, message: `Gateway ${gateway} não suportado` });

  // Validar token do Asaas
  if (gateway === 'asaas') {
    const token = await getAsaasWebhookToken();
    const receivedToken = req.headers['asaas-access-token'] || req.headers['access_token'] || '';
    if (token && receivedToken !== token) {
      console.warn('[WEBHOOK] Token Asaas inválido');
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }
  }

  try {
    await sqs.send(new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify({ gateway, payload: req.body, headers: req.headers }),
      MessageGroupId: gateway,
      MessageDeduplicationId: `${gateway}-${Date.now()}-${Math.random()}`,
    }));
    res.status(200).json({ received: true });
  } catch (error) {
    console.error(`[WEBHOOK] Erro ao enfileirar ${gateway}:`, error.message);
    res.status(200).json({ received: true });
  }
});

module.exports = router;
