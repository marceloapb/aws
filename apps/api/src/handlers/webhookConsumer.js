const { processWebhookEvent } = require('../services/webhookProcessorService');

const handler = async (event) => {
  for (const record of event.Records) {
    const payload = JSON.parse(record.body);
    await processWebhookEvent(payload);
  }
};

module.exports = { handler };
