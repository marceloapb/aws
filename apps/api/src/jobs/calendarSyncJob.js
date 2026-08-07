// ══════════════════════════════════════════════════════════════
// JOBS/CALENDAR-SYNC-JOB.JS — Sincronização Google Calendar (Lambda)
// Executado via EventBridge Schedule a cada 30 minutos
// ══════════════════════════════════════════════════════════════

const { sincronizarBidirecional } = require('../services/googleCalendarSyncService');
const { features } = require('../config/env');

/**
 * Handler Lambda — executado pelo EventBridge Schedule
 */
async function handler() {
  if (!features.googleCalendar) {
    console.log('[CALENDAR SYNC] Feature desabilitada — ignorando');
    return { statusCode: 200, body: { skipped: true, reason: 'feature_disabled' } };
  }

  try {
    console.log('[CALENDAR SYNC] Iniciando sincronização...');
    const resultado = await sincronizarBidirecional();

    if (resultado.success) {
      console.log(`[CALENDAR SYNC] Concluído — ${resultado.logs.length} operações`);
      return { statusCode: 200, body: { success: true, operations: resultado.logs.length } };
    } else {
      console.error('[CALENDAR SYNC] Falhou:', resultado.error);
      return { statusCode: 500, body: { success: false, error: resultado.error } };
    }
  } catch (error) {
    console.error('[CALENDAR SYNC] Erro:', error.message);
    throw error;
  }
}

module.exports = { handler };
module.exports.default = { handler };
