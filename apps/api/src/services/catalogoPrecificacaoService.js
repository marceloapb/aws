// ══════════════════════════════════════════════════════════════
// SERVICES/CATALOGO-PRECIFICACAO-SERVICE.JS — Cálculo de custo+margem
// ══════════════════════════════════════════════════════════════

/**
 * Calcula valor_base a partir de custo+margem.
 * Valores monetários em CENTAVOS (inteiros).
 * @param {object} item - Item do catálogo com campos de precificação
 * @returns {number|null} valor em centavos ou null se dados insuficientes
 */
function calcularValorBase(item) {
  if (item.preco_custo == null || item.margem_percentual == null) return null;
  const custoTotal = item.preco_custo + (item.frete || 0) + (item.outros_custos || 0);
  return Math.round(custoTotal * (1 + item.margem_percentual / 100));
}

/**
 * Resolve o valor_base efetivo: override manual ou calculado.
 * @param {object} item
 * @returns {number|null}
 */
function resolverValorBase(item) {
  return item.valor_base_override ?? calcularValorBase(item);
}

module.exports = { calcularValorBase, resolverValorBase };
