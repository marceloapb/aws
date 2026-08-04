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
// Todos os templates usam prefixo mbf_ e sufixo _img.
// As imagens ficam no S3 e são servidas via CloudFront.
//
// Referência: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
// ══════════════════════════════════════════════════════════════

const CDN_BASE = 'https://d2112x4m4e89fv.cloudfront.net';

// Mapeamento de templates para suas imagens de header no CDN
// Cada template deve ter sua imagem correspondente no S3/CloudFront
// Caminho no S3: template-headers/{nome-sem-prefixo-e-sufixo}.png
const TEMPLATE_IMAGE_MAP = {
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
};

// Imagem fallback quando não há mapeamento específico
const DEFAULT_HEADER_IMAGE = `${CDN_BASE}/template-headers/logo-default.png`;

/**
 * Retorna a URL pública da imagem de header para um template.
 * Usa mapeamento estático (CDN) ao invés de header_handle da Meta.
 *
 * @param {string} templateName - Nome do template aprovado na Meta
 * @returns {string} URL pública da imagem (nunca retorna null)
 */
function getTemplateImageUrl(templateName) {
  return TEMPLATE_IMAGE_MAP[templateName] || DEFAULT_HEADER_IMAGE;
}

/**
 * Verifica se um template requer header de imagem
 * @param {string} templateName
 * @returns {boolean}
 */
function isImageTemplate(templateName) {
  return templateName.endsWith('_img');
}

/**
 * Registra/atualiza a URL de imagem para um template (usado pelo admin ao configurar)
 * @param {string} templateName
 * @param {string} imageUrl - URL pública HTTPS da imagem
 */
function setTemplateImageUrl(templateName, imageUrl) {
  if (templateName && imageUrl) {
    TEMPLATE_IMAGE_MAP[templateName] = imageUrl;
  }
}

module.exports = {
  getTemplateImageUrl,
  isImageTemplate,
  setTemplateImageUrl,
  DEFAULT_HEADER_IMAGE,
  CDN_BASE,
  TEMPLATE_IMAGE_MAP,
};
