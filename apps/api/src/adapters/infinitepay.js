// ══════════════════════════════════════════════════════════════
// ADAPTERS/INFINITEPAY.JS — Gateway InfinitePay
// ══════════════════════════════════════════════════════════════

import { env } from '../config/env.js';

const BASE_URL = 'https://api.infinitepay.io/v2';
const TIMEOUT_MS = 15000;

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${env.INFINITEPAY_API_KEY}`,
  };
}

function mapStatus(ipStatus) {
  const map = {
    pending: 'pendente',
    approved: 'pago',
    expired: 'vencido',
    canceled: 'cancelado',
    refunded: 'estornado',
  };
  return map[ipStatus] || 'pendente';
}

export async function criarCobranca(dados) {
  const body = {
    amount: Math.round(dados.valor * 100),
    description: dados.descricao,
    payment_method: dados.meio_pagamento === 'pix' ? 'pix' : 'credit_card',
    metadata: { referencia: dados.referencia || '' },
  };

  if (dados.meio_pagamento === 'cartao_credito' && dados.parcelas > 1) {
    body.installments = dados.parcelas;
  }

  const response = await fetch(`${BASE_URL}/transactions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Erro InfinitePay');

  const result = {
    gateway_id: data.id,
    status: mapStatus(data.status),
    link_pagamento: data.payment_url || null,
  };

  if (dados.meio_pagamento === 'pix') {
    result.pix_copia_cola = data.pix?.emv || null;
    result.pix_qr_code = data.pix?.qr_code_base64 || null;
  }

  return result;
}

export async function consultarCobranca(gatewayId) {
  const response = await fetch(`${BASE_URL}/transactions/${gatewayId}`, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error('Erro ao consultar InfinitePay');

  return {
    gateway_id: data.id,
    status: mapStatus(data.status),
    valor: data.amount / 100,
    data_pagamento: data.paid_at || null,
  };
}

export async function cancelarCobranca(gatewayId) {
  const response = await fetch(`${BASE_URL}/transactions/${gatewayId}/cancel`, {
    method: 'POST',
    headers: getHeaders(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) throw new Error('Erro ao cancelar InfinitePay');
  return { gateway_id: gatewayId, status: 'cancelado' };
}

export async function processarWebhook(payload, headers) {
  return {
    gateway_id: payload.id,
    status: mapStatus(payload.status),
    dados_brutos: payload,
  };
}

export default { criarCobranca, consultarCobranca, cancelarCobranca, processarWebhook };
