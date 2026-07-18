// ══════════════════════════════════════════════════════════════
// UTILS/SLUGIFY.JS — Gerar slug a partir de texto
// ══════════════════════════════════════════════════════════════

/**
 * Converte texto em slug URL-friendly.
 * - Lowercase
 * - Remove acentos (normalize NFD)
 * - Substitui espaços/caracteres especiais por hífens
 * - Remove hífens duplicados e nas bordas
 * - Máximo 80 caracteres
 */
function slugify(text) {
  if (!text) return '';

  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
    .replace(/[^a-z0-9\s-]/g, '')   // remove caracteres especiais
    .replace(/[\s_]+/g, '-')         // espaços e underscores -> hífen
    .replace(/-+/g, '-')             // hífens duplicados -> único
    .replace(/^-+|-+$/g, '')         // trim hífens nas bordas
    .slice(0, 80);                   // máximo 80 chars
}

module.exports = { slugify };
