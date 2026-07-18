// ══════════════════════════════════════════════════════════════
// ADAPTERS/NOTIFICACOES/WHATSAPP-ADAPTER.JS — Envio via WhatsApp Cloud API
// ══════════════════════════════════════════════════════════════

const whatsappClient = require('../../lib/whatsapp/client');

/**
 * Envia mensagem WhatsApp via template
 * Reutiliza o client existente em lib/whatsapp/client.js
 * @param {Object} opts
 * @param {string} opts.numero - Número do destinatário (com ou sem DDI)
 * @param {string} opts.template - Nome do template aprovado no Meta
 * @param {Array} opts.parametros - Parâmetros para substituição no template
 * @returns {Promise<Object>}
 */
async function enviarWhatsApp({ numero, template, parametros = [] }) {
  if (!numero) {
    throw new Error('numero é obrigatório para envio de WhatsApp');
  }
  if (!template) {
    throw new Error('template é obrigatório para envio de WhatsApp');
  }

  // Formatar parâmetros para o formato esperado pelo client
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

  return {
    success: true,
    message_id: result.message_id,
    numero: result.phone,
  };
}

module.exports = { enviarWhatsApp };
