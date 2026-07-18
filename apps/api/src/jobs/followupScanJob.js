/**
 * ══════════════════════════════════════════════════════════════
 * FOLLOWUP SCAN JOB — Varredura periódica (EventBridge a cada 1h)
 * Processa disparos pendentes, reativa silenciados, gera métricas
 * ══════════════════════════════════════════════════════════════
 */

const logger = require('../config/logger');
const { varrerDisparosPendentes, reativarSilenciados } = require('../services/followupService');

async function processarFollowups() {
  logger.info({ action: 'followup_scan_start', timestamp: new Date().toISOString() });

  // 1. Reativar execuções silenciadas que já passaram do prazo
  const reativados = await reativarSilenciados();
  if (reativados > 0) {
    logger.info({ action: 'followup_reativados', count: reativados });
  }

  // 2. Varrer e disparar pendentes
  const resultado = await varrerDisparosPendentes();

  logger.info({
    action: 'followup_scan_complete',
    ...resultado,
    timestamp: new Date().toISOString(),
  });

  return resultado;
}

const handler = async (event) => {
  try {
    const resultado = await processarFollowups();
    return { statusCode: 200, body: resultado };
  } catch (error) {
    logger.error({ action: 'followup_scan_error', error: error.message, stack: error.stack });
    throw error;
  }
};

module.exports = { handler };
module.exports.default = { handler };
