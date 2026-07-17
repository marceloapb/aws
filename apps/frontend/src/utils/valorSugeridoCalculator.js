/**
 * ORC-08: Calculadora de valor sugerido automático
 * Calcula o valor baseado nos itens + horas extras + deslocamento
 */

export function calcHorasEvento(eventos = []) {
  return eventos.reduce((total, ev) => {
    if (!ev.hora_inicio || !ev.hora_fim) return total;
    const [hi, mi] = ev.hora_inicio.split(':').map(Number);
    const [hf, mf] = ev.hora_fim.split(':').map(Number);
    const horas = (hf + mf / 60) - (hi + mi / 60);
    return total + Math.max(0, horas);
  }, 0);
}

export function calcValorSugerido(opcao, config = {}) {
  // Subtotal dos itens selecionados
  const subtotalItens = (opcao.itens_snapshot || []).reduce(
    (sum, item) => sum + (item.valor_unitario || 0) * (item.quantidade || 1), 0
  );

  // Horas inclusas nos itens
  const horasInclusas = (opcao.itens_snapshot || []).reduce(
    (sum, item) => sum + (item.horas_incluidas || item.duracao || 0), 0
  );

  // Horas totais dos eventos
  const horasEvento = calcHorasEvento(opcao.eventos);

  // Horas extras
  const horasExtras = Math.max(0, horasEvento - horasInclusas);
  const valorHoraExtra = config.valor_hora_extra || 350;
  const subtotalExtras = horasExtras * valorHoraExtra;

  return {
    subtotal_itens: subtotalItens,
    horas_inclusas: horasInclusas,
    horas_evento: horasEvento,
    horas_extras: horasExtras,
    valor_hora_extra: valorHoraExtra,
    subtotal_extras: subtotalExtras,
    total_sugerido: subtotalItens + subtotalExtras,
  };
}

/**
 * ORC-04: Calculadora de condições de pagamento (Price)
 */
export function calcAVista(valorTotal, descontoPct) {
  const valor = valorTotal * (1 - descontoPct / 100);
  return { valor, economia: valorTotal - valor };
}

export function calcParceladoSemJuros(valorTotal, numParcelas) {
  const parcela = valorTotal / numParcelas;
  return { parcela, total: valorTotal, numParcelas };
}

export function calcPrice(valorTotal, numParcelas, taxaMensal) {
  const i = taxaMensal / 100;
  if (i === 0) return calcParceladoSemJuros(valorTotal, numParcelas);
  const pmt = valorTotal * (i * Math.pow(1 + i, numParcelas)) / (Math.pow(1 + i, numParcelas) - 1);
  return { parcela: pmt, total: pmt * numParcelas, juros: (pmt * numParcelas) - valorTotal, numParcelas };
}
