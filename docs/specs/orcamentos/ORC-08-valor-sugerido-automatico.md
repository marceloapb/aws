# ORC-08: Valor Sugerido Automático

## Metadados
- **ID:** ORC-08
- **Tipo:** Melhoria
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** ORC-03, ORC-01

## Contexto
O admin seleciona itens do catálogo e preenche horas/extras manualmente. O sistema deve calcular automaticamente o valor sugerido com base nos itens selecionados + horas extras + deslocamento, reduzindo erro humano.

## Escopo
- `apps/frontend/src/utils/valorSugeridoCalculator.js` — NOVO
- `apps/frontend/src/components/orcamento/OpcaoBuilder.jsx` — integrar cálculo
- `apps/frontend/src/pages/admin/OrcamentoForm.jsx` — exibir sugestão

## Fora de Escopo (NÃO TOCAR)
- Catálogo (preços vêm do snapshot)
- Condições de pagamento (ORC-04)
- Backend (cálculo é client-side)

## Spec Técnica

### Cálculo
```js
export function calcValorSugerido(opcao, configTenant) {
  const subtotalItens = opcao.itens_snapshot.reduce((sum, item) => sum + item.valor_total, 0)
  
  // Horas extras (se evento excede horas inclusas)
  const horasInclusas = opcao.itens_snapshot.reduce((sum, item) => sum + (item.horas_incluidas || 0), 0)
  const horasEvento = calcHorasEvento(opcao.eventos)
  const horasExtras = Math.max(0, horasEvento - horasInclusas)
  const valorHoraExtra = configTenant.valor_hora_extra || 350
  const subtotalExtras = horasExtras * valorHoraExtra
  
  // Deslocamento (se distância > limite)
  const deslocamento = calcDeslocamento(opcao.eventos, configTenant)
  
  return {
    subtotal_itens: subtotalItens,
    horas_extras: horasExtras,
    valor_hora_extra: valorHoraExtra,
    subtotal_extras: subtotalExtras,
    deslocamento: deslocamento,
    total_sugerido: subtotalItens + subtotalExtras + deslocamento
  }
}
```

### Frontend
- Campo valor mostra sugestão como placeholder/hint
- Se admin altera manualmente: flag `valor_customizado = true`
- Tooltip com breakdown: "Itens: R$ X + Extras: R$ Y + Deslocamento: R$ Z"
- Botão "Usar valor sugerido" restaura cálculo

## Critérios de Aceite
- [ ] Valor sugerido calcula automaticamente ao adicionar itens
- [ ] Horas extras detectadas e precificadas
- [ ] Breakdown visível em tooltip
- [ ] Admin pode aceitar ou customizar valor
- [ ] Flag valor_customizado diferencia os dois casos
- [ ] Botão restaurar recalcula

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ORC-08: Valor Sugerido Automático.

1. Crie apps/frontend/src/utils/valorSugeridoCalculator.js com cálculos.
2. Em OpcaoBuilder.jsx: mostrar sugestão com breakdown.
3. Em OrcamentoForm.jsx: exibir tooltip e botão restaurar.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
