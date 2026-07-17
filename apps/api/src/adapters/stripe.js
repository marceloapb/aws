// ══════════════════════════════════════════════════════════════
// ADAPTERS/STRIPE.JS — Gateway Stripe
// ══════════════════════════════════════════════════════════════

const Stripe = require('stripe');
const { env } = require('../config/env');

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

function mapStatus(stripeStatus) {
  const map = {
    succeeded: 'pago',
    processing: 'processando',
    requires_payment_method: 'pendente',
    requires_confirmation: 'pendente',
    canceled: 'cancelado',
    requires_action: 'processando',
  };
  return map[stripeStatus] || 'pendente';
}

async function criarCobranca(dados) {
  // Criar Payment Intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(dados.valor * 100), // Stripe usa centavos
    currency: 'brl',
    description: dados.descricao,
    metadata: { referencia: dados.referencia || '' },
    payment_method_types: getPaymentMethods(dados.meio_pagamento),
  });

  return {
    gateway_id: paymentIntent.id,
    status: mapStatus(paymentIntent.status),
    link_pagamento: null, // Stripe usa client_secret no frontend
    client_secret: paymentIntent.client_secret,
  };
}

async function consultarCobranca(gatewayId) {
  const paymentIntent = await stripe.paymentIntents.retrieve(gatewayId);

  return {
    gateway_id: paymentIntent.id,
    status: mapStatus(paymentIntent.status),
    valor: paymentIntent.amount / 100,
    data_pagamento: paymentIntent.status === 'succeeded'
      ? new Date(paymentIntent.created * 1000).toISOString()
      : null,
  };
}

async function cancelarCobranca(gatewayId) {
  const paymentIntent = await stripe.paymentIntents.cancel(gatewayId);
  return { gateway_id: paymentIntent.id, status: 'cancelado' };
}

async function processarWebhook(payload, headers) {
  const sig = headers['stripe-signature'];

  if (!sig || !env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook signature ausente');
  }

  const event = stripe.webhooks.constructEvent(
    payload,
    sig,
    env.STRIPE_WEBHOOK_SECRET
  );

  const paymentIntent = event.data.object;

  return {
    gateway_id: paymentIntent.id,
    status: mapStatus(paymentIntent.status),
    dados_brutos: event,
  };
}

function getPaymentMethods(meio) {
  const map = {
    pix: ['pix'],
    boleto: ['boleto'],
    cartao_credito: ['card'],
    cartao_debito: ['card'],
  };
  return map[meio] || ['pix', 'card', 'boleto'];
}

module.exports = { criarCobranca, consultarCobranca, cancelarCobranca, processarWebhook };
