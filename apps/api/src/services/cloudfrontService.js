const { getSignedUrl, getSignedCookies } = require('@aws-sdk/cloudfront-signer');
const logger = require('../config/logger');
const { getParameter } = require('../utils/ssm');

let cachedPrivateKey = null;

async function getPrivateKey() {
  if (!cachedPrivateKey) {
    const paramPath = `/mbf/${process.env.STAGE || 'prod'}/cloudfront/private-key`;
    cachedPrivateKey = await getParameter(paramPath, true);
    logger.info({ action: 'cloudfront_key_loaded', paramPath });
  }
  return cachedPrivateKey;
}

/**
 * Gera URL assinada para acesso a um arquivo específico no CloudFront
 * @param {string} objectKey - Path do objeto (ex: 'albuns/abc123/foto1.jpg')
 * @param {number} expiresInSeconds - Tempo de expiração (default 1h)
 * @returns {string} URL assinada
 */
async function generateSignedUrl(objectKey, expiresInSeconds = 3600) {
  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
  const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;

  if (!cloudFrontDomain || !keyPairId) {
    logger.warn({ action: 'cloudfront_not_configured', message: 'CLOUDFRONT_DOMAIN ou KEY_PAIR_ID não configurados. Retornando null.' });
    return null;
  }

  const privateKey = await getPrivateKey();
  const url = `https://${cloudFrontDomain}/${objectKey}`;
  const dateLessThan = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  const signedUrl = getSignedUrl({
    url,
    keyPairId,
    privateKey,
    dateLessThan
  });

  logger.info({ action: 'cloudfront_signed_url', objectKey, expiresInSeconds });
  return signedUrl;
}

/**
 * Gera cookies assinados para acesso a múltiplos arquivos (ex: álbum inteiro)
 * @param {string} pathPattern - Pattern do path (ex: 'albuns/abc123/*')
 * @param {number} expiresInSeconds - Tempo de expiração (default 2h)
 * @returns {object} Cookies para Set-Cookie headers
 */
async function generateSignedCookies(pathPattern, expiresInSeconds = 7200) {
  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
  const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;

  if (!cloudFrontDomain || !keyPairId) {
    logger.warn({ action: 'cloudfront_cookies_not_configured' });
    return null;
  }

  const privateKey = await getPrivateKey();
  const resourceUrl = `https://${cloudFrontDomain}/${pathPattern}`;
  const dateLessThan = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  const cookies = getSignedCookies({
    url: resourceUrl,
    keyPairId,
    privateKey,
    dateLessThan
  });

  logger.info({ action: 'cloudfront_signed_cookies', pathPattern, expiresInSeconds });
  return cookies;
}

module.exports = { generateSignedUrl, generateSignedCookies };
