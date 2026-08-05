// ══════════════════════════════════════════════════════════════
// ADAPTERS/NOTIFICACOES/WHATSAPP-ADAPTER.JS — Envio via WhatsApp Cloud API
// ══════════════════════════════════════════════════════════════

const whatsappClient = require('../../lib/whatsapp/client');
const { dynamo, TABLE } = require('../../config/dynamodb');
const { PutCommand } = require('@aws-sdk/lib-dynamodb');

/**
 * Registra mensagem enviada no DynamoDB para contabilização de custos
 */
async function registrarEnvio(phone, template, messageId, categoria) {
  try {
    const now = new Date();
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `WHATSAPP#${phone}`,
        SK: `OUT#${now.toISOString()}#${messageId || Date.now()}`,
        GSI1PK: 'WA_ENVIO',
        GSI1SK: `WA_ENVIO#${now.toISOString()}`,
        type: 'template',
        templateNome: template,
        categoria: categoria || 'utility',
        status: 'enviado',
        messageId: messageId || null,
        destinatario: phone,
        origem: 'notificacao',
        data: now.toISOString().slice(0, 10),
        createdAt: now.toISOString(),
        timestamp: Math.floor(now.getTime() / 1000).toString(),
      },
    }));
  } catch {}
}

/**
 * Envia mensagem WhatsApp via template
 * Reutiliza o client existente em lib/whatsapp/client.js
 * @param {Object} opts
 * @param {string} opts.numero - Número do destinatário (com ou sem DDI)
 * @param {string} opts.template - Nome do template aprovado no Meta
 * @param {Array} opts.parametros - Parâmetros para substituição no template
 * @param {Array} opts.components - Components customizados (body, button, etc)
 * @param {'image'|'video'|'document'} [opts.mediaType] - Tipo de mídia para header
 * @param {string} [opts.mediaUrl] - URL pública da mídia para header
 * @returns {Promise<Object>}
 */
async function enviarWhatsApp({ numero, template, parametros = [], components = null, mediaType = null, mediaUrl = null }) {
  if (!numero) {
    throw new Error('numero é obrigatório para envio de WhatsApp');
  }
  if (!template) {
    throw new Error('template é obrigatório para envio de WhatsApp');
  }

  // Se components customizados foram passados, usar diretamente
  if (components) {
    const result = await whatsappClient.enviarTemplate({
      telefone: numero,
      template_name: template,
      language: 'pt_BR',
      components,
    });

    // Registrar envio para custos
    await registrarEnvio(result.phone || numero.replace(/\D/g, ''), template, result.message_id, 'utility');

    return {
      success: true,
      message_id: result.message_id,
      numero: result.phone,
    };
  }

  // Se mediaType e mediaUrl estão presentes, montar components com header de mídia + body
  if (mediaType && mediaUrl) {
    const autoComponents = [];

    // Header com mídia
    const headerParam = { type: mediaType };
    headerParam[mediaType] = { link: mediaUrl };
    autoComponents.push({
      type: 'header',
      parameters: [headerParam],
    });

    // Body com parâmetros de texto
    if (parametros.length > 0) {
      autoComponents.push({
        type: 'body',
        parameters: parametros.map(p => {
          if (typeof p === 'string') return { type: 'text', text: p };
          return p;
        }),
      });
    }

    const result = await whatsappClient.enviarTemplate({
      telefone: numero,
      template_name: template,
      language: 'pt_BR',
      components: autoComponents,
    });

    // Registrar envio para custos (marketing por ter mídia)
    await registrarEnvio(result.phone || numero.replace(/\D/g, ''), template, result.message_id, 'marketing');

    return {
      success: true,
      message_id: result.message_id,
      numero: result.phone,
    };
  }

  // Fallback: formatar parâmetros para o formato esperado pelo client
  const parameters = parametros.map(p => {
    if (typeof p === 'string') return { type: 'text', text: p };
    return p;
  });

  const result = await whatsappClient.enviarTemplate({
    telefone: numero,
    template_name: template,
    language: 'pt_BR',
    parameters,
  });

  // Registrar envio para custos
  await registrarEnvio(result.phone || numero.replace(/\D/g, ''), template, result.message_id, 'utility');

  return {
    success: true,
    message_id: result.message_id,
    numero: result.phone,
  };
}

/**
 * Envia template WhatsApp com mídia no header (imagem, vídeo ou documento)
 * Monta automaticamente os components no formato correto da Meta API
 *
 * @param {Object} opts
 * @param {string} opts.numero - Número do destinatário
 * @param {string} opts.template - Nome do template aprovado na Meta
 * @param {'image'|'video'|'document'} opts.mediaType - Tipo de mídia do header
 * @param {string} opts.mediaUrl - URL pública da mídia (S3, CDN, etc)
 * @param {string} [opts.filename] - Nome do arquivo (apenas para document)
 * @param {string[]} [opts.parametrosBody] - Parâmetros de texto para o body
 * @param {Array<{sub_type?: string, payload?: string, url?: string, text?: string}>} [opts.botoes] - Botões
 * @param {string} [opts.categoria] - Categoria para custos: 'marketing' | 'utility' (default: 'marketing')
 * @returns {Promise<Object>}
 */
async function enviarWhatsAppComMidia({ numero, template, mediaType, mediaUrl, filename, parametrosBody = [], botoes = [], categoria = 'marketing' }) {
  if (!numero) throw new Error('numero é obrigatório');
  if (!template) throw new Error('template é obrigatório');
  if (!mediaUrl) throw new Error('mediaUrl é obrigatório');
  if (!['image', 'video', 'document'].includes(mediaType)) {
    throw new Error('mediaType deve ser: image, video ou document');
  }

  // Montar components
  const components = [];

  // Header com mídia
  const headerParam = { type: mediaType };
  headerParam[mediaType] = { link: mediaUrl };
  if (mediaType === 'document' && filename) {
    headerParam[mediaType].filename = filename;
  }
  components.push({
    type: 'header',
    parameters: [headerParam],
  });

  // Body com parâmetros de texto
  if (parametrosBody.length > 0) {
    components.push({
      type: 'body',
      parameters: parametrosBody.map(p => ({ type: 'text', text: String(p) })),
    });
  }

  // Botões
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

  const result = await whatsappClient.enviarTemplate({
    telefone: numero,
    template_name: template,
    language: 'pt_BR',
    components,
  });

  // Registrar envio com categoria correta (marketing custa mais)
  await registrarEnvio(result.phone || numero.replace(/\D/g, ''), template, result.message_id, categoria);

  return {
    success: true,
    message_id: result.message_id,
    numero: result.phone,
  };
}

module.exports = { enviarWhatsApp, enviarWhatsAppComMidia };
