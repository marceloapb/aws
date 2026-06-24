// ══════════════════════════════════════════════════════════════
// SERVICES/INSTAGRAM-SERVICE.JS — Meta Graph API (Instagram)
// ══════════════════════════════════════════════════════════════

import { env } from '../config/env.js';

const BASE_URL = 'https://graph.facebook.com/v18.0';
const IG_USER_ID = env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
const TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 30;

function getHeaders() {
  return { 'Content-Type': 'application/json' };
}

function getAccessToken() {
  return env.INSTAGRAM_ACCESS_TOKEN;
}

export async function publicarFotoUnica(s3Key, caption) {
  const imageUrl = `https://${env.CLOUDFRONT_DOMAIN}/${s3Key}`;

  // 1. Criar container
  const containerResponse = await fetch(
    `${BASE_URL}/${IG_USER_ID}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${getAccessToken()}`,
    { method: 'POST', headers: getHeaders(), signal: AbortSignal.timeout(TIMEOUT_MS) }
  );

  const containerData = await containerResponse.json();
  if (!containerResponse.ok) throw new Error(containerData.error?.message || 'Erro ao criar container');

  // 2. Aguardar processamento
  await aguardarProcessamento(containerData.id);

  // 3. Publicar
  const publishResponse = await fetch(
    `${BASE_URL}/${IG_USER_ID}/media_publish?creation_id=${containerData.id}&access_token=${getAccessToken()}`,
    { method: 'POST', headers: getHeaders(), signal: AbortSignal.timeout(TIMEOUT_MS) }
  );

  const publishData = await publishResponse.json();
  if (!publishResponse.ok) throw new Error(publishData.error?.message || 'Erro ao publicar');

  // 4. Buscar permalink
  const permalink = await buscarPermalink(publishData.id);

  return {
    success: true,
    instagram_post_id: publishData.id,
    instagram_permalink: permalink,
    container_ids: [containerData.id],
  };
}

export async function publicarCarrossel(s3Keys, caption) {
  // 1. Criar containers individuais
  const containerIds = [];
  for (const key of s3Keys) {
    const imageUrl = `https://${env.CLOUDFRONT_DOMAIN}/${key}`;
    const response = await fetch(
      `${BASE_URL}/${IG_USER_ID}/media?image_url=${encodeURIComponent(imageUrl)}&is_carousel_item=true&access_token=${getAccessToken()}`,
      { method: 'POST', headers: getHeaders(), signal: AbortSignal.timeout(TIMEOUT_MS) }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Erro ao criar item do carrossel');
    containerIds.push(data.id);
  }

  // 2. Aguardar processamento de todos
  for (const id of containerIds) {
    await aguardarProcessamento(id);
  }

  // 3. Criar container do carrossel
  const carouselResponse = await fetch(
    `${BASE_URL}/${IG_USER_ID}/media?media_type=CAROUSEL&children=${containerIds.join(',')}&caption=${encodeURIComponent(caption)}&access_token=${getAccessToken()}`,
    { method: 'POST', headers: getHeaders(), signal: AbortSignal.timeout(TIMEOUT_MS) }
  );

  const carouselData = await carouselResponse.json();
  if (!carouselResponse.ok) throw new Error(carouselData.error?.message || 'Erro ao criar carrossel');

  // 4. Aguardar e publicar
  await aguardarProcessamento(carouselData.id);

  const publishResponse = await fetch(
    `${BASE_URL}/${IG_USER_ID}/media_publish?creation_id=${carouselData.id}&access_token=${getAccessToken()}`,
    { method: 'POST', headers: getHeaders(), signal: AbortSignal.timeout(TIMEOUT_MS) }
  );

  const publishData = await publishResponse.json();
  if (!publishResponse.ok) throw new Error(publishData.error?.message || 'Erro ao publicar carrossel');

  const permalink = await buscarPermalink(publishData.id);

  return {
    success: true,
    instagram_post_id: publishData.id,
    instagram_permalink: permalink,
    container_ids: containerIds,
  };
}

async function aguardarProcessamento(containerId) {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const response = await fetch(
      `${BASE_URL}/${containerId}?fields=status_code&access_token=${getAccessToken()}`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) }
    );
    const data = await response.json();

    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR') throw new Error('Container com erro de processamento');

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error('Timeout aguardando processamento do container');
}

async function buscarPermalink(mediaId) {
  try {
    const response = await fetch(
      `${BASE_URL}/${mediaId}?fields=permalink&access_token=${getAccessToken()}`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) }
    );
    const data = await response.json();
    return data.permalink || null;
  } catch {
    return null;
  }
}

export default { publicarFotoUnica, publicarCarrossel };
