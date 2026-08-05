// ══════════════════════════════════════════════════════════════
// SERVICES/WHATSAPP-TEMPLATE-CACHE.JS — Resolução de imagens para templates WhatsApp
// ══════════════════════════════════════════════════════════════
//
// IMPORTANTE: O header_handle retornado pela API de templates da Meta
// é uma referência interna criptografada usada APENAS no registro do template.
// Ele NÃO funciona como URL pública para envio de mensagens.
//
// Para enviar templates com header IMAGE, a Meta exige:
//   - Uma URL HTTPS pública acessível (CDN/S3) via { image: { link: "https://..." } }
//   - Ou um media_id de mídia previamente uploaded via { image: { id: "media_id" } }
//
// Fluxo do admin:
//   1. Admin faz upload da imagem → vai para S3 → CDN URL gerada
//   2. Ao salvar template, imagem é uploaded para Meta (get handle) para aprovação
//   3. A CDN URL é salva no DynamoDB associada ao template name
//   4. No envio de mensagens, busca a CDN URL do DynamoDB (ou fallback estático)
//
// Referência: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
// ══════════════════════════════════════════════════════════════

const { dynamo, TABLE } = require('../config/dynamodb');
const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const CDN_BASE = 'https://d2112x4m4e89fv.cloudfront.net';
const TENANT = process.env.TENANT_ID || 'default';

// Cache em memória (dura enquanto a Lambda estiver quente)
let imageUrlCache = {};
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

// Fallback estático: usado quando não há registro no DynamoDB
const STATIC_FALLBACK_MAP = {
  'mbf_notificacao_geral_img': `${CDN_BASE}/template-headers/notificacao-geral.png`,
  'mbf_novo_orcamento_img': `${CDN_BASE}/template-headers/novo-orcamento.png`,
  'mbf_lembrete_evento_img': `${CDN_BASE}/template-headers/lembrete-evento.png`,
  'mbf_orcamento_pronto_img': `${CDN_BASE}/template-headers/orcamento-pronto.png`,
  'mbf_fotos_prontas_img': `${CDN_BASE}/template-headers/fotos-prontas.png`,
  'mbf_pagamento_confirmado_img': `${CDN_BASE}/template-headers/pagamento-confirmado.png`,
  'mbf_pagamento_vencido_img': `${CDN_BASE}/template-headers/pagamento-vencido.png`,
  'mbf_contrato_assinatura_img': `${CDN_BASE}/template-headers/contrato-assinatura.png`,
  'mbf_contrato_assinado_img': `${CDN_BASE}/template-headers/contrato-assinado.png`,
  'mbf_evento_confirmado_img': `${CDN_BASE}/template-headers/evento-confirmado.png`,
  'mbf_feedback_img': `${CDN_BASE}/template-headers/feedback.png`,
  'mbf_codigo_verificacao_img': `${CDN_BASE}/template-headers/codigo-verificacao.png`,
  'mbf_lembrete_admin_img': `${CDN_BASE}/template-headers/lembrete-admin.png`,
  'mbf_boas_vindas_img': `${CDN_BASE}/template-headers/boas-vindas.png`,
  'mbf_album_pronto_img': `${CDN_BASE}/template-headers/album-pronto.png`,
  // Templates com botão URL (_link_img) — header image + body + button(url)
  'mbf_contrato_assinatura_link_img': `${CDN_BASE}/template-headers/contrato-assinatura.png`,
  'mbf_orcamento_pronto_link_img': `${CDN_BASE}/template-headers/orcamento-pronto.png`,
  'mbf_fotos_prontas_link_img': `${CDN_BASE}/template-headers/fotos-prontas.png`,
  'mbf_feedback_link_img': `${CDN_BASE}/template-headers/feedback.png`,
  'mbf_pagamento_vencido_link_img': `${CDN_BASE}/template-headers/pagamento-vencido.png`,
};

const DEFAULT_HEADER_IMAGE = `${CDN_BASE}/template-headers/logo-default.png`;

/**
 * Retorna a URL pública da imagem de header para um template (síncrono).
 * Prioridade: cache em memória → fallback estático → logo default
 */
function getTemplateImageUrl(templateName) {
  if (imageUrlCache[templateName] && (Date.now() - cacheTimestamp) < CACHE_TTL) {
    return imageUrlCache[templateName];
  }
  return STATIC_FALLBACK_MAP[templateName] || DEFAULT_HEADER_IMAGE;
}

/**
 * Busca a URL da imagem do DynamoDB (async) e atualiza o cache.
 */
async function resolveTemplateImageUrl(templateName) {
  if (imageUrlCache[templateName] && (Date.now() - cacheTimestamp) < CACHE_TTL) {
    return imageUrlCache[templateName];
  }

  try {
    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `TENANT#${TENANT}`, SK: `TPL_IMG#${templateName}` },
    }));

    if (result.Item?.image_url) {
      imageUrlCache[templateName] = result.Item.image_url;
      cacheTimestamp = Date.now();
      return result.Item.image_url;
    }
  } catch (err) {
    console.warn(`[TPL CACHE] Erro ao buscar imagem de ${templateName}: ${err.message}`);
  }

  const fallback = STATIC_FALLBACK_MAP[templateName] || DEFAULT_HEADER_IMAGE;
  imageUrlCache[templateName] = fallback;
  return fallback;
}

/**
 * Salva a URL da imagem associada a um template no DynamoDB + cache.
 * Chamado quando o admin cria/edita um template com imagem pela UI.
 */
async function saveTemplateImageUrl(templateName, imageUrl, s3Key = null) {
  if (!templateName || !imageUrl) return;

  imageUrlCache[templateName] = imageUrl;
  cacheTimestamp = Date.now();

  try {
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `TENANT#${TENANT}`,
        SK: `TPL_IMG#${templateName}`,
        template_name: templateName,
        image_url: imageUrl,
        s3_key: s3Key || null,
        updated_at: new Date().toISOString(),
      },
    }));
  } catch (err) {
    console.error(`[TPL CACHE] Erro ao salvar imagem de ${templateName}: ${err.message}`);
  }
}

/**
 * Verifica se um template requer header de imagem
 */
function isImageTemplate(templateName) {
  return templateName.endsWith('_img');
}

/**
 * Verifica se um template tem botão URL (formato _link_img)
 * Esses templates requerem: header(image) + body(params) + button(type=url, suffix)
 */
function isButtonUrlTemplate(templateName) {
  return templateName.includes('_link_img');
}

function clearCache() {
  imageUrlCache = {};
  cacheTimestamp = 0;
}

module.exports = {
  getTemplateImageUrl,
  resolveTemplateImageUrl,
  saveTemplateImageUrl,
  isImageTemplate,
  isButtonUrlTemplate,
  clearCache,
  DEFAULT_HEADER_IMAGE,
  CDN_BASE,
  STATIC_FALLBACK_MAP,
};
