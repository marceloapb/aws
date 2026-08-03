// ══════════════════════════════════════════════════════════════
// SERVICES/WHATSAPP-SERVICE.JS — Meta WhatsApp Business API
// ══════════════════════════════════════════════════════════════

const { env } = require('../config/env');
const whatsappClient = require('../lib/whatsapp/client');

const TIMEOUT_MS = 15000;

// Cache de templates da Meta (evita buscar a cada envio)
let templateCache = null;
let templateCacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Busca templates da Meta Graph API (com cache)
 */
async function getTemplatesFromMeta() {
  if (templateCache && Date.now() < templateCacheExpiry) {
    return templateCache;
  }

  try {
    const config = await whatsappClient.getConfig();
    const wabaId = process.env.WHATSAPP_WABA_ID || env.WHATSAPP_WABA_ID || '2163797757810981';

    const response = await fetch(
      `https://graph.facebook.com/v20.0/${wabaId}/message_templates?limit=50&fields=name,status,category,language,components`,
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
 * Busca a URL da imagem do header de um template (se existir)
 * Para templates com header IMAGE, a Meta retorna header_handle (encrypted) 
 * que pode ser usado como URL direta no envio.
 */
async function getTemplateHeaderImageUrl(templateName) {
  const templates = await getTemplatesFromMeta();
  const tpl = templates.find(t => t.name === templateName && t.status === 'APPROVED');
  if (!tpl) return null;

  const headerComp = tpl.components?.find(c => c.type === 'HEADER');
  if (!headerComp || headerComp.format !== 'IMAGE') return null;

  // A Meta retorna a URL da imagem sample no header_handle
  // Essa URL pode ser usada diretamente no envio como link da imagem
  const imageUrl = headerComp.example?.header_handle?.[0] || null;
  return imageUrl;
}

async function enviarTemplate(numero, templateName, parametros = [], headerImageUrlOverride = null) {
  // Buscar se o template tem header com imagem (busca automática na Meta)
  const headerImageUrl = headerImageUrlOverride || await getTemplateHeaderImageUrl(templateName);

  const result = await whatsappClient.enviarTemplate({
    telefone: numero,
    template_name: templateName,
    language: 'pt_BR',
    parameters: parametros.map(p => ({ type: 'text', text: String(p) })),
    header_image_url: headerImageUrl,
  });

  return { success: true, message_id: result.message_id };
}

async function enviarLembreteEvento(numero, nomeCliente, tipoEvento, data, horario) {
  return enviarTemplate(numero, 'lembrete_evento', [nomeCliente, tipoEvento, data, horario]);
}

async function enviarNotificacaoOrcamento(numero, nomeCliente, valor, link) {
  return enviarTemplate(numero, 'orcamento_pronto', [nomeCliente, `R$ ${valor.toFixed(2)}`, link]);
}

async function enviarNotificacaoAlbum(numero, nomeCliente, tituloAlbum, link) {
  return enviarTemplate(numero, 'album_pronto', [nomeCliente, tituloAlbum, link]);
}

async function enviarNotificacaoPagamento(numero, nomeCliente, valor, status) {
  return enviarTemplate(numero, 'pagamento_confirmado', [nomeCliente, `R$ ${valor.toFixed(2)}`, status]);
}

function formatarNumero(numero) {
  let limpo = numero.replace(/\D/g, '');
  if (!limpo.startsWith('55')) limpo = '55' + limpo;
  return limpo;
}

module.exports = { enviarTemplate, enviarLembreteEvento, enviarNotificacaoOrcamento, enviarNotificacaoAlbum, enviarNotificacaoPagamento, getTemplatesFromMeta, getTemplateHeaderImageUrl };
