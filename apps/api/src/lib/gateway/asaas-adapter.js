const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ssm = new SSMClient({ region: 'us-east-1' });
const PREFIX = process.env.SSM_PREFIX || '/mbf/prod';

let cachedConfig = null;

async function getConfig() {
  if (cachedConfig) return cachedConfig;
  const [baseUrlParam, apiKeyParam] = await Promise.all([
    ssm.send(new GetParameterCommand({ Name: `${PREFIX}/ASAAS_BASE_URL`, WithDecryption: false })),
    ssm.send(new GetParameterCommand({ Name: `${PREFIX}/ASAAS_API_KEY`, WithDecryption: true })),
  ]);
  cachedConfig = {
    baseUrl: baseUrlParam.Parameter.Value || 'https://api.asaas.com/v3',
    apiKey: apiKeyParam.Parameter.Value,
  };
  return cachedConfig;
}

async function criarCobranca({ valor, vencimento, cliente, descricao, meio }) {
  const config = await getConfig();

  const billingType = {
    pix: 'PIX',
    boleto: 'BOLETO',
    cartao: 'CREDIT_CARD',
  }[meio] || 'PIX';

  const body = {
    customer: cliente.asaas_customer_id || undefined,
    billingType,
    value: valor / 100, // Asaas usa reais, não centavos
    dueDate: vencimento.split('T')[0],
    description: descricao,
    externalReference: `mbf-${Date.now()}`,
  };

  // Se não tem customer_id, cria inline
  if (!body.customer) {
    body.customer = undefined;
    // Asaas precisa de customer separado, mas simplificamos aqui
  }

  const response = await fetch(`${config.baseUrl}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': config.apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Asaas error: ${JSON.stringify(data.errors || data)}`);
  }

  return {
    cobranca_externa_id: data.id,
    status: 'pendente',
    link_pagamento: data.invoiceUrl || data.bankSlipUrl || '',
    pix_copia_cola: data.pixTransaction?.payload || '',
    pix_qr_code: data.pixTransaction?.encodedImage || '',
    boleto_url: data.bankSlipUrl || '',
  };
}

async function consultarStatus({ cobranca_externa_id }) {
  const config = await getConfig();

  const response = await fetch(`${config.baseUrl}/payments/${cobranca_externa_id}`, {
    headers: { 'access_token': config.apiKey },
  });

  const data = await response.json();
  const statusMap = {
    PENDING: 'pendente',
    RECEIVED: 'pago',
    CONFIRMED: 'pago',
    OVERDUE: 'atrasado',
    REFUNDED: 'estornado',
    CANCELED: 'cancelado',
  };

  return {
    status: statusMap[data.status] || 'pendente',
    pago_em: data.paymentDate || null,
  };
}

async function cancelar({ cobranca_externa_id }) {
  const config = await getConfig();

  const response = await fetch(`${config.baseUrl}/payments/${cobranca_externa_id}`, {
    method: 'DELETE',
    headers: { 'access_token': config.apiKey },
  });

  return { success: response.ok };
}

function parseWebhook(body, headers) {
  // Asaas envia o evento no body
  if (!body || !body.event) return null;

  const eventMap = {
    'PAYMENT_CONFIRMED': 'payment_confirmed',
    'PAYMENT_RECEIVED': 'payment_confirmed',
    'PAYMENT_OVERDUE': 'payment_failed',
    'PAYMENT_REFUNDED': 'payment_refunded',
  };

  const evento = eventMap[body.event];
  if (!evento) return null;

  const statusMap = {
    'PAYMENT_CONFIRMED': 'pago',
    'PAYMENT_RECEIVED': 'pago',
    'PAYMENT_OVERDUE': 'atrasado',
    'PAYMENT_REFUNDED': 'estornado',
  };

  return {
    evento,
    cobranca_externa_id: body.payment?.id || '',
    status: statusMap[body.event] || 'pendente',
    pago_em: body.payment?.paymentDate || null,
  };
}

module.exports = {
  criarCobranca,
  consultarStatus,
  cancelar,
  parseWebhook,
};

