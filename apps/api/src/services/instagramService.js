// ══════════════════════════════════════════════════════════════
// SERVICES/INSTAGRAM-SERVICE.JS — Publicação no Instagram
// ══════════════════════════════════════════════════════════════

import { env, features } from '../config/env.js';
import { getPublicUrl } from './s3Service.js';

const META_API_URL = 'https://graph.facebook.com/v18.0';
const TIMEOUT_MS = 30000;
const POLLING_INTERVAL = 5000;
const MAX_POLLING_ATTEMPTS = 30;

export async function publicarCarrossel(fotosKeys, caption) {
  if (!features.instagram) {
    return { success: false, reason: 'not_configured' };
  }

  try {
    // 1. Criar containers para cada foto
    const containerIds = [];
    for (const key of fotosKeys) {
      const url = getPublicUrl(key);
      const containerId = await criarItemContainer(url);
      containerIds.push(containerId);
    }

    // 2. Criar carousel container
    const carouselId = await criarCarouselContainer(containerIds, caption);

    // 3. Publicar
    const postId = await publicarContainer(carouselId);

    // 4. Obter permalink
    const permalink = await obterPermalink(postId);

    return {
      success: true,
      instagram_post_id: postId,
      instagram_permalink: permalink,
      container_ids: containerIds,
    };
  } catch (error) {
    console.error('[INSTAGRAM] Erro ao publicar:', error.message);
    return { success: false, error: error.message };
  }
}

export async function publicarFotoUnica(fotoKey, caption) {
  if (!features.instagram) {
    return { success: false, reason: 'not_configured' };
  }

  try {
    const url = getPublicUrl(fotoKey);
    const containerId = await criarFotoContainer(url, caption);
    const postId = await publicarContainer(containerId);
    const permalink = await obterPermalink(postId);

    return {
      success: true,
      instagram_post_id: postId,
      instagram_permalink: permalink,
    };
  } catch (error) {
    console.error('[INSTAGRAM] Erro ao publicar foto:', error.message);
    return { success: false, error: error.message };
  }
}

async function criarItemContainer(imageUrl) {
  const response = await fetchMeta(`/${env.INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`, {
    image_url: imageUrl,
    is_carousel_item: true,
  });
  return response.id;
}

async function criarFotoContainer(imageUrl, caption) {
  const response = await fetchMeta(`/${env.INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`, {
    image_url: imageUrl,
    caption: caption || '',
  });
  return response.id;
}

async function criarCarouselContainer(childrenIds, caption) {
  const response = await fetchMeta(`/${env.INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`, {
    media_type: 'CAROUSEL',
    children: childrenIds.join(','),
    caption: caption || '',
  });
  return response.id;
}

async function publicarContainer(containerId) {
  // Aguardar container ficar pronto
  await aguardarContainerPronto(containerId);

  const response = await fetchMeta(`/${env.INSTAGRAM_BUSINESS_ACCOUNT_ID}/media_publish`, {
    creation_id: containerId,
  });
  return response.id;
}

async function aguardarContainerPronto(containerId) {
  for (let i = 0; i < MAX_POLLING_ATTEMPTS; i++) {
    const status = await fetchMeta(`/${containerId}`, null, 'GET', 'status_code');

    if (status.status_code === 'FINISHED') return;
    if (status.status_code === 'ERROR') {
      throw new Error(`Container ${containerId} com erro`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
  }
  throw new Error('Timeout aguardando container ficar pronto');
}

async function obterPermalink(postId) {
  try {
    const response = await fetchMeta(`/${postId}`, null, 'GET', 'permalink');
    return response.permalink;
  } catch {
    return null;
  }
}

async function fetchMeta(endpoint, params, method = 'POST', fields = null) {
  let url = `${META_API_URL}${endpoint}`;

  if (method === 'GET' && fields) {
    url += `?fields=${fields}&access_token=${env.INSTAGRAM_ACCESS_TOKEN}`;
  }

  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  };

  if (method === 'POST' && params) {
    options.body = JSON.stringify({
      ...params,
      access_token: env.INSTAGRAM_ACCESS_TOKEN,
    });
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Instagram API HTTP ${response.status}`);
  }

  return response.json();
}
