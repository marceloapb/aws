const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ssm = new SSMClient({});
const PREFIX = process.env.SSM_PREFIX || '/mbf/prod';

let cachedConfig = null;

async function getConfig() {
  if (cachedConfig) return cachedConfig;
  const [tokenParam, accountParam] = await Promise.all([
    ssm.send(new GetParameterCommand({ Name: `${PREFIX}/INSTAGRAM_ACCESS_TOKEN`, WithDecryption: true })),
    ssm.send(new GetParameterCommand({ Name: `${PREFIX}/INSTAGRAM_BUSINESS_ACCOUNT_ID`, WithDecryption: false })),
  ]);
  cachedConfig = {
    accessToken: tokenParam.Parameter.Value,
    businessAccountId: accountParam.Parameter.Value,
  };
  return cachedConfig;
}

/**
 * Publica foto no Instagram
 * @param {{ image_url: string, caption: string }} opts
 */
async function publicar({ image_url, caption }) {
  const config = await getConfig();
  const igUserId = config.businessAccountId;

  // Step 1: Create media container
  const containerRes = await fetch(
    `https://graph.facebook.com/v20.0/${igUserId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url,
        caption,
        access_token: config.accessToken,
      }),
    }
  );
  const containerData = await containerRes.json();
  if (!containerRes.ok) {
    throw new Error(`Instagram container error: ${JSON.stringify(containerData.error || containerData)}`);
  }

  // Step 2: Publish
  const publishRes = await fetch(
    `https://graph.facebook.com/v20.0/${igUserId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerData.id,
        access_token: config.accessToken,
      }),
    }
  );
  const publishData = await publishRes.json();
  if (!publishRes.ok) {
    throw new Error(`Instagram publish error: ${JSON.stringify(publishData.error || publishData)}`);
  }

  return {
    success: true,
    media_id: publishData.id,
  };
}

/**
 * Busca insights de um post
 * @param {{ media_id: string }} opts
 */
async function getInsights({ media_id }) {
  const config = await getConfig();

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${media_id}/insights?metric=impressions,reach,engagement&access_token=${config.accessToken}`
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Instagram insights error: ${JSON.stringify(data.error || data)}`);
  }

  const metrics = {};
  (data.data || []).forEach(item => {
    metrics[item.name] = item.values?.[0]?.value || 0;
  });

  return metrics;
}

module.exports = {
  publicar,
  getInsights,
  getConfig,
};
