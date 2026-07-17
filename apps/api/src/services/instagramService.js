// ══════════════════════════════════════════════════════════════
// SERVICES/INSTAGRAM-SERVICE.JS — Meta Graph API (Instagram)
// ══════════════════════════════════════════════════════════════

const { env } = require('../config/env');
const { getSignedDownloadUrl } = require('./s3Service');

const BASE_URL = `https://graph.facebook.com/v18.0/${env.INSTAGRAM_BUSINESS_ACCOUNT_ID}`;
const TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 30;

function getHeaders() {
  return { 'Content-Type': 'application/json' };
}

async function publicarFotoUnica(s3Key, caption) {
  try {
    const imageUrl = await getSignedDownloadUrl(s3Key, 3600);

    // Criar container
    const containerResponse = await fetch(`${BASE_URL}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${env.INSTAGRAM_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: getHeaders(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const containerData = await containerResponse.json();
    if (!containerResponse.ok) throw new Error(containerData.error?.message || 'Erro ao criar container');

    // Aguardar processamento
    await aguardarProcessamento(containerData.id);

    // Publicar
    const publishResponse = await fetch(`${BASE_URL}/media_publish?creation_id=${containerData.id}&access_token=${env.INSTAGRAM_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: getHeaders(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const publishData = await publishResponse.json();
    if (!publishResponse.ok) throw new Error(publishData.error?.message || 'Erro ao publicar');

    // Buscar permalink
    const permalink = await buscarPermalink(publishData.id);

    return {
      success: true,
      instagram_post_id: publishData.id,
      instagram_permalink: permalink,
      container_ids: [containerData.id],
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function publicarCarrossel(s3Keys, caption) {
  try {
    const containerIds = [];

    // Criar containers individuais
    for (const key of s3Keys) {
      const imageUrl = await getSignedDownloadUrl(key, 3600);

      const response = await fetch(`${BASE_URL}/media?image_url=${encodeURIComponent(imageUrl)}&is_carousel_item=true&access_token=${env.INSTAGRAM_ACCESS_TOKEN}`, {
        method: 'POST',
        headers: getHeaders(),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Erro ao criar item do carrossel');

      containerIds.push(data.id);
    }

    // Aguardar processamento de todos
    for (const id of containerIds) {
      await aguardarProcessamento(id);
    }

    // Criar container do carrossel
    const carouselResponse = await fetch(`${BASE_URL}/media?media_type=CAROUSEL&children=${containerIds.join(',')}&caption=${encodeURIComponent(caption)}&access_token=${env.INSTAGRAM_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: getHeaders(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const carouselData = await carouselResponse.json();
    if (!carouselResponse.ok) throw new Error(carouselData.error?.message || 'Erro ao criar carrossel');

    await aguardarProcessamento(carouselData.id);

    // Publicar
    const publishResponse = await fetch(`${BASE_URL}/media_publish?creation_id=${carouselData.id}&access_token=${env.INSTAGRAM_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: getHeaders(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const publishData = await publishResponse.json();
    if (!publishResponse.ok) throw new Error(publishData.error?.message || 'Erro ao publicar carrossel');

    const permalink = await buscarPermalink(publishData.id);

    return {
      success: true,
      instagram_post_id: publishData.id,
      instagram_permalink: permalink,
      container_ids: containerIds,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function aguardarProcessamento(containerId) {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const response = await fetch(`https://graph.facebook.com/v18.0/${containerId}?fields=status_code&access_token=${env.INSTAGRAM_ACCESS_TOKEN}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const data = await response.json();
    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR') throw new Error('Container com erro de processamento');

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error('Timeout aguardando processamento do container');
}

async function buscarPermalink(mediaId) {
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${mediaId}?fields=permalink&access_token=${env.INSTAGRAM_ACCESS_TOKEN}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = await response.json();
    return data.permalink || '';
  } catch {
    return '';
  }
}

module.exports = { publicarFotoUnica, publicarCarrossel };
