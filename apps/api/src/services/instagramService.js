// ══════════════════════════════════════════════════════════════
// SERVICES/INSTAGRAM-SERVICE.JS — Publicação no Instagram
// ══════════════════════════════════════════════════════════════

import { env, features } from '../config/env.js';
import { getPublicUrl } from './s3Service.js';

const META_API_URL = 'https://graph.facebook.com/v18.0';
const TIMEOUT_MS = 30000;
const POLLING_INTERVAL = 5000;
const MAX_POLLING_ATTEMPTS = 12;

export async function publicarCarrossel(fotosKeys, caption) {
  if (!features.instagram) {
    return { success: false, reason: 'feature_disabled' };
  }

  try {
    // 1. Criar container para cada foto
    const containerIds = [];
    for (const key of fotosKeys) {
      const imageUrl = getPublicUrl(key);
      const containerId = await criarItemContainer(imageUrl);
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
    return { success: false, reason: 'feature_disabled' };
  }

  try {
    const imageUrl = getPublicUrl(fotoKey);

    const response = await fetch(
      `${META_API_URL}/${env.INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: env.INSTAGRAM_ACCESS_TOKEN,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Erro ao criar container');

    const postId = await publicarContainer(data.id);
    const permalink = await obterPermalink(postId);

    return { success: true, instagram_post_id: postId, instagram_permalink: permalink };
  } catch (error) {
    console.error('[INSTAGRAM] Erro foto única:', error.message);
    return { success: false, error: error.message };
  }
}

async function criarItemContainer(imageUrl) {
  const response = await fetch(
    `${META_API_URL}/${env.INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        is_carousel_item: true,
        access_token: env.INSTAGRAM_ACCESS_TOKEN,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Erro ao criar item container');
  return data.id;
}

async function criarCarouselContainer(childrenIds, caption) {
  const response = await fetch(
    `${META_API_URL}/${env.INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'CAROUSEL',
        children: childrenIds.join(','),
        caption,
        access_token: env.INSTAGRAM_ACCESS_TOKEN,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Erro ao criar carousel');
  return data.id;
}

async function publicarContainer(containerId) {
  const response = await fetch(
    `${META_API_URL}/${env.INSTAGRAM_BUSINESS_ACCOUNT_ID}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: env.INSTAGRAM_ACCESS_TOKEN,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Erro ao publicar');
  return data.id;
}

async function obterPermalink(postId) {
  try {
    const response = await fetch(
      `${META_API_URL}/${postId}?fields=permalink&access_token=${env.INSTAGRAM_ACCESS_TOKEN}`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) }
    );
    const data = await response.json();
    return data.permalink || null;
  } catch {
    return null;
  }
}

export default { publicarCarrossel, publicarFotoUnica };
