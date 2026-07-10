# SPEC-20 — Pagamento: Camada de Controle

| Campo | Valor |
|-------|-------|
| ID | GAP-07 / SPEC-20 |
| Tipo | Feature |
| Prioridade | P1 |
| Impacto | Alto |
| Esforço | Médio |

## CONTEXTO

§10 do MVP-1 define controle de cobranças, vencimentos, percentual pago. É a fundação sobre a qual o gateway de pagamento (§21) plugará depois. A regra dos 70% alimenta o módulo Entrega/Álbum.

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/functions/pagamento/gerar-cobrancas.js` — invocado internamente pelo aceite do orçamento
- `src/functions/pagamento/listar.js` — GET /admin/orcamentos/:id/cobrancas
- `src/functions/pagamento/marcar-pago.js` — PUT /admin/cobrancas/:id/pagar
- `src/functions/pagamento/get-percentual.js` — GET /internal/orcamentos/:id/percentual-pago
- `src/functions/pagamento/visao-geral.js` — GET /admin/financeiro/visao-geral
- `src/functions/pagamento/atualizar-atrasos.js` — handler EventBridge (cron diário)
- `template.yaml` — rotas + roles + EventBridge rule

## FORA DE ESCOPO (NÃO TOCAR)

- Gateway de pagamento (§21)
- Webhook de pagamento
- Estorno
- Nota fiscal (§28)
- Módulo financeiro completo (§22)
- Qualquer arquivo não listado

## SPEC TÉCNICA

### Modelo DynamoDB

```
PK: TENANT#1
SK: COBRANCA#<orc_id>#<numero_sequencial>
```

Campos: id, orcamento_id, numero, tipo (sinal|parcela|avista|saldo), valor, vencimento, status (em_aberto|paga|atrasada|cancelada), meio_pagamento (pix|cartao|transf|boleto|dinheiro), pago_em, valor_pago, created_at, updated_at

### Fluxos

**Gerar cobranças (interno — no aceite do orçamento):**
- À vista: 1 cobrança, tipo=`avista`, vencimento=data_aceite
- Parcelado com sinal: sinal (tipo=`sinal`, vencimento=data_aceite) + N parcelas (tipo=`parcela`, vencimentos mensais)
- Parcelado sem sinal: N parcelas
- Valores vêm do snapshot congelado do orçamento

**Marcar pago (admin):**
- Input: meio_pagamento, valor_pago (default = valor da cobrança)
- Atualiza status → `paga`, registra pago_em + valor_pago + meio
- Permite pagamento parcial (valor_pago < valor) → mantém status `em_aberto`, registra acumulado

**Percentual pago (interno):**
- `soma(valor_pago de todas cobranças) / valor_final_orcamento * 100`
- Retorna JSON `{ percentual: 73.5, valor_pago: 3675, valor_total: 5000 }`
- Usado pelo módulo Álbum para validar regra dos 70%

**Atualizar atrasos (EventBridge cron diário):**
- Query: status=`em_aberto` AND vencimento < today
- Para cada: status → `atrasada`

**Visão geral (admin):**
- Query params: `?periodo_inicio=&periodo_fim=`
- Retorna: { a_receber, recebido, vencido, total_previsto, qtd_em_aberto, qtd_atrasada }

### IAM

Role `PagamentoFunctionRole`:
- DynamoDB: PutItem, GetItem, UpdateItem, Query — tabela principal
- Rota `/internal/*` não exposta no API Gateway — invocação direta Lambda-to-Lambda ou via SDK

## CRITÉRIOS DE ACEITE

1. Cobranças geradas automaticamente no aceite (quantidade e valores corretos)
2. Marcar pago atualiza percentual
3. Atrasada detectada pelo cron diário
4. Percentual pago retorna cálculo correto
5. Visão geral retorna totais corretos por período
6. Rotas protegidas por grupo admin

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar camada de controle de Pagamento conforme spec SPEC-20.
Handlers em src/functions/pagamento/, geração automática de cobranças
a partir do aceite, marcação manual, cálculo de percentual pago,
cron de atraso via EventBridge.

Alterar SOMENTE:
- template.yaml (rotas, roles, EventBridge rule)
- src/functions/pagamento/*.js (6 handlers)

NÃO refatorar, renomear ou mexer em mais nada.
```
