// ══════════════════════════════════════════════════════════════
// SERVICES/WHATSAPP-SERVICE.JS — Meta WhatsApp Business API
// ══════════════════════════════════════════════════════════════

const { loadParams } = require('../config/env');

const TIMEOUT_MS = 15000;

/**
 * Carrega credenciais do WhatsApp via SSM (com cache)
 */
async function getWhatsAppConfig() {
  const params = await loadParams();
  const phoneNumberId = params.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = params.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp não configurado: WHATSAPP_PHONE_NUMBER_ID ou WHATSAPP_ACCESS_TOKEN não encontrados no SSM');
  }

  return {
    baseUrl: `https://graph.facebook.com/v20.0/${phoneNumberId}`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  };
}

async function enviarTemplate(numero, templateName, parametros = []) {
  const config = await getWhatsAppConfig();

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

  const response = await fetch(`${config.baseUrl}/messages`, {
    method: 'POST',
    headers: config.headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Erro WhatsApp API: ${JSON.stringify(data.error || data)}`);

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

async function enviarNotificacaoPagamentoVencido(numero, nomeCliente, valor, dataVencimento) {
  return enviarTemplate(numero, 'pagamento_vencido', [nomeCliente, `R$ ${valor.toFixed(2)}`, dataVencimento]);
}

async function enviarConfirmacaoEvento(numero, nomeCliente, tipoEvento, dataEvento) {
  return enviarTemplate(numero, 'evento_confirmado', [nomeCliente, tipoEvento, dataEvento]);
}

async function enviarSolicitacaoFeedback(numero, nomeCliente, link) {
  return enviarTemplate(numero, 'feedback_solicitacao', [nomeCliente, link]);
}

async function enviarLembreteAdmin(numero, tipoEvento, nomeCliente, data, horario, local) {
  return enviarTemplate(numero, 'lembrete_admin_evento', [tipoEvento, nomeCliente, data, horario, local || 'Não informado']);
}

/**
 * Envia template com imagem no header (formato usado em campanhas/marketing)
 * O template precisa estar aprovado na Meta com header do tipo IMAGE.
 *
 * @param {string} numero - Telefone do destinatário
 * @param {string} templateName - Nome do template aprovado na Meta
 * @param {string} imagemUrl - URL pública da imagem (ex: S3 presigned ou URL pública)
 * @param {string[]} parametrosBody - Parâmetros de texto para o body do template
 * @param {Array<{sub_type?: string, payload?: string, url?: string}>} botoes - Botões do template (opcional)
 * @returns {Promise<{success: boolean, message_id: string}>}
 */
async function enviarTemplateComImagem(numero, templateName, imagemUrl, parametrosBody = [], botoes = []) {
  const config = await getWhatsAppConfig();
  const components = [];

  // Header com imagem
  components.push({
    type: 'header',
    parameters: [
      {
        type: 'image',
        image: { link: imagemUrl },
      },
    ],
  });

  // Body com parâmetros de texto
  if (parametrosBody.length > 0) {
    components.push({
      type: 'body',
      parameters: parametrosBody.map((p) => ({ type: 'text', text: String(p) })),
    });
  }

  // Botões (quick_reply ou url com sufixo dinâmico)
  for (let i = 0; i < botoes.length; i++) {
    const btn = botoes[i];
    const btnComponent = {
      type: 'button',
      sub_type: btn.sub_type || 'quick_reply',
      index: String(i),
    };

    if (btn.sub_type === 'url' && btn.url) {
      btnComponent.parameters = [{ type: 'text', text: btn.url }];
    } else {
      btnComponent.parameters = [{ type: 'payload', payload: btn.payload || btn.text || `btn_${i}` }];
    }

    components.push(btnComponent);
  }

  const body = {
    messaging_product: 'whatsapp',
    to: formatarNumero(numero),
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'pt_BR' },
      components,
    },
  };

  const response = await fetch(`${config.baseUrl}/messages`, {
    method: 'POST',
    headers: config.headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Erro WhatsApp API: ${JSON.stringify(data.error || data)}`);

  return { success: true, message_id: data.messages?.[0]?.id };
}

/**
 * Envia template com vídeo no header
 * O template precisa estar aprovado na Meta com header do tipo VIDEO.
 */
async function enviarTemplateComVideo(numero, templateName, videoUrl, parametrosBody = [], botoes = []) {
  const config = await getWhatsAppConfig();
  const components = [];

  components.push({
    type: 'header',
    parameters: [
      {
        type: 'video',
        video: { link: videoUrl },
      },
    ],
  });

  if (parametrosBody.length > 0) {
    components.push({
      type: 'body',
      parameters: parametrosBody.map((p) => ({ type: 'text', text: String(p) })),
    });
  }

  for (let i = 0; i < botoes.length; i++) {
    const btn = botoes[i];
    const btnComponent = {
      type: 'button',
      sub_type: btn.sub_type || 'quick_reply',
      index: String(i),
    };

    if (btn.sub_type === 'url' && btn.url) {
      btnComponent.parameters = [{ type: 'text', text: btn.url }];
    } else {
      btnComponent.parameters = [{ type: 'payload', payload: btn.payload || btn.text || `btn_${i}` }];
    }

    components.push(btnComponent);
  }

  const body = {
    messaging_product: 'whatsapp',
    to: formatarNumero(numero),
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'pt_BR' },
      components,
    },
  };

  const response = await fetch(`${config.baseUrl}/messages`, {
    method: 'POST',
    headers: config.headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Erro WhatsApp API: ${JSON.stringify(data.error || data)}`);

  return { success: true, message_id: data.messages?.[0]?.id };
}

/**
 * Envia template com documento (PDF) no header
 * O template precisa estar aprovado na Meta com header do tipo DOCUMENT.
 */
async function enviarTemplateComDocumento(numero, templateName, documentUrl, filename, parametrosBody = [], botoes = []) {
  const config = await getWhatsAppConfig();
  const components = [];

  components.push({
    type: 'header',
    parameters: [
      {
        type: 'document',
        document: { link: documentUrl, filename: filename || 'documento.pdf' },
      },
    ],
  });

  if (parametrosBody.length > 0) {
    components.push({
      type: 'body',
      parameters: parametrosBody.map((p) => ({ type: 'text', text: String(p) })),
    });
  }

  for (let i = 0; i < botoes.length; i++) {
    const btn = botoes[i];
    const btnComponent = {
      type: 'button',
      sub_type: btn.sub_type || 'quick_reply',
      index: String(i),
    };

    if (btn.sub_type === 'url' && btn.url) {
      btnComponent.parameters = [{ type: 'text', text: btn.url }];
    } else {
      btnComponent.parameters = [{ type: 'payload', payload: btn.payload || btn.text || `btn_${i}` }];
    }

    components.push(btnComponent);
  }

  const body = {
    messaging_product: 'whatsapp',
    to: formatarNumero(numero),
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'pt_BR' },
      components,
    },
  };

  const response = await fetch(`${config.baseUrl}/messages`, {
    method: 'POST',
    headers: config.headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Erro WhatsApp API: ${JSON.stringify(data.error || data)}`);

  return { success: true, message_id: data.messages?.[0]?.id };
}

function formatarNumero(numero) {
  let limpo = numero.replace(/\D/g, '');
  if (!limpo.startsWith('55')) limpo = '55' + limpo;
  return limpo;
}

module.exports = {
  enviarTemplate,
  enviarTemplateComImagem,
  enviarTemplateComVideo,
  enviarTemplateComDocumento,
  enviarLembreteEvento,
  enviarLembreteAdmin,
  enviarNotificacaoOrcamento,
  enviarNotificacaoAlbum,
  enviarNotificacaoPagamento,
  enviarNotificacaoPagamentoVencido,
  enviarConfirmacaoEvento,
  enviarSolicitacaoFeedback,
};
