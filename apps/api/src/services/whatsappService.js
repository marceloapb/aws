// ══════════════════════════════════════════════════════════════
// SERVICES/WHATSAPP-SERVICE.JS — Meta WhatsApp Business API
// ══════════════════════════════════════════════════════════════
//
// IMPORTANTE sobre envio de templates com imagem:
// A Meta exige que templates com header IMAGE recebam uma URL pública HTTPS
// a cada envio. O header_handle retornado pela API de templates é uma
// referência interna criptografada e NÃO funciona como link no envio.
//
// Fluxo correto:
// 1. Template cadastrado na Meta com header IMAGE (usando header_handle para registro)
// 2. No envio, passar uma URL pública (CDN/S3) no campo image.link dos components
//
// NOMES DOS TEMPLATES (todos com prefixo mbf_ e sufixo _img):
//   mbf_notificacao_geral_img     — Notificação genérica (2 params: titulo, mensagem)
//   mbf_novo_orcamento_img        — Novo orçamento solicitado (2 params: cliente, detalhes)
//   mbf_lembrete_evento_img       — Lembrete de sessão (4 params: nome, tipo, data, hora)
//   mbf_orcamento_pronto_img      — Orçamento pronto (3 params: nome, valor, link)
//   mbf_fotos_prontas_img         — Fotos/álbum disponível (4 params: nome, album, qtd, dias)
//   mbf_pagamento_confirmado_img  — Pagamento confirmado (3 params: nome, valor, status)
//   mbf_pagamento_vencido_img     — Pagamento vencido (3 params: nome, valor, mensagem)
//   mbf_contrato_assinatura_img   — Contrato para assinar (2 params: nome, detalhes)
//   mbf_contrato_assinado_img     — Contrato assinado (2 params: titulo, mensagem)
//   mbf_evento_confirmado_img     — Evento confirmado (3 params: nome, tipo, detalhes)
//   mbf_feedback_img              — Feedback/avaliação (2 params: nome, detalhes)
//   mbf_codigo_verificacao_img    — Código OTP (1 param: codigo)
//   mbf_lembrete_admin_img        — Lembrete admin (2 params: titulo, mensagem)
//   mbf_boas_vindas_img           — Boas-vindas novo cliente (2 params: nome, senha)
//   mbf_album_pronto_img          — Álbum pronto (3 params: nome, album, detalhes)
//
// Referência: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
// ══════════════════════════════════════════════════════════════

const { env } = require('../config/env');
const whatsappClient = require('../lib/whatsapp/client');
const { getTemplateImageUrl, isImageTemplate } = require('./whatsappTemplateCache');

const TIMEOUT_MS = 15000;

// Cache de templates da Meta (apenas para listagem/validação, NÃO para URLs de imagem)
let templateCache = null;
let templateCacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Busca templates da Meta Graph API (com cache)
 * Útil para listar templates disponíveis e validar nomes.
 * NÃO usar para obter URLs de imagem (header_handle não funciona como URL).
 */
async function getTemplatesFromMeta() {
  if (templateCache && Date.now() < templateCacheExpiry) {
    return templateCache;
  }

  try {
    const config = await whatsappClient.getConfig();
    const wabaId = process.env.WHATSAPP_WABA_ID || env.WHATSAPP_WABA_ID || '2163797757810981';

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/message_templates?limit=50&fields=name,status,category,language,components`,
      {
        headers: { 'Authorization': `Bearer ${config.accessToken}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );

    if (!response.ok) {
      console.error('[WHATSAPP] Falha ao buscar templates da Meta');
      return [];
    }

    const result = await response.json();
    templateCache = result.data || [];
    templateCacheExpiry = Date.now() + CACHE_TTL_MS;
    return templateCache;
  } catch (err) {
    console.error('[WHATSAPP] Erro ao buscar templates:', err.message);
    return templateCache || [];
  }
}

/**
 * Envia mensagem via template do WhatsApp Cloud API
 * Para templates com header IMAGE, resolve a URL da imagem via CDN (não usa header_handle).
 *
 * @param {string} numero - Número do destinatário
 * @param {string} templateName - Nome do template aprovado na Meta
 * @param {string[]} parametros - Parâmetros de texto para o body
 * @param {string|null} headerImageUrlOverride - URL pública da imagem (sobrescreve CDN map)
 */
async function enviarTemplate(numero, templateName, parametros = [], headerImageUrlOverride = null) {
  // Para templates _img, resolver a URL da imagem via CDN
  let headerImageUrl = null;

  if (headerImageUrlOverride) {
    // URL explicitamente passada (ex: frontend, admin route)
    headerImageUrl = headerImageUrlOverride;
  } else if (isImageTemplate(templateName)) {
    // Resolver via mapeamento CDN (sempre retorna uma URL válida)
    headerImageUrl = getTemplateImageUrl(templateName);
  }

  const result = await whatsappClient.enviarTemplate({
    telefone: numero,
    template_name: templateName,
    language: 'pt_BR',
    parameters: parametros.map(p => ({ type: 'text', text: String(p) })),
    header_image_url: headerImageUrl,
  });

  return { success: true, message_id: result.message_id };
}

/**
 * Envia lembrete de evento para o cliente
 * Template: mbf_lembrete_evento_img (4 params: nome, tipo, data, hora)
 */
async function enviarLembreteEvento(numero, nomeCliente, tipoEvento, data, horario) {
  return enviarTemplate(numero, 'mbf_lembrete_evento_img', [nomeCliente, tipoEvento, data, horario]);
}

/**
 * Envia lembrete para o admin sobre eventos de amanhã
 * Template: mbf_lembrete_admin_img (2 params: titulo, mensagem)
 */
async function enviarLembreteAdmin(numero, tipoEvento, nomeCliente, data, horario, local) {
  const titulo = `Evento Amanhã: ${tipoEvento}`;
  const mensagem = `${nomeCliente} - ${data} às ${horario}${local ? ` | ${local}` : ''}`;

  return enviarTemplate(numero, 'mbf_lembrete_admin_img', [titulo, mensagem]);
}

/**
 * Envia notificação de orçamento pronto para o cliente
 * Template: mbf_orcamento_pronto_img (3 params: nome, valor, link)
 */
async function enviarNotificacaoOrcamento(numero, nomeCliente, valor, link) {
  return enviarTemplate(numero, 'mbf_orcamento_pronto_img', [nomeCliente, `R$ ${valor.toFixed(2)}`, link]);
}

/**
 * Envia notificação de álbum pronto para o cliente
 * Template: mbf_album_pronto_img (3 params: nome, album, detalhes)
 */
async function enviarNotificacaoAlbum(numero, nomeCliente, tituloAlbum, link) {
  return enviarTemplate(numero, 'mbf_album_pronto_img', [nomeCliente, tituloAlbum, link]);
}

/**
 * Envia notificação de pagamento confirmado
 * Template: mbf_pagamento_confirmado_img (3 params: nome, valor, status)
 */
async function enviarNotificacaoPagamento(numero, nomeCliente, valor, status) {
  return enviarTemplate(numero, 'mbf_pagamento_confirmado_img', [nomeCliente, `R$ ${valor.toFixed(2)}`, status]);
}

function formatarNumero(numero) {
  let limpo = numero.replace(/\D/g, '');
  if (!limpo.startsWith('55')) limpo = '55' + limpo;
  return limpo;
}

module.exports = {
  enviarTemplate,
  enviarLembreteEvento,
  enviarLembreteAdmin,
  enviarNotificacaoOrcamento,
  enviarNotificacaoAlbum,
  enviarNotificacaoPagamento,
  getTemplatesFromMeta,
  formatarNumero,
};
