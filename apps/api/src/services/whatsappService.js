// ══════════════════════════════════════════════════════════════
// SERVICES/WHATSAPP-SERVICE.JS — Envio de mensagens WhatsApp
// ══════════════════════════════════════════════════════════════

import { env, features } from '../config/env.js';

const META_API_URL = 'https://graph.facebook.com/v18.0';
const TIMEOUT_MS = 15000;

export async function enviarTemplate(numero, templateName, parameters = []) {
  if (!features.whatsapp) {
    console.warn('[WHATSAPP] Feature desabilitada — mensagem não enviada');
    return { success: false, reason: 'feature_disabled' };
  }

  try {
    const response = await fetch(
      `${META_API_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: numero.replace(/\D/g, ''),
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'pt_BR' },
            components: parameters.length > 0 ? [{
              type: 'body',
              parameters: parameters.map((p) => ({ type: 'text', text: String(p) })),
            }] : undefined,
          },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[WHATSAPP] Erro API:', data.error?.message);
      return { success: false, error: data.error?.message };
    }

    console.log(`[WHATSAPP] Template '${templateName}' enviado para ${numero}`);
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error('[WHATSAPP] Erro ao enviar:', error.message);
    return { success: false, error: error.message };
  }
}

export async function enviarLembreteEvento(numero, nomeCliente, tipoEvento, dataEvento, horario) {
  return enviarTemplate(numero, 'lembrete_evento', [
    nomeCliente,
    tipoEvento,
    dataEvento,
    horario,
  ]);
}

export async function enviarNotificacaoOrcamento(numero, nomeCliente, valorTotal, linkOrcamento) {
  return enviarTemplate(numero, 'orcamento_enviado', [
    nomeCliente,
    `R$ ${valorTotal.toFixed(2)}`,
    linkOrcamento,
  ]);
}

export async function enviarNotificacaoAlbum(numero, nomeCliente, tituloAlbum, linkAlbum) {
  return enviarTemplate(numero, 'album_disponivel', [
    nomeCliente,
    tituloAlbum,
    linkAlbum,
  ]);
}

export async function enviarNotificacaoCobranca(numero, nomeCliente, valor, linkPagamento) {
  return enviarTemplate(numero, 'cobranca_gerada', [
    nomeCliente,
    `R$ ${valor.toFixed(2)}`,
    linkPagamento,
  ]);
}

export async function enviarLinkContrato(numero, nomeCliente, linkContrato) {
  return enviarTemplate(numero, 'contrato_assinatura', [
    nomeCliente,
    linkContrato,
  ]);
}

export async function enviarConviteAvaliacao(numero, nomeCliente, linkAvaliacao) {
  return enviarTemplate(numero, 'avaliacao_convite', [
    nomeCliente,
    linkAvaliacao,
  ]);
}
