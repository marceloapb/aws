# ORC-08: Valor Sugerido Automático

## Metadados
- **ID:** ORC-08
- **Tipo:** Melhoria
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** ORC-03

## Contexto
O admin monta a opção com itens do catálogo e precisa calcular mentalmente o valor total. O sistema deve somar automaticamente e sugerir o valor, permitindo override manual.

## Escopo
- `apps/frontend/src/components/orcamento/OpcaoBuilder.jsx` — cálculo automático
- `apps/frontend/src/utils/orcamentoCalculator.js` — NOVO

## Fora de Escopo (NÃO TOCAR)
- Condições de pagamento (ORC-04)
- Catálogo (Catalogo.jsx)
- Backend

## Spec Técnica

### orcamentoCalculator.js
```js
export function calcValorOpcao(itensSnapshot) {
  return itensSnapshot.reduce((sum, item) => sum + (item.valor_unitario * item.quantidade), 0)
}

export function calcValorComExtras(baseValue, horasExtras, valorHoraExtra) {
  return baseValue + (horasExtras * valorHoraExtra)
}
```

### Frontend — OpcaoBuilder.jsx
- Campo "Valor total" auto-calculado pela soma dos itens
- Se admin edita manualmente: flag `valor_customizado = true`
- Mostra diferença: "Sugerido: R$ 6.700 | Seu preço: R$ 6.200 (-7%)"
- Botão "Resetar para sugerido" limpa override
- Campo opcional: horas extras + valor/hora extra

## Critérios de Aceite
- [ ] Soma automática dos itens funciona
- [ ] Override manual marca flag
- [ ] Comparativo sugerido × customizado visível
- [ ] Horas extras somam ao total
- [ ] Botão reset funciona
- [ ] Valor 0 é rejeitado

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ORC-08: Valor Sugerido Automático.

1. Crie apps/frontend/src/utils/orcamentoCalculator.js com funções de cálculo.
2. Em OpcaoBuilder.jsx: campo valor auto-calculado, override manual, comparativo.
3. Validar valor > 0.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
