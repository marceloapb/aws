// ══════════════════════════════════════════════════════════════
// ADAPTERS/MERCADOPAGO.JS — Gateway MercadoPago
// ══════════════════════════════════════════════════════════════

const { env } = require('../config/env');

const BASE_URL = 'https://api.mercadopago.com/v1';
const TIMEOUT_MS = 15000;

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
    'X-Idempotency-Key': crypto.randomUUID(),
  };
}

function mapStatus(mpStatus) {
  const map = {
    pending: 'pendente',
    approved: 'pago',
    authorized: 'processando',
    in_process: 'processando',
    in_mediation: 'processando',
    rejected: 'cancelado',
    cancelled: 'cancelado',
    refunded: 'estornado',
    charged_back: 'estornado',
  };
  return map[mpStatus] || 'pendente';
}

async function criarCobranca(dados) {
  const body = {
    transaction_amount: dados.valor,
    description: dados.descricao,
    payment_method_id: getPaymentMethodId(dados.meio_pagamento),
    payer: { email: dados.email || 'cliente@email.com' },
    external_reference: dados.referencia || '',
  };

  if (dados.meio_pagamento === 'cartao_credito' && dados.parcelas > 1) {
    body.installments = dados.parcelas;
    body.token = dados.card_token;
  }

  const response = await fetch(`${BASE_URL}/payments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Erro MercadoPago');

  const result = {
    gateway_id: String(data.id),
    status: mapStatus(data.status),
    link_pagamento: data.point_of_interaction?.transaction_data?.ticket_url || null,
  };

  if (dados.meio_pagamento === 'pix') {
    result.pix_copia_cola = data.point_of_interaction?.transaction_data?.qr_code || null;
    result.pix_qr_code = data.point_of_interaction?.transaction_data?.qr_code_base64 || null;
  }

  return result;
}

async function consultarCobranca(gatewayId) {
  const response = await fetch(`${BASE_URL}/payments/${gatewayId}`, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Erro ao consultar');

  return {
    gateway_id: String(data.id),
    status: mapStatus(data.status),
    valor: data.transaction_amount,
    data_pagamento: data.date_approved || null,
  };
}

async function cancelarCobranca(gatewayId) {
  const response = await fetch(`${BASE_URL}/payments/${gatewayId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ status: 'cancelled' }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Erro ao cancelar');
  }

  return { gateway_id: gatewayId, status: 'cancelado' };
}

async function processarWebhook(payload, headers) {
  if (payload.type === 'payment') {
    const response = await fetch(`${BASE_URL}/payments/${payload.data.id}`, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = await response.json();
    return {
      gateway_id: String(data.id),
      status: mapStatus(data.status),
      dados_brutos: data,
    };
  }
  return null;
}

function getPaymentMethodId(meio) {
  const map = { pix: 'pix', boleto: 'bolbradesco', cartao_credito: 'visa' };
  return map[meio] || 'pix';
}

module.exports = { criarCobranca, consultarCobranca, cancelarCobranca, processarWebhook };
