# FIN-01: DynamoDB — Modelagem COBRANCA + GSIs

## Metadados
- **ID:** FIN-01
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** Nenhuma

## Contexto
A entidade COBRANCA é o coração do financeiro. Cada parcela/cobrança de um orçamento aceito vira um registro. Suporta: parcelas geradas do aceite, cobranças avulsas, vencimento, status, método de pagamento, e vínculo com gateway.

## Escopo
- `apps/backend/src/models/cobranca.js` — NOVO
- DynamoDB: entidade COBRANCA
- SAM template: GSIs

## Fora de Escopo (NÃO TOCAR)
- Frontend
- Gateway (FIN-07)
- Despesas (FIN-13)

## Spec Técnica

### Entidade COBRANCA
```json
{
  "PK": "TENANT#t123",
  "SK": "COBRANCA#cob_001",
  "GSI1PK": "TENANT#t123",
  "GSI1SK": "COBRANCA#STATUS#em_aberto#2026-08-15",
  "GSI2PK": "ORCAMENTO#orc_001",
  "GSI2SK": "COBRANCA#1",
  "id": "cob_001",
  "orcamento_id": "orc_001",
  "cliente_id": "cli_001",
  "numero_parcela": 1,
  "total_parcelas": 3,
  "valor": 1500.00,
  "valor_pago": 0,
  "vencimento": "2026-08-15",
  "status": "em_aberto",
  "metodo_pagamento": null,
  "data_pagamento": null,
  "gateway_id": null,
  "gateway_cobranca_id": null,
  "gateway_url": null,
  "observacao": null,
  "created_at": "2026-07-17T10:00:00Z",
  "updated_at": "2026-07-17T10:00:00Z"
}
```

### Status da Cobrança
| Status | Descrição |
|---|---|
| em_aberto | Gerada, aguardando pagamento |
| atrasada | Vencimento passou sem pagamento |
| paga | Pagamento confirmado (manual ou gateway) |
| paga_parcial | Valor pago < valor total |
| cancelada | Admin cancelou |
| reembolsada | Devolvida ao cliente |

### Métodos de Pagamento
| Método | Descrição |
|---|---|
| pix | PIX |
| cartao_credito | Cartão de crédito |
| cartao_debito | Cartão de débito |
| boleto | Boleto bancário |
| transferencia | Transferência bancária |
| dinheiro | Dinheiro |
| outro | Outro |

### GSIs
| GSI | PK | SK | Uso |
|---|---|---|---|
| GSI1 | TENANT#id | COBRANCA#STATUS#status#vencimento | Listar por status + vencimento |
| GSI2 | ORCAMENTO#id | COBRANCA#parcela | Cobranças de um orçamento |

## Critérios de Aceite
- [ ] Entidade COBRANCA no DynamoDB com todos os campos
- [ ] GSI1 para query por status + vencimento
- [ ] GSI2 para query por orçamento
- [ ] Status machine definida (em_aberto → paga/atrasada/cancelada)
- [ ] Model helper criado em cobranca.js

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-01: Modelagem COBRANCA no DynamoDB.

1. Crie apps/backend/src/models/cobranca.js com helpers CRUD.
2. Single-table: PK=TENANT#id, SK=COBRANCA#id.
3. GSI1: STATUS+vencimento. GSI2: ORCAMENTO+parcela.
4. Status: em_aberto, atrasada, paga, paga_parcial, cancelada, reembolsada.
5. SAM: declarar GSIs.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
