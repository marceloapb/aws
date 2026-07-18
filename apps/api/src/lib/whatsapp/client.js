const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ssm = new SSMClient({ region: 'us-east-1' });
const PREFIX = process.env.SSM_PREFIX || '/mbf/prod';

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
 * @param {{ telefone: string, template_name: string, language?: string, parameters?: Array<{type: string, text: string}> }} opts
 */
async function enviarTemplate({ telefone, template_name, language = 'pt_BR', parameters = [] }) {
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

  if (parameters.length > 0) {
    body.template.components = [{
      type: 'body',
      parameters: parameters.map(p => ({
        type: 'text',
        text: p.text || p,
      })),
    }];
  }

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`,
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
    `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`,
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
  getConfig,
};

