// ══════════════════════════════════════════════════════════════
// SERVICES/MEDIA-METRICS-SERVICE.JS — Métricas de armazenamento de mídia
// ══════════════════════════════════════════════════════════════

const { queryAllByContext } = require('./mediaService');

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
 * @returns {{ total_bytes, total_files, by_status, formatted }}
 */
async function getStorageMetrics(contexto) {
  const items = await queryAllByContext(contexto);

  let total_bytes = 0;
  let total_files = 0;
  const by_status = {
    processing: 0,
    processed: 0,
    deleted: 0,
    error: 0,
  };

  for (const item of items) {
    const itemBytes = (item.original_size || 0) + (item.web_size || 0) + (item.thumb_size || 0);
    total_bytes += itemBytes;
    total_files++;

    if (by_status.hasOwnProperty(item.status)) {
      by_status[item.status]++;
    }
  }

  return {
    total_bytes,
    total_files,
    by_status,
    formatted: formatBytes(total_bytes),
  };
}

module.exports = { getStorageMetrics, formatBytes };
