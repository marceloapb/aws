// ══════════════════════════════════════════════════════════════
// SERVICES/WHATSAPP-TEMPLATE-CACHE.JS — Cache de URLs de imagem dos templates Meta
// ══════════════════════════════════════════════════════════════

const { loadParams } = require('../config/env');

// Cache em memória (dura enquanto a Lambda estiver quente)
let templateImageCache = {};
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

/**
 * Busca a URL da imagem header de um template na Meta
 * Com cache em memória para não fazer request a cada envio
 */
async function getTemplateImageUrl(templateName) {
  // Verificar cache
  if (templateImageCache[templateName] && (Date.now() - cacheTimestamp) < CACHE_TTL) {
    return templateImageCache[templateName];
  }

  try {
    const params = await loadParams();
    const token = params.WHATSAPP_ACCESS_TOKEN;
    const wabaId = params.WHATSAPP_WABA_ID || '2163797757810981';

    if (!token) return null;

    const resp = await fetch(
      `https://graph.facebook.com/v20.0/${wabaId}/message_templates?name=${templateName}&access_token=${token}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await resp.json();

    if (!data.data || data.data.length === 0) return null;

    const template = data.data[0];
    const headerComp = template.components?.find(c => c.type === 'HEADER' && c.format === 'IMAGE');

    if (!headerComp?.example?.header_handle?.[0]) return null;

    const imageUrl = headerComp.example.header_handle[0];
    
    // Guardar no cache
    templateImageCache[templateName] = imageUrl;
    cacheTimestamp = Date.now();

    return imageUrl;
  } catch (err) {
    console.warn(`[TEMPLATE CACHE] Erro ao buscar imagem de ${templateName}: ${err.message}`);
    return null;
  }
}

/**
 * Limpa o cache (útil quando templates são atualizados)
 */
function clearTemplateCache() {
  templateImageCache = {};
  cacheTimestamp = 0;
}

module.exports = { getTemplateImageUrl, clearTemplateCache };
