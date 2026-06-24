// ══════════════════════════════════════════════════════════════
// ADAPTERS/INDEX.JS — Factory de gateways de pagamento
// ══════════════════════════════════════════════════════════════

import { env } from '../config/env.js';

const adapters = {};

export async function getAdapter(gateway) {
  if (!adapters[gateway]) {
    try {
      const module = await import(`./${gateway}.js`);
      adapters[gateway] = module.default || module;
    } catch (error) {
      throw new Error(`Gateway '${gateway}' não encontrado ou não implementado`);
    }
  }
  return adapters[gateway];
}

export async function criarCobranca(gateway, dados) {
  const adapter = await getAdapter(gateway);
  return adapter.criarCobranca(dados);
}

export async function consultarCobranca(gateway, gatewayId) {
  const adapter = await getAdapter(gateway);
  return adapter.consultarCobranca(gatewayId);
}

export async function cancelarCobranca(gateway, gatewayId) {
  const adapter = await getAdapter(gateway);
  return adapter.cancelarCobranca(gatewayId);
}

export async function processarWebhook(gateway, payload, headers) {
  const adapter = await getAdapter(gateway);
  return adapter.processarWebhook(payload, headers);
}

export function getGatewayPadrao() {
  return env.ASAAS_API_KEY ? 'asaas' : 'stripe';
}

export default { getAdapter, criarCobranca, consultarCobranca, cancelarCobranca, processarWebhook, getGatewayPadrao };
