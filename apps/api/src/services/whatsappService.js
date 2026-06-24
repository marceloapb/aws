// ══════════════════════════════════════════════════════════════
// SERVICES/WHATSAPP-SERVICE.JS — Envio de mensagens WhatsApp
// ══════════════════════════════════════════════════════════════

import { env, features } from '../config/env.js';

const META_API_URL = 'https://graph.facebook.com/v18.0';
const TIMEOUT_MS = 15000;

export async function enviarTemplate(numero, templateName, parameters = []) {
  if (!features.whatsapp) {
    console.warn('[WHATSAPP] Serviço não configurado. Pulando envio.');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const body = {
      messaging_product: 'whatsapp',
      to: formatarNumero(numero),
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'pt_BR' },
        ...(parameters.length > 0 && {
          components: [{
            type: 'body',
            parameters: parameters.map((p) => ({ type: 'text', text: String(p) })),
          }],
        }),
      },
    };

    const response = await fetch(
      `${META_API_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log(`[WHATSAPP] Template '${templateName}' enviado para ${numero}`);
    return { success: true, messageId: result.messages?.[0]?.id };
  } catch (error) {
    console.error(`[WHATSAPP] Erro ao enviar para ${numero}:`, error.message);
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

function formatarNumero(numero) {
  // Remove tudo que não é dígito
  let limpo = numero.replace(/\D/g, '');
  // Adiciona código do país se não tiver
  if (!limpo.startsWith('55')) {
    limpo = '55' + limpo;
  }
  return limpo;
}
