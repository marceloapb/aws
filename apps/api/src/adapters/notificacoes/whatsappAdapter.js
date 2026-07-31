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
        type: 'template',
        templateNome: template,
        categoria: categoria || 'utility',
        status: 'enviado',
        messageId: messageId || null,
        origem: 'notificacao',
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
 * @returns {Promise<Object>}
 */
async function enviarWhatsApp({ numero, template, parametros = [], components = null }) {
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

module.exports = { enviarWhatsApp };
