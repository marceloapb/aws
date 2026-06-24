// ══════════════════════════════════════════════════════════════
// ADAPTERS/BANCO-INTER.JS — Gateway Banco Inter
// ══════════════════════════════════════════════════════════════

import { env } from '../config/env.js';

const BASE_URL = 'https://cdpj.partners.bancointer.com.br';
const TIMEOUT_MS = 15000;

let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  const response = await fetch(`${BASE_URL}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.BANCO_INTER_CLIENT_ID,
      client_secret: env.BANCO_INTER_CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'cobv.write cobv.read',
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Erro auth Banco Inter');

  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
  return accessToken;
}

function getHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

function mapStatus(interStatus) {
  const map = {
    ATIVA: 'pendente',
    CONCLUIDA: 'pago',
    REMOVIDA_PELO_USUARIO_RECEBEDOR: 'cancelado',
    REMOVIDA_PELO_PSP: 'cancelado',
    EXPIRADA: 'vencido',
  };
  return map[interStatus] || 'pendente';
}

export async function criarCobranca(dados) {
  const token = await getAccessToken();
  const txid = dados.referencia || crypto.randomUUID().replace(/-/g, '').substring(0, 26);

  const body = {
    calendario: { expiracao: 3600 },
    valor: { original: dados.valor.toFixed(2) },
    chave: env.BANCO_INTER_PIX_KEY || '',
    infoAdicionais: [{ nome: 'Descricao', valor: dados.descricao }],
  };

  const response = await fetch(`${BASE_URL}/pix/v2/cob/${txid}`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Erro Banco Inter');

  return {
    gateway_id: txid,
    status: 'pendente',
    pix_copia_cola: data.pixCopiaECola || data.location || null,
    link_pagamento: null,
  };
}

export async function consultarCobranca(gatewayId) {
  const token = await getAccessToken();

  const response = await fetch(`${BASE_URL}/pix/v2/cob/${gatewayId}`, {
    headers: getHeaders(token),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  if (!response.ok) throw new Error('Erro ao consultar Banco Inter');

  return {
    gateway_id: gatewayId,
    status: mapStatus(data.status),
    valor: parseFloat(data.valor?.original || '0'),
    data_pagamento: data.pix?.[0]?.horario || null,
  };
}

export async function cancelarCobranca(gatewayId) {
  const token = await getAccessToken();

  const response = await fetch(`${BASE_URL}/pix/v2/cob/${gatewayId}`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify({ status: 'REMOVIDA_PELO_USUARIO_RECEBEDOR' }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) throw new Error('Erro ao cancelar Banco Inter');
  return { gateway_id: gatewayId, status: 'cancelado' };
}

export async function processarWebhook(payload, headers) {
  return {
    gateway_id: payload.pix?.[0]?.txid,
    status: 'pago',
    dados_brutos: payload,
  };
}

export default { criarCobranca, consultarCobranca, cancelarCobranca, processarWebhook };
