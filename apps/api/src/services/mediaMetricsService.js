// ══════════════════════════════════════════════════════════════
// SERVICES/MEDIA-METRICS-SERVICE.JS — Métricas de armazenamento de mídia
// ══════════════════════════════════════════════════════════════

const { queryAllByContext } = require('./mediaService');

const ALL_CONTEXTOS = ['album', 'portfolio', 'novidades', 'perfil', 'config'];

/**
 * Formata bytes em string legível
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = (bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0);
  return `${value} ${units[i]}`;
}

/**
 * Calcula métricas de armazenamento para um contexto
 * @param {string} contexto - album, portfolio, novidades, perfil, config
 * @returns {{ totalBytes, totalFiles, byStatus, formatted }}
 */
async function getStorageMetrics(contexto) {
  const items = await queryAllByContext(contexto);

  let totalBytes = 0;
  let totalFiles = 0;
  const byStatus = {
    processing: 0,
    processed: 0,
    deleted: 0,
    error: 0,
  };

  for (const item of items) {
    const itemBytes = (item.original_size || 0) + (item.web_size || 0) + (item.thumb_size || 0);
    totalBytes += itemBytes;
    totalFiles++;

    if (byStatus.hasOwnProperty(item.status)) {
      byStatus[item.status]++;
    }
  }

  return {
    totalBytes,
    totalFiles,
    byStatus,
    formatted: formatBytes(totalBytes),
  };
}

/**
 * Calcula métricas agregadas de TODOS os contextos
 * @returns {{ totalBytes, totalFiles, processedOk, errorsDlq, dlqMessages, recentUploads }}
 */
async function getAllStorageMetrics() {
  let totalBytes = 0;
  let totalFiles = 0;
  let processedOk = 0;
  let errorsDlq = 0;
  const recentUploads = [];

  const results = await Promise.all(
    ALL_CONTEXTOS.map(async (ctx) => {
      const items = await queryAllByContext(ctx);
      return { contexto: ctx, items };
    })
  );

  for (const { contexto, items } of results) {
    for (const item of items) {
      const itemBytes = (item.original_size || 0) + (item.web_size || 0) + (item.thumb_size || 0);
      totalBytes += itemBytes;
      totalFiles++;

      if (item.status === 'processed') processedOk++;
      if (item.status === 'error') errorsDlq++;

      // Coleta uploads recentes (últimos 10)
      if (item.created_at) {
        recentUploads.push({
          media_id: item.media_id,
          contexto,
          entidade_id: item.entidade_id,
          status: item.status,
          size: itemBytes,
          created_at: item.created_at,
        });
      }
    }
  }

  // Ordena por data e pega os 10 mais recentes
  recentUploads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return {
    totalBytes,
    totalFiles,
    processedOk,
    errorsDlq,
    dlqMessages: errorsDlq,
    lastDlqError: null,
    recentUploads: recentUploads.slice(0, 10),
    formatted: formatBytes(totalBytes),
  };
}

module.exports = { getStorageMetrics, getAllStorageMetrics, formatBytes };
