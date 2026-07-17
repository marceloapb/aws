// ══════════════════════════════════════════════════════════════
// ADAPTERS/ASAAS.JS — Gateway Asaas
// ══════════════════════════════════════════════════════════════

const { env } = require('../config/env');

const BASE_URL = env.ASAAS_ENVIRONMENT === 'sandbox'
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3';

const TIMEOUT_MS = 15000;

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'access_token': env.ASAAS_API_KEY,
  };
}

function mapBillingType(meio) {
  const map = { pix: 'PIX', boleto: 'BOLETO', cartao_credito: 'CREDIT_CARD' };
  return map[meio] || 'PIX';
}

function mapStatus(asaasStatus) {
  const map = {
    PENDING: 'pendente',
    RECEIVED: 'pago',
    CONFIRMED: 'pago',
    OVERDUE: 'vencido',
    REFUNDED: 'estornado',
    DELETED: 'cancelado',
    AWAITING_RISK_ANALYSIS: 'processando',
  };
  return map[asaasStatus] || 'pendente';
}

async function criarCobranca(dados) {
  const body = {
    customer: dados.customer_id,
    billingType: mapBillingType(dados.meio_pagamento),
    value: dados.valor,
    dueDate: dados.data_vencimento,
    description: dados.descricao,
    externalReference: dados.referencia,
  };

  if (dados.meio_pagamento === 'cartao_credito' && dados.parcelas > 1) {
    body.installmentCount = dados.parcelas;
    body.installmentValue = Math.ceil((dados.valor / dados.parcelas) * 100) / 100;
  }

  const response = await fetch(`${BASE_URL}/payments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.errors?.[0]?.description || 'Erro Asaas');

  const result = {
    gateway_id: data.id,
    status: mapStatus(data.status),
    link_pagamento: data.invoiceUrl || null,
  };

  // Buscar PIX se aplicável
  if (dados.meio_pagamento === 'pix') {
    const pixResponse = await fetch(`${BASE_URL}/payments/${data.id}/pixQrCode`, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (pixResponse.ok) {
      const pixData = await pixResponse.json();
      result.pix_copia_cola = pixData.payload;
      result.pix_qr_code = pixData.encodedImage;
    }
  }

  // Buscar boleto se aplicável
  if (dados.meio_pagamento === 'boleto') {
    result.boleto_url = data.bankSlipUrl || null;
  }

  return result;
}

async function consultarCobranca(gatewayId) {
  const response = await fetch(`${BASE_URL}/payments/${gatewayId}`, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.errors?.[0]?.description || 'Erro ao consultar');

  return {
    gateway_id: data.id,
    status: mapStatus(data.status),
    valor: data.value,
    data_pagamento: data.paymentDate || null,
  };
}

async function cancelarCobranca(gatewayId) {
  const response = await fetch(`${BASE_URL}/payments/${gatewayId}`, {
    method: 'DELETE',
    headers: getHeaders(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.errors?.[0]?.description || 'Erro ao cancelar');
  }

  return { gateway_id: gatewayId, status: 'cancelado' };
}

async function processarWebhook(payload, headers) {
  // Asaas envia webhooks sem signature — validar por IP ou token
  return {
    gateway_id: payload.payment?.id,
    status: mapStatus(payload.event?.replace('PAYMENT_', '')),
    dados_brutos: payload,
  };
}

module.exports = { criarCobranca, consultarCobranca, cancelarCobranca, processarWebhook };
