const { getParam } = require('./ssm');
const crypto = require('crypto');

const PREFIX = process.env.SSM_PREFIX || '/mbf/prod';

let cachedConfig = null;

async function getCFConfig() {
  if (cachedConfig) return cachedConfig;
  const [privateKey, keyPairId, domain] = await Promise.all([
    getParam(`${PREFIX}/CF_PRIVATE_KEY`),
    getParam(`${PREFIX}/CF_KEY_PAIR_ID`, false),
    getParam(`${PREFIX}/CF_DOMAIN`, false),
  ]);
  cachedConfig = { privateKey, keyPairId, domain };
  return cachedConfig;
}

function createSignedUrl(url, privateKey, keyPairId, expiresInSeconds = 3600) {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;

  const policy = JSON.stringify({
    Statement: [{
      Resource: url,
      Condition: { DateLessThan: { 'AWS:EpochTime': expires } }
    }]
  });

  const sign = crypto.createSign('RSA-SHA1');
  sign.update(policy);
  const signature = sign.sign(privateKey, 'base64')
    .replace(/\+/g, '-')
    .replace(/=/g, '_')
    .replace(/\//g, '~');

  const encodedPolicy = Buffer.from(policy).toString('base64')
    .replace(/\+/g, '-')
    .replace(/=/g, '_')
    .replace(/\//g, '~');

  return `${url}?Policy=${encodedPolicy}&Signature=${signature}&Key-Pair-Id=${keyPairId}`;
}

async function signUrl(s3Key, expiresInSeconds = 3600) {
  const { privateKey, keyPairId, domain } = await getCFConfig();
  const url = `https://${domain}/${s3Key}`;
  return createSignedUrl(url, privateKey, keyPairId, expiresInSeconds);
}

module.exports = { signUrl, createSignedUrl };
