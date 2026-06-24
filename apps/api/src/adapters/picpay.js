// ══════════════════════════════════════════════════════════════
// ADAPTERS/PICPAY.JS — Gateway PicPay
// ══════════════════════════════════════════════════════════════

import { env } from '../config/env.js';

const BASE_URL = 'https://appws.picpay.com/ecommerce/public';
const TIMEOUT_MS = 15000;

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-picpay-token': env.PICPAY_TOKEN,
  };
}

function mapStatus(picpayStatus) {
  const map = {
    created: 'pendente',
    expired: 'vencido',
    analysis: 'processando',
    paid: 'pago',
    completed: 'pago',
    refunded: 'estornado',
    chargeback: 'estornado',
  };
  return map[picpayStatus] || 'pendente';
}

export async function criarCobranca(dados) {
  const referenceId = dados.referencia || crypto.randomUUID();

  const body = {
    referenceId,
    callbackUrl: `${env.APP_URL}/api/webhooks/picpay`,
    returnUrl: `${env.FRONTEND_URL}/pagamento/sucesso`,
    value: dados.valor,
    expiresAt: dados.data_vencimento ? new Date(dados.data_vencimento + 'T23:59:59').toISOString() : undefined,
    buyer: {
      firstName: (dados.nome_cliente || 'Cliente').split(' ')[0],
      lastName: (dados.nome_cliente || 'Cliente').split(' ').slice(1).join(' ') || 'Cliente',
      document: (dados.cpf || '').replace(/\D/g, ''),
      email: dados.email || 'cliente@email.com',
    },
  };

  const response = await fetch(`${BASE_URL}/payments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Erro PicPay');

  return {
    gateway_id: referenceId,
    status: 'pendente',
    link_pagamento: data.paymentUrl || null,
    pix_qr_code: data.qrcode?.base64 || null,
    pix_copia_cola: data.qrcode?.content || null,
  };
}

export async function consultarCobranca(gatewayId) {
  const response = await fetch(`${BASE_URL}/payments/${gatewayId}/status`, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error('Erro ao consultar PicPay');

  return {
    gateway_id: gatewayId,
    status: mapStatus(data.status),
    valor: data.authorizationAmount || null,
    data_pagamento: data.paidAt || null,
  };
}

export async function cancelarCobranca(gatewayId) {
  const response = await fetch(`${BASE_URL}/payments/${gatewayId}/cancellations`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) throw new Error('Erro ao cancelar PicPay');
  return { gateway_id: gatewayId, status: 'cancelado' };
}

export async function processarWebhook(payload, headers) {
  return {
    gateway_id: payload.referenceId,
    status: mapStatus(payload.status),
    dados_brutos: payload,
  };
}

export default { criarCobranca, consultarCobranca, cancelarCobranca, processarWebhook };
