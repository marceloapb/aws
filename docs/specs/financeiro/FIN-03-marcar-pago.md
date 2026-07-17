# FIN-03: API — Marcar Cobrança como Paga (Manual)

## Metadados
- **ID:** FIN-03
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** FIN-01

## Contexto
O admin precisa marcar manualmente cobranças como pagas (quando recebe PIX, dinheiro, transferência fora do gateway). Isso atualiza o status, registra método/data, e dispara evento para atualizar % pago do orçamento.

## Escopo
- `apps/backend/src/handlers/financeiro/marcarPago.js` — NOVO
- API: PUT /admin/financeiro/cobrancas/:id/pagar
- EventBridge: evento `cobranca.paga` para downstream

## Fora de Escopo (NÃO TOCAR)
- Gateway (FIN-10 faz o mesmo via webhook)
- Frontend (FIN-06)
- Cálculo % pago (FIN-05)

## Spec Técnica

### API — PUT /admin/financeiro/cobrancas/:id/pagar
```json
// Input
{
  "metodo_pagamento": "pix",
  "valor_pago": 1500.00,
  "data_pagamento": "2026-07-17",
  "observacao": "PIX recebido às 14h"
}

// Validações:
// - Cobrança existe e pertence ao tenant
// - Status atual: em_aberto ou atrasada (não permite pagar cancelada/reembolsada)
// - valor_pago > 0
// - data_pagamento <= hoje (não pode ser futuro)
// - metodo_pagamento: valor válido do enum
```

### Lógica
```js
async function marcarPago(cobrancaId, payload) {
  const cobranca = await getCobranca(cobrancaId)
  
  // Validar status
  if (!['em_aberto', 'atrasada'].includes(cobranca.status)) {
    throw new Error('status_invalido')
  }
  
  // Determinar novo status
  const novoStatus = payload.valor_pago >= cobranca.valor ? 'paga' : 'paga_parcial'
  
  // Atualizar
  await updateCobranca(cobrancaId, {
    status: novoStatus,
    valor_pago: payload.valor_pago,
    metodo_pagamento: payload.metodo_pagamento,
    data_pagamento: payload.data_pagamento,
    observacao: payload.observacao,
    updated_at: new Date().toISOString()
  })
  
  // Atualizar GSI1SK com novo status
  // Disparar evento para recalcular % pago
  await emitEvent('cobranca.paga', {
    cobranca_id: cobrancaId,
    orcamento_id: cobranca.orcamento_id,
    valor_pago: payload.valor_pago
  })
}
```

### Evento Downstream
- `cobranca.paga` → consumido por FIN-05 (recalcula % pago)
- `cobranca.paga` → consumido por ALB-04 (trava dos 70%)
- Canal: EventBridge (ou DynamoDB Stream)

### Pagamento Parcial
- Se valor_pago < valor: status = 'paga_parcial'
- Admin pode marcar novamente com valor restante
- Soma dos valor_pago acumulados = valor total → status muda para 'paga'

## Critérios de Aceite
- [ ] API aceita marcação manual
- [ ] Status muda para paga ou paga_parcial
- [ ] Validação de status atual (só em_aberto/atrasada)
- [ ] Método de pagamento registrado
- [ ] Data de pagamento registrada
- [ ] Evento cobranca.paga disparado
- [ ] Pagamento parcial funciona
- [ ] Não permite pagar cobrança cancelada

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-03: Marcar Cobrança como Paga (Manual).

1. Crie handlers/financeiro/marcarPago.js: validar, atualizar status, registrar pagamento.
2. Suportar pagamento parcial (paga_parcial).
3. Disparar evento cobranca.paga via EventBridge.
4. Rota: PUT /admin/financeiro/cobrancas/{id}/pagar.
5. Validações: status atual, valor > 0, data <= hoje.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
