# FIN-05: API — Cálculo de % Pago do Orçamento

## Metadados
- **ID:** FIN-05
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** FIN-03

## Contexto
O percentual pago de um orçamento é consumido por múltiplos módulos: Álbuns (trava dos 70%), Dashboard, Orçamentos (badge). Precisa ser calculado em tempo real ou atualizado via evento.

## Escopo
- `apps/backend/src/handlers/financeiro/percentualPago.js` — NOVO
- API: GET /admin/financeiro/orcamentos/:id/percentual
- EventBridge: listener de cobranca.paga → atualiza cache

## Fora de Escopo (NÃO TOCAR)
- Trava dos 70% (ALB-04 — consome este dado)
- Gateway
- Frontend

## Spec Técnica

### Cálculo
```js
async function calcularPercentualPago(orcamentoId) {
  // Buscar todas as cobranças do orçamento
  const cobrancas = await queryCobrancasPorOrcamento(orcamentoId)
  
  const valorTotal = cobrancas.reduce((sum, c) => sum + c.valor, 0)
  const valorPago = cobrancas
    .filter(c => ['paga', 'paga_parcial'].includes(c.status))
    .reduce((sum, c) => sum + c.valor_pago, 0)
  
  const percentual = valorTotal > 0 ? Math.round((valorPago / valorTotal) * 100) : 0
  
  return {
    orcamento_id: orcamentoId,
    valor_total: valorTotal,
    valor_pago: valorPago,
    percentual,
    total_cobrancas: cobrancas.length,
    cobrancas_pagas: cobrancas.filter(c => c.status === 'paga').length,
    cobrancas_atrasadas: cobrancas.filter(c => c.status === 'atrasada').length
  }
}
```

### Cache no Orçamento
- Após cada `cobranca.paga`, recalcular e gravar no ORCAMENTO:
  - `percentual_pago: number`
  - `valor_pago: number`
- Isso evita query cross-module (ALB-04 lê direto do álbum)

### Propagação
```
cobranca.paga → recalcula % → atualiza ORCAMENTO.percentual_pago
                             → atualiza ALBUM.percentual_pago (se existe álbum vinculado)
```

### API Response
```json
{
  "orcamento_id": "orc_001",
  "valor_total": 4500.00,
  "valor_pago": 3150.00,
  "percentual": 70,
  "total_cobrancas": 3,
  "cobrancas_pagas": 2,
  "cobrancas_atrasadas": 0
}
```

## Critérios de Aceite
- [ ] API retorna percentual correto
- [ ] Cálculo considera paga + paga_parcial
- [ ] Cache atualizado no ORCAMENTO após pagamento
- [ ] Cache atualizado no ALBUM (se existe)
- [ ] Propagação via evento funciona
- [ ] Retorna breakdown (total, pago, atrasadas)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-05: Cálculo de % Pago do Orçamento.

1. Crie handlers/financeiro/percentualPago.js: calcular % com base nas cobranças.
2. Rota: GET /admin/financeiro/orcamentos/{id}/percentual.
3. Listener de cobranca.paga: recalcular e cachear no ORCAMENTO + ALBUM.
4. Retornar breakdown completo.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
