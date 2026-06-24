import * as asaas from './asaas.js';
import * as stripe from './stripe.js';
import * as mercadopago from './mercadopago.js';
import * as pagarme from './pagarme.js';
import * as pagbank from './pagbank.js';
import * as picpay from './picpay.js';
import * as sumup from './sumup.js';
import * as bancoInter from './banco-inter.js';
import * as stone from './stone.js';
import * as infinitepay from './infinitepay.js';

const adapters = {
  asaas, stripe, mercadopago, pagarme, pagbank, picpay, sumup,
  'banco-inter': bancoInter, stone, infinitepay,
};

function getAdapter(gateway) {
  const adapter = adapters[gateway];
  if (!adapter) throw new Error(`Gateway "${gateway}" não suportado`);
  return adapter;
}

export const criarCobranca = (gateway, dados) => getAdapter(gateway).criarCobranca(dados);
export const consultarCobranca = (gateway, id) => getAdapter(gateway).consultarCobranca(id);
export const cancelarCobranca = (gateway, id) => getAdapter(gateway).cancelarCobranca(id);
export const processarWebhook = (gateway, payload, headers) => getAdapter(gateway).processarWebhook(payload, headers);
