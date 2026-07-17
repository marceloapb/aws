// ══════════════════════════════════════════════════════════════
// ADAPTERS/PAGARME.JS — Gateway Pagar.me
// ══════════════════════════════════════════════════════════════

const { env } = require('../config/env');

const BASE_URL = 'https://api.pagar.me/core/v5';
const TIMEOUT_MS = 15000;

function getHeaders() {
  const auth = Buffer.from(`${env.PAGARME_API_KEY}:`).toString('base64');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${auth}`,
  };
}

function mapStatus(pagarmeStatus) {
  const map = {
    pending: 'pendente',
    paid: 'pago',
    canceled: 'cancelado',
    failed: 'cancelado',
    overpaid: 'pago',
    underpaid: 'pendente',
    refunded: 'estornado',
  };
  return map[pagarmeStatus] || 'pendente';
}

async function criarCobranca(dados) {
  const body = {
    items: [{
      amount: Math.round(dados.valor * 100),
      description: dados.descricao,
      quantity: 1,
    }],
    payments: [{
      payment_method: getPaymentMethod(dados.meio_pagamento),
      ...(dados.meio_pagamento === 'pix' && { pix: { expires_in: 3600 } }),
      ...(dados.meio_pagamento === 'boleto' && { boleto: { due_at: dados.data_vencimento } }),
      ...(dados.meio_pagamento === 'cartao_credito' && {
        credit_card: {
          installments: dados.parcelas || 1,
          card_token: dados.card_token,
        },
      }),
    }],
    customer: {
      name: dados.nome_cliente || 'Cliente',
      email: dados.email || 'cliente@email.com',
      document: dados.cpf || '00000000000',
      type: 'individual',
    },
  };

  const response = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Erro Pagar.me');

  const charge = data.charges?.[0];
  const result = {
    gateway_id: data.id,
    status: mapStatus(data.status),
    link_pagamento: charge?.last_transaction?.url || null,
  };

  if (dados.meio_pagamento === 'pix' && charge?.last_transaction) {
    result.pix_copia_cola = charge.last_transaction.qr_code || null;
    result.pix_qr_code = charge.last_transaction.qr_code_url || null;
  }

  if (dados.meio_pagamento === 'boleto' && charge?.last_transaction) {
    result.boleto_url = charge.last_transaction.pdf || null;
    result.boleto_codigo = charge.last_transaction.line || null;
  }

  return result;
}

async function consultarCobranca(gatewayId) {
  const response = await fetch(`${BASE_URL}/orders/${gatewayId}`, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Erro ao consultar');

  return {
    gateway_id: data.id,
    status: mapStatus(data.status),
    valor: data.amount / 100,
    data_pagamento: data.closed_at || null,
  };
}

async function cancelarCobranca(gatewayId) {
  const response = await fetch(`${BASE_URL}/charges/${gatewayId}`, {
    method: 'DELETE',
    headers: getHeaders(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Erro ao cancelar');
  }

  return { gateway_id: gatewayId, status: 'cancelado' };
}

async function processarWebhook(payload, headers) {
  return {
    gateway_id: payload.data?.id,
    status: mapStatus(payload.data?.status),
    dados_brutos: payload,
  };
}

function getPaymentMethod(meio) {
  const map = { pix: 'pix', boleto: 'boleto', cartao_credito: 'credit_card' };
  return map[meio] || 'pix';
}

module.exports = { criarCobranca, consultarCobranca, cancelarCobranca, processarWebhook };
