// ══════════════════════════════════════════════════════════════
// SERVICES/WHATSAPP-SERVICE.JS — Meta WhatsApp Business API
// ══════════════════════════════════════════════════════════════

const { env } = require('../config/env');

const BASE_URL = `https://graph.facebook.com/v18.0/${env.WHATSAPP_PHONE_NUMBER_ID}`;
const TIMEOUT_MS = 15000;

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
  };
}

async function enviarTemplate(numero, templateName, parametros = []) {
  const body = {
    messaging_product: 'whatsapp',
    to: formatarNumero(numero),
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'pt_BR' },
      components: parametros.length > 0 ? [{
        type: 'body',
        parameters: parametros.map((p) => ({ type: 'text', text: String(p) })),
      }] : [],
    },
  };

  const response = await fetch(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Erro WhatsApp API');

  return { success: true, message_id: data.messages?.[0]?.id };
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

module.exports = { enviarTemplate, enviarLembreteEvento, enviarNotificacaoOrcamento, enviarNotificacaoAlbum, enviarNotificacaoPagamento };
