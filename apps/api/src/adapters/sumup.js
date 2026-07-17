// ══════════════════════════════════════════════════════════════
// ADAPTERS/SUMUP.JS — Gateway SumUp
// ══════════════════════════════════════════════════════════════

const { env } = require('../config/env');

const BASE_URL = 'https://api.sumup.com/v0.1';
const TIMEOUT_MS = 15000;

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${env.SUMUP_API_KEY}`,
  };
}

function mapStatus(sumupStatus) {
  const map = {
    PENDING: 'pendente',
    SUCCESSFUL: 'pago',
    CANCELLED: 'cancelado',
    FAILED: 'cancelado',
    EXPIRED: 'vencido',
  };
  return map[sumupStatus] || 'pendente';
}

async function criarCobranca(dados) {
  const body = {
    amount: dados.valor,
    currency: 'BRL',
    checkout_reference: dados.referencia || crypto.randomUUID(),
    description: dados.descricao,
    pay_to_email: env.SES_FROM_EMAIL,
    redirect_url: `${env.FRONTEND_URL}/pagamento/sucesso`,
  };

  const response = await fetch(`${BASE_URL}/checkouts`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Erro SumUp');

  return {
    gateway_id: data.id,
    status: 'pendente',
    link_pagamento: `https://api.sumup.com/v0.1/checkouts/${data.id}`,
  };
}

async function consultarCobranca(gatewayId) {
  const response = await fetch(`${BASE_URL}/checkouts/${gatewayId}`, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error('Erro ao consultar SumUp');

  return {
    gateway_id: data.id,
    status: mapStatus(data.status),
    valor: data.amount,
    data_pagamento: data.transactions?.[0]?.timestamp || null,
  };
}

async function cancelarCobranca(gatewayId) {
  const response = await fetch(`${BASE_URL}/checkouts/${gatewayId}`, {
    method: 'DELETE',
    headers: getHeaders(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) throw new Error('Erro ao cancelar SumUp');
  return { gateway_id: gatewayId, status: 'cancelado' };
}

async function processarWebhook(payload, headers) {
  return {
    gateway_id: payload.id,
    status: mapStatus(payload.status),
    dados_brutos: payload,
  };
}

module.exports = { criarCobranca, consultarCobranca, cancelarCobranca, processarWebhook };
