// ══════════════════════════════════════════════════════════════
// ADAPTERS/PAGBANK.JS — Gateway PagBank (PagSeguro)
// ══════════════════════════════════════════════════════════════

const { env } = require('../config/env');

const BASE_URL = 'https://api.pagseguro.com';
const TIMEOUT_MS = 15000;

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${env.PAGBANK_TOKEN}`,
  };
}

function mapStatus(pbStatus) {
  const map = {
    WAITING: 'pendente',
    IN_ANALYSIS: 'processando',
    PAID: 'pago',
    AVAILABLE: 'pago',
    DECLINED: 'cancelado',
    CANCELED: 'cancelado',
    REFUNDED: 'estornado',
  };
  return map[pbStatus] || 'pendente';
}

async function criarCobranca(dados) {
  const body = {
    reference_id: dados.referencia || crypto.randomUUID(),
    customer: {
      name: dados.nome_cliente || 'Cliente',
      email: dados.email || 'cliente@email.com',
      tax_id: (dados.cpf || '').replace(/\D/g, ''),
    },
    items: [{
      reference_id: 'item-1',
      name: dados.descricao,
      quantity: 1,
      unit_amount: Math.round(dados.valor * 100),
    }],
    qr_codes: dados.meio_pagamento === 'pix' ? [{
      amount: { value: Math.round(dados.valor * 100) },
      expiration_date: new Date(Date.now() + 3600000).toISOString(),
    }] : undefined,
    charges: dados.meio_pagamento !== 'pix' ? [{
      reference_id: 'charge-1',
      amount: { value: Math.round(dados.valor * 100), currency: 'BRL' },
      payment_method: {
        type: dados.meio_pagamento === 'boleto' ? 'BOLETO' : 'CREDIT_CARD',
        ...(dados.meio_pagamento === 'boleto' && {
          boleto: {
            due_date: dados.data_vencimento,
            holder: { name: dados.nome_cliente || 'Cliente', tax_id: (dados.cpf || '').replace(/\D/g, '') },
          },
        }),
        ...(dados.meio_pagamento === 'cartao_credito' && {
          installments: dados.parcelas || 1,
          card: { encrypted: dados.card_token },
        }),
      },
    }] : undefined,
  };

  const response = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_messages?.[0]?.description || 'Erro PagBank');

  const result = {
    gateway_id: data.id,
    status: 'pendente',
    link_pagamento: data.links?.find((l) => l.rel === 'PAY')?.href || null,
  };

  if (dados.meio_pagamento === 'pix' && data.qr_codes?.[0]) {
    result.pix_copia_cola = data.qr_codes[0].text || null;
    result.pix_qr_code = data.qr_codes[0].links?.find((l) => l.media === 'image/png')?.href || null;
  }

  if (dados.meio_pagamento === 'boleto' && data.charges?.[0]) {
    const boleto = data.charges[0].payment_method?.boleto;
    result.boleto_url = boleto?.formatted_barcode || null;
    result.boleto_codigo = boleto?.barcode || null;
  }

  return result;
}

async function consultarCobranca(gatewayId) {
  const response = await fetch(`${BASE_URL}/orders/${gatewayId}`, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error('Erro ao consultar PagBank');

  const charge = data.charges?.[0];
  return {
    gateway_id: data.id,
    status: mapStatus(charge?.status || data.status),
    valor: (charge?.amount?.value || 0) / 100,
    data_pagamento: charge?.paid_at || null,
  };
}

async function cancelarCobranca(gatewayId) {
  const response = await fetch(`${BASE_URL}/charges/${gatewayId}/cancel`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ amount: { value: 0 } }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) throw new Error('Erro ao cancelar PagBank');
  return { gateway_id: gatewayId, status: 'cancelado' };
}

async function processarWebhook(payload, headers) {
  return {
    gateway_id: payload.id,
    status: mapStatus(payload.charges?.[0]?.status),
    dados_brutos: payload,
  };
}

module.exports = { criarCobranca, consultarCobranca, cancelarCobranca, processarWebhook };
