# ORC-04: Condições de Pagamento Calculadas

## Metadados
- **ID:** ORC-04
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Alto
- **Dependência:** ORC-03

## Contexto
O cliente precisa ver o valor final conforme a forma de pagamento escolhida. A spec §6 define 3 modalidades: à vista com desconto, parcelado sem juros, e parcelado com juros (tabela Price).

## Escopo
- `apps/frontend/src/pages/admin/OrcamentoForm.jsx` — seção de pagamento
- `apps/frontend/src/components/orcamento/CondicoesPagamento.jsx` — NOVO
- `apps/frontend/src/utils/paymentCalculator.js` — NOVO
- Backend: validação e persistência

## Fora de Escopo (NÃO TOCAR)
- Gateway de pagamento (cobrança real)
- Financeiro (Financeiro.jsx)
- Notas fiscais

## Spec Técnica

### Modalidades
| Modalidade | Parâmetros | Cálculo |
|---|---|---|
| À vista | desconto_percentual | valor × (1 - desconto/100) |
| Parcelado s/ juros | num_parcelas (2-12) | valor / num_parcelas |
| Parcelado c/ juros | num_parcelas, taxa_mensal | PMT = PV × [i(1+i)^n] / [(1+i)^n - 1] |

### Frontend — paymentCalculator.js
```js
export function calcAVista(valorTotal, descontoPercent) { return valorTotal * (1 - descontoPercent / 100) }
export function calcParceladoSemJuros(valorTotal, numParcelas) { return { parcela: valorTotal / numParcelas, total: valorTotal } }
export function calcPrice(valorTotal, numParcelas, taxaMensal) {
  const i = taxaMensal / 100
  const pmt = valorTotal * (i * Math.pow(1 + i, numParcelas)) / (Math.pow(1 + i, numParcelas) - 1)
  return { parcela: pmt, total: pmt * numParcelas }
}
```

### Frontend — CondicoesPagamento.jsx
- Cards comparativos: À Vista | Sem Juros | Com Juros
- Admin define parâmetros, valores calculados em tempo real
- Toggle habilitar/desabilitar modalidade

## Critérios de Aceite
- [ ] Cálculo à vista com desconto correto
- [ ] Cálculo parcelado sem juros correto
- [ ] Cálculo Price correto
- [ ] Admin pode habilitar/desabilitar modalidades
- [ ] Valores atualizam em tempo real
- [ ] Cards comparativos mostram economia/acréscimo
- [ ] No aceite, cliente escolhe modalidade

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ORC-04: Condições de Pagamento Calculadas.

1. Crie apps/frontend/src/utils/paymentCalculator.js com as 3 funções de cálculo.
2. Crie apps/frontend/src/components/orcamento/CondicoesPagamento.jsx com cards comparativos.
3. Em OrcamentoForm.jsx: adicionar seção de condições de pagamento.
4. Backend: persistir condicoes_pagamento[], validar cálculos.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
