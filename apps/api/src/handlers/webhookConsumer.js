import { processWebhookEvent } from '../services/webhookProcessorService.js';

export const handler = async (event) => {
  for (const record of event.Records) {
    const payload = JSON.parse(record.body);
    await processWebhookEvent(payload);
  }
};
