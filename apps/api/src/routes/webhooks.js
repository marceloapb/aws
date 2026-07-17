const { Router } = require('express');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const router = Router();
const sqs = new SQSClient({});
const QUEUE_URL = process.env.WEBHOOK_QUEUE_URL;

const GATEWAYS = new Set(['asaas', 'stripe', 'mercadopago', 'pagarme', 'pagbank', 'picpay', 'sumup', 'banco-inter', 'stone', 'infinitepay']);

router.post('/:gateway', async (req, res) => {
  const { gateway } = req.params;
  if (!GATEWAYS.has(gateway)) return res.status(400).json({ success: false, message: `Gateway ${gateway} não suportado` });

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
