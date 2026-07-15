const { getSignedUrl, getSignedCookies } = require('@aws-sdk/cloudfront-signer');
const { getParameter } = require('../utils/ssm');
const logger = require('../config/logger');

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
 * Gera URL assinada do CloudFront para um arquivo específico.
 * @param {string} objectKey - Path do objeto no S3/CF (ex: 'albuns/abc/foto1.jpg')
 * @param {number} expiresInSeconds - Tempo de expiração (default 1h)
 * @returns {string} URL assinada
 */
async function generateSignedUrl(objectKey, expiresInSeconds = 3600) {
  const cfDomain = process.env.CLOUDFRONT_DOMAIN;
  const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;

  if (!cfDomain || !keyPairId) {
    logger.warn({ action: 'cloudfront_not_configured', message: 'CLOUDFRONT_DOMAIN ou KEY_PAIR_ID não configurados' });
    return null;
  }

  try {
    const privateKey = await getPrivateKey();
    const url = `https://${cfDomain}/${objectKey}`;
    const dateLessThan = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    const signedUrl = getSignedUrl({
      url,
      keyPairId,
      privateKey,
      dateLessThan
    });

    logger.info({ action: 'cloudfront_signed_url', objectKey, expiresInSeconds });
    return signedUrl;
  } catch (error) {
    logger.error({ action: 'cloudfront_signed_url_error', error: error.message, objectKey });
    return null;
  }
}

/**
 * Gera cookies assinados para acesso a um diretório (ex: álbum inteiro).
 * @param {string} pathPattern - Pattern do path (ex: 'albuns/abc123/*')
 * @param {number} expiresInSeconds - Tempo de expiração (default 2h)
 * @returns {object} Objeto com cookies CloudFront ou null
 */
async function generateSignedCookies(pathPattern, expiresInSeconds = 7200) {
  const cfDomain = process.env.CLOUDFRONT_DOMAIN;
  const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;

  if (!cfDomain || !keyPairId) {
    logger.warn({ action: 'cloudfront_cookies_not_configured' });
    return null;
  }

  try {
    const privateKey = await getPrivateKey();
    const url = `https://${cfDomain}/${pathPattern}`;
    const dateLessThan = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    const cookies = getSignedCookies({
      url,
      keyPairId,
      privateKey,
      dateLessThan
    });

    logger.info({ action: 'cloudfront_signed_cookies', pathPattern, expiresInSeconds });
    return cookies;
  } catch (error) {
    logger.error({ action: 'cloudfront_signed_cookies_error', error: error.message, pathPattern });
    return null;
  }
}

module.exports = { generateSignedUrl, generateSignedCookies };
