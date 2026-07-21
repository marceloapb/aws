const { SSMClient, PutParameterCommand, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { loadParams, clearParamsCache } = require('../config/env');

const SSM_REGION = 'us-east-1';
const DAYS_BEFORE_EXPIRY = 15;
const TOKEN_LIFETIME_DAYS = 60;

async function handler() {
  console.log('[INSTAGRAM TOKEN RENEWAL] Verificando validade do token...');

  try {
    const params = await loadParams();
    const token = params.INSTAGRAM_ACCESS_TOKEN;

    if (!token) {
      console.log('[INSTAGRAM TOKEN RENEWAL] Token não configurado, ignorando.');
      return;
    }

    // Verificar validade do token atual via Meta debug_token ou refresh_access_token
    // A API /refresh_access_token retorna erro se o token já expirou,
    // mas se ainda é válido, retorna um novo token com 60 dias
    const checkUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`;
    const response = await fetch(checkUrl, { signal: AbortSignal.timeout(15000) });
    const data = await response.json();

    if (!response.ok || !data.access_token) {
      console.error('[INSTAGRAM TOKEN RENEWAL] Token inválido ou expirado. Precisa ser gerado manualmente no Meta Developer Portal.');
      console.error('[INSTAGRAM TOKEN RENEWAL] Erro:', data.error?.message || 'Unknown');
      return;
    }

    // Token ainda é válido. Verificar se faltam <= 15 dias para expirar
    const expiresInDays = data.expires_in ? Math.floor(data.expires_in / 86400) : TOKEN_LIFETIME_DAYS;

    if (expiresInDays <= DAYS_BEFORE_EXPIRY) {
      console.log(`[INSTAGRAM TOKEN RENEWAL] Token expira em ${expiresInDays} dias. Renovando...`);

      // Salvar novo token no SSM
      const ssm = new SSMClient({ region: SSM_REGION });
      const prefix = process.env.SSM_PREFIX || `/mbf/${process.env.STAGE || 'prod'}`;

      await ssm.send(new PutParameterCommand({
        Name: `${prefix}/INSTAGRAM_ACCESS_TOKEN`,
        Value: data.access_token,
        Type: 'SecureString',
        Overwrite: true,
      }));

      // Limpar cache para próximas chamadas usarem o novo token
      clearParamsCache();

      console.log(`[INSTAGRAM TOKEN RENEWAL] ✅ Token renovado com sucesso! Novo token expira em ${TOKEN_LIFETIME_DAYS} dias.`);
    } else {
      console.log(`[INSTAGRAM TOKEN RENEWAL] Token OK - expira em ${expiresInDays} dias. Nenhuma ação necessária.`);
    }
  } catch (error) {
    console.error('[INSTAGRAM TOKEN RENEWAL] Erro:', error.message);
  }
}

module.exports = { handler };
