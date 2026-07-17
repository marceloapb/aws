# CT-12: Recálculo Financeiro (Pós-Aditivo)

## Metadados
- **ID:** CT-12
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Alto
- **Esforço:** Alto
- **Dependência:** CT-11, FIN-01

## Contexto
Quando um aditivo de aumento/redução é aceito, o sistema recalcula o financeiro: atualiza valor total, gera novas parcelas (mantendo as já pagas imutáveis), e registra a diferença. Parcelas pagas NUNCA são alteradas.

## Escopo
- `apps/backend/src/handlers/contratos/recalcular.js` — NOVO
- Trigger: evento 'aditivo.aceito'

## Fora de Escopo (NÃO TOCAR)
- Aditivo CRUD (CT-10)
- Aceite (CT-11)
- Parcelas já pagas (imutáveis)
- Módulo financeiro core (FIN-*)

## Spec Técnica

### Trigger
```
Evento: 'aditivo.aceito'
Payload: { tenant_id, contrato_id, aditivo_id, tipo, valor_novo, diferenca }
→ Lambda recalcularFinanceiro
```

### Fluxo
```js
async function recalcularFinanceiro(evento) {
  const { tenant_id, contrato_id, aditivo_id, valor_novo, diferenca } = evento
  const contrato = await getContrato(tenant_id, contrato_id)
  const parcelas = await getParcelas(tenant_id, contrato.orcamento_id)
  
  // Separar parcelas
  const pagas = parcelas.filter(p => p.status === 'pago')
  const pendentes = parcelas.filter(p => p.status === 'pendente')
  
  const totalPago = pagas.reduce((sum, p) => sum + p.valor, 0)
  const restante = valor_novo - totalPago
  
  if (diferenca > 0) {
    // AUMENTO: distribuir diferença nas parcelas pendentes
    const novasParcelas = redistribuirParcelas(pendentes, restante)
    await atualizarParcelas(tenant_id, contrato.orcamento_id, novasParcelas)
  } else if (diferenca < 0) {
    // REDUÇÃO: verificar se já pagou mais do que o novo valor
    if (totalPago > valor_novo) {
      // Crédito a devolver
      const credito = totalPago - valor_novo
      await criarPendenciaReembolso(tenant_id, {
        contrato_id,
        aditivo_id,
        valor: credito,
        status: 'pendente'
      })
      // Cancelar parcelas pendentes
      await cancelarParcelas(pendentes)
    } else {
      // Reduzir parcelas pendentes
      const novasParcelas = redistribuirParcelas(pendentes, restante)
      await atualizarParcelas(tenant_id, contrato.orcamento_id, novasParcelas)
    }
  }
  
  // Atualizar snapshot do contrato
  await atualizarContrato(contrato_id, {
    'snapshot_orcamento.valor_total': valor_novo,
    'snapshot_orcamento.aditivos_aplicados': [
      ...(contrato.snapshot_orcamento.aditivos_aplicados || []),
      { aditivo_id, tipo: evento.tipo, diferenca, data: new Date().toISOString() }
    ]
  })
  
  // Emitir evento
  await emitirEvento('financeiro.recalculado', {
    tenant_id, contrato_id, aditivo_id,
    valor_anterior: contrato.snapshot_orcamento.valor_total,
    valor_novo,
    total_pago: totalPago,
    restante
  })
}
```

### Redistribuir Parcelas
```js
function redistribuirParcelas(parcelasPendentes, valorRestante) {
  const qtd = parcelasPendentes.length
  if (qtd === 0) {
    // Criar 1 parcela nova com o restante
    return [{ valor: valorRestante, vencimento: proximoMes(), status: 'pendente' }]
  }
  
  const valorPorParcela = Math.ceil(valorRestante / qtd * 100) / 100
  return parcelasPendentes.map((p, i) => ({
    ...p,
    valor: i === qtd - 1 ? valorRestante - (valorPorParcela * (qtd - 1)) : valorPorParcela
  }))
}
```

### Regras Críticas
| Regra | Descrição |
|---|---|
| Parcelas pagas IMUTÁVEIS | Nunca alterar valor/status de parcela já paga |
| Aumento | Distribuir diferença nas pendentes |
| Redução (sem excesso) | Reduzir parcelas pendentes |
| Redução (com excesso) | Criar pendência de reembolso (CT-13) |
| Log | Registrar toda alteração com before/after |

## Critérios de Aceite
- [ ] Trigger por evento 'aditivo.aceito'
- [ ] Parcelas pagas nunca alteradas
- [ ] Aumento: distribuir nas pendentes
- [ ] Redução: reduzir pendentes ou criar reembolso
- [ ] Snapshot atualizado
- [ ] Evento 'financeiro.recalculado' emitido
- [ ] Log com before/after

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CT-12: Recálculo Financeiro.

1. Crie handlers/contratos/recalcular.js: trigger 'aditivo.aceito'.
2. Parcelas pagas: NUNCA alterar.
3. Aumento: redistribuir diferença nas pendentes.
4. Redução: se totalPago > valorNovo, criar pendência reembolso.
5. Atualizar snapshot do contrato.
6. Emitir 'financeiro.recalculado'.
7. SAM: trigger EventBridge.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
