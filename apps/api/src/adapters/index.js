const asaas = require('./asaas');
const stripe = require('./stripe');
const mercadopago = require('./mercadopago');
const pagarme = require('./pagarme');
const pagbank = require('./pagbank');
const picpay = require('./picpay');
const sumup = require('./sumup');
const bancoInter = require('./banco-inter');
const stone = require('./stone');
const infinitepay = require('./infinitepay');

const adapters = {
  asaas, stripe, mercadopago, pagarme, pagbank, picpay, sumup,
  'banco-inter': bancoInter, stone, infinitepay,
};

function getAdapter(gateway) {
  const adapter = adapters[gateway];
  if (!adapter) throw new Error(`Gateway "${gateway}" não suportado`);
  return adapter;
}

const criarCobranca = (gateway, dados) => getAdapter(gateway).criarCobranca(dados);
const consultarCobranca = (gateway, id) => getAdapter(gateway).consultarCobranca(id);
const cancelarCobranca = (gateway, id) => getAdapter(gateway).cancelarCobranca(id);
const processarWebhook = (gateway, payload, headers) => getAdapter(gateway).processarWebhook(payload, headers);

module.exports = { criarCobranca, consultarCobranca, cancelarCobranca, processarWebhook };
