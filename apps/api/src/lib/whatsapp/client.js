// ══════════════════════════════════════════════════════════════
// LIB/WHATSAPP/CLIENT.JS — WhatsApp Cloud API Client (Meta)
// ══════════════════════════════════════════════════════════════
//
// Formato correto para envio de template com header IMAGE:
// POST /{PHONE_NUMBER_ID}/messages
// {
//   "messaging_product": "whatsapp",
//   "to": "5511999999999",
//   "type": "template",
//   "template": {
//     "name": "nome_do_template",
//     "language": { "code": "pt_BR" },
//     "components": [
//       {
//         "type": "header",
//         "parameters": [{
//           "type": "image",
//           "image": { "link": "https://url-publica-https.com/imagem.png" }
//         }]
//       },
//       {
//         "type": "body",
//         "parameters": [
//           { "type": "text", "text": "param1" },
//           { "type": "text", "text": "param2" }
//         ]
//       }
//     ]
//   }
// }
//
// IMPORTANTE:
// - A URL da imagem DEVE ser HTTPS e publicamente acessível
// - A Meta faz download da imagem no momento do envio
// - header_handle da API de templates NÃO funciona como link aqui
// - Formatos suportados: JPEG, PNG (max 5MB para imagens)
//
// Ref: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
// ══════════════════════════════════════════════════════════════

const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ssm = new SSMClient({ region: 'us-east-1' });
const PREFIX = process.env.SSM_PREFIX || '/mbf/prod';
const API_VERSION = 'v21.0';

let cachedConfig = null;

async function getConfig() {
  if (cachedConfig) return cachedConfig;
  const [phoneParam, tokenParam] = await Promise.all([
    ssm.send(new GetParameterCommand({ Name: `${PREFIX}/WHATSAPP_PHONE_NUMBER_ID`, WithDecryption: false })),
    ssm.send(new GetParameterCommand({ Name: `${PREFIX}/WHATSAPP_ACCESS_TOKEN`, WithDecryption: true })),
  ]);
  cachedConfig = {
    phoneNumberId: phoneParam.Parameter.Value,
    accessToken: tokenParam.Parameter.Value,
  };
  return cachedConfig;
}

/**
 * Envia mensagem via template do WhatsApp Cloud API
 *
 * @param {Object} opts
 * @param {string} opts.telefone - Número do destinatário (com ou sem DDI)
 * @param {string} opts.template_name - Nome do template aprovado na Meta
 * @param {string} [opts.language='pt_BR'] - Código do idioma
 * @param {Array<{type: string, text: string}>} [opts.parameters=[]] - Parâmetros de texto para o body
 * @param {string|null} [opts.header_image_url=null] - URL pública HTTPS da imagem para o header
 * @param {Array|null} [opts.components=null] - Components customizados (sobrescreve parameters e header_image_url)
 */
async function enviarTemplate({ telefone, template_name, language = 'pt_BR', parameters = [], header_image_url = null, components = null }) {
  const config = await getConfig();

  // Formata telefone (remove não-numéricos, adiciona 55 se necessário)
  let phone = telefone.replace(/\D/g, '');
  if (!phone.startsWith('55')) phone = '55' + phone;

  const body = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: template_name,
      language: { code: language },
    },
  };

  // Se components customizados foram passados, usar diretamente
  if (components) {
    body.template.components = components;
  } else {
    const templateComponents = [];

    // Header com imagem — formato exigido pela Meta:
    // { type: "header", parameters: [{ type: "image", image: { link: "URL" } }] }
    if (header_image_url) {
      // Validar que é uma URL HTTPS pública
      if (!header_image_url.startsWith('https://')) {
        console.warn(`[WHATSAPP CLIENT] URL de imagem não é HTTPS: ${header_image_url}`);
      }

      templateComponents.push({
        type: 'header',
        parameters: [{
          type: 'image',
          image: { link: header_image_url },
        }],
      });
    }

    // Body parameters
    if (parameters.length > 0) {
      templateComponents.push({
        type: 'body',
        parameters: parameters.map(p => ({
          type: 'text',
          text: typeof p === 'string' ? p : (p.text || String(p)),
        })),
      });
    }

    if (templateComponents.length > 0) {
      body.template.components = templateComponents;
    }
  }

  console.log(`[WHATSAPP CLIENT] Enviando template "${template_name}" para ${phone}${header_image_url ? ` com imagem: ${header_image_url.substring(0, 80)}...` : ''}`);

  const response = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const errMsg = data.error?.message || JSON.stringify(data.error || data);
    const errCode = data.error?.code || response.status;
    console.error(`[WHATSAPP CLIENT] Erro ${errCode} ao enviar template "${template_name}": ${errMsg}`);

    // Logar detalhes úteis para debug de erros de imagem
    if (data.error?.error_data?.details) {
      console.error(`[WHATSAPP CLIENT] Detalhes: ${data.error.error_data.details}`);
    }

    throw new Error(`WhatsApp API error (${errCode}): ${errMsg}`);
  }

  const messageId = data.messages?.[0]?.id || null;
  console.log(`[WHATSAPP CLIENT] Template "${template_name}" enviado com sucesso. Message ID: ${messageId}`);

  return {
    success: true,
    message_id: messageId,
    phone,
  };
}

/**
 * Envia mensagem de imagem direta (dentro da janela de 24h)
 * Diferente de template — aqui envia uma imagem como mensagem livre
 *
 * @param {Object} opts
 * @param {string} opts.telefone - Número do destinatário
 * @param {string} opts.imageUrl - URL pública HTTPS da imagem
 * @param {string} [opts.caption] - Legenda da imagem (opcional)
 */
async function enviarImagem({ telefone, imageUrl, caption = '' }) {
  const config = await getConfig();

  let phone = telefone.replace(/\D/g, '');
  if (!phone.startsWith('55')) phone = '55' + phone;

  const body = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'image',
    image: {
      link: imageUrl,
      ...(caption && { caption }),
    },
  };

  const response = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`WhatsApp API error: ${JSON.stringify(data.error || data)}`);
  }

  return {
    success: true,
    message_id: data.messages?.[0]?.id || null,
    phone,
  };
}

/**
 * Envia mensagem de texto simples (dentro da janela de 24h)
 */
async function enviarTexto({ telefone, texto }) {
  const config = await getConfig();

  let phone = telefone.replace(/\D/g, '');
  if (!phone.startsWith('55')) phone = '55' + phone;

  const body = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: { body: texto },
  };

  const response = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`WhatsApp API error: ${JSON.stringify(data.error || data)}`);
  }

  return {
    success: true,
    message_id: data.messages?.[0]?.id || null,
  };
}

module.exports = {
  enviarTemplate,
  enviarTexto,
  enviarImagem,
  getConfig,
};
