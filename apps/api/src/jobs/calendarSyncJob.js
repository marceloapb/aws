// ══════════════════════════════════════════════════════════════
// JOBS/CALENDAR-SYNC-JOB.JS — Sincronização periódica Google Calendar
// ══════════════════════════════════════════════════════════════

import { sincronizarBidirecional } from '../services/googleCalendarSyncService.js';
import { features } from '../config/env.js';

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

export function startCalendarSyncJob() {
  if (!features.googleCalendar) {
    console.log('[CALENDAR SYNC JOB] Feature desabilitada — job não iniciado');
    return;
  }

  console.log('[CALENDAR SYNC JOB] Iniciado — sincronizando a cada 30 minutos');
  setInterval(executarSync, INTERVAL_MS);
  // Aguardar 10s antes da primeira execução para dar tempo do server iniciar
  setTimeout(executarSync, 10000);
}

async function executarSync() {
  try {
    console.log('[CALENDAR SYNC JOB] Iniciando sincronização...');
    const resultado = await sincronizarBidirecional();

    if (resultado.success) {
      console.log(`[CALENDAR SYNC JOB] Concluído — ${resultado.logs.length} operações`);
    } else {
      console.error('[CALENDAR SYNC JOB] Falhou:', resultado.error);
    }
  } catch (error) {
    console.error('[CALENDAR SYNC JOB] Erro:', error.message);
  }
}

export default { startCalendarSyncJob };
