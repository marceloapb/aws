# Módulo Financeiro / Pagamentos — Specs

## Subdomínios
1. **Pagamentos** (FIN-01 a FIN-06) — Contas a receber, cobranças, marcação manual
2. **Gateway** (FIN-07 a FIN-12) — Adapter plugável, webhook, cobrança automática
3. **Financeiro** (FIN-13 a FIN-20) — Despesas, caixa, rentabilidade

## Dependências entre specs:

- **Fase 1 (P0):** FIN-01 → FIN-02 → FIN-03 (modelo → gerar cobranças → marcar pago)
- **Fase 2 (P1):** FIN-04, FIN-05, FIN-06 (scheduler, % pago, visão gestão) | FIN-07 → FIN-08 → FIN-09 → FIN-10 (gateway)
- **Fase 3 (P2):** FIN-11, FIN-12 | FIN-13 → FIN-14 → FIN-15 → FIN-16 → FIN-17 → FIN-18 (despesas/caixa)
- **Fase 4 (P3):** FIN-19, FIN-20 (análise de gestão)

## Lista de Specs

| ID | Arquivo | Prioridade | Título |
|---|---|---|---|
| FIN-01 | [FIN-01-modelo-cobranca.md](./FIN-01-modelo-cobranca.md) | P0 | DynamoDB — modelagem COBRANCA |
| FIN-02 | [FIN-02-gerar-cobrancas.md](./FIN-02-gerar-cobrancas.md) | P0 | Lambda — gerar cobranças do aceite |
| FIN-03 | [FIN-03-marcar-pago.md](./FIN-03-marcar-pago.md) | P0 | API — marcar cobrança como paga |
| FIN-04 | [FIN-04-scheduler-atraso.md](./FIN-04-scheduler-atraso.md) | P1 | Scheduler — status atrasada |
| FIN-05 | [FIN-05-percentual-pago.md](./FIN-05-percentual-pago.md) | P1 | API — cálculo % pago |
| FIN-06 | [FIN-06-visao-gestao.md](./FIN-06-visao-gestao.md) | P1 | API — visão de gestão |
| FIN-07 | [FIN-07-modelo-gateway.md](./FIN-07-modelo-gateway.md) | P1 | DynamoDB — modelagem Gateway |
| FIN-08 | [FIN-08-crud-gateway.md](./FIN-08-crud-gateway.md) | P1 | API — CRUD de gateways |
| FIN-09 | [FIN-09-adapter-cobranca.md](./FIN-09-adapter-cobranca.md) | P1 | Lambda — adapter plugável |
| FIN-10 | [FIN-10-webhook.md](./FIN-10-webhook.md) | P1 | API pública — webhook |
| FIN-11 | [FIN-11-pagina-pagamento.md](./FIN-11-pagina-pagamento.md) | P2 | Página pública de pagamento |
| FIN-12 | [FIN-12-reconsulta-status.md](./FIN-12-reconsulta-status.md) | P2 | API — reconsultar status |
| FIN-13 | [FIN-13-modelo-despesa.md](./FIN-13-modelo-despesa.md) | P2 | DynamoDB — modelagem Despesa |
| FIN-14 | [FIN-14-categorias-despesa.md](./FIN-14-categorias-despesa.md) | P2 | API — CRUD categorias despesa |
| FIN-15 | [FIN-15-despesa-avulsa.md](./FIN-15-despesa-avulsa.md) | P2 | API — CRUD despesa avulsa |
| FIN-16 | [FIN-16-despesa-recorrente.md](./FIN-16-despesa-recorrente.md) | P2 | Despesa fixa/recorrente |
| FIN-17 | [FIN-17-entrada-manual.md](./FIN-17-entrada-manual.md) | P2 | API — entrada manual |
| FIN-18 | [FIN-18-fluxo-caixa.md](./FIN-18-fluxo-caixa.md) | P2 | API — fluxo de caixa |
| FIN-19 | [FIN-19-rentabilidade.md](./FIN-19-rentabilidade.md) | P3 | API — rentabilidade por evento |
| FIN-20 | [FIN-20-evolucao-mensal.md](./FIN-20-evolucao-mensal.md) | P3 | API — evolução mês a mês |
