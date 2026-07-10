# SPEC-27 — Gateway de Pagamento: Interface + Adapter

| Campo | Valor |
|-------|-------|
| ID | GAP-12 / SPEC-27 |
| Tipo | Feature |
| Prioridade | P2 |
| Impacto | Alto |
| Esforço | Alto |

## CONTEXTO

§21 e §21.1 do MVP-1 definem integração gateway-agnóstica com primeiro adapter (Asaas ou MercadoPago). SPEC-09 (webhooks SQS DLQ) já fornece a infra de recebimento.

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/lib/gateway/interface.js` — interface/contrato do adapter
- `src/lib/gateway/asaas-adapter.js` — primeiro adapter concreto
- `src/functions/gateway/criar-cobranca-externa.js` — POST /admin/cobrancas/:id/gerar-link
- `src/functions/gateway/webhook-handler.js` — consumer SQS (processa confirmação)
- `template.yaml` — rotas + role

## FORA DE ESCOPO (NÃO TOCAR)

- Segundo adapter (MP) — futuro
- Cobrança recorrente/assinatura
- Split de pagamento
- Qualquer outro arquivo

## SPEC TÉCNICA

### Interface (src/lib/gateway/interface.js)

```javascript
// Todo adapter deve implementar:
module.exports = {
  criarCobranca: async ({ valor, vencimento, cliente, descricao }) => {},
  consultarStatus: async ({ cobranca_externa_id }) => {},
  cancelar: async ({ cobranca_externa_id }) => {},
  parseWebhook: (body, headers) => {} // retorna { evento, cobranca_externa_id, status, pago_em }
};
```

### Adapter Asaas

- Base URL em SSM: `/mbf/gateway/asaas/base-url`
- API Key em SSM: `/mbf/gateway/asaas/api-key`
- Cria cobrança via POST /payments
- Webhook: valida assinatura (header `asaas-webhook-token`)

### Fluxos

**Criar cobrança externa (admin):**
- Busca cobrança interna (SPEC-20)
- Chama adapter.criarCobranca()
- Salva cobranca_externa_id + link_pagamento no item DynamoDB
- Retorna link para o admin enviar ao cliente

**Webhook handler (SQS consumer):**
- Recebe evento do gateway (já na fila via SPEC-09)
- Chama adapter.parseWebhook()
- Se status=pago: atualiza cobrança interna (marcar pago)
- Idempotência: conditional write com cobranca_externa_id

### IAM

Role `GatewayFunctionRole`:
- SSM: GetParameter `/mbf/gateway/*`
- DynamoDB: GetItem, UpdateItem
- SQS: ReceiveMessage, DeleteMessage (para consumer)

## CRITÉRIOS DE ACEITE

1. Interface documentada e exportada
2. Adapter Asaas cria cobrança e retorna link
3. Webhook processa confirmação e marca cobrança como paga
4. Idempotência impede duplicação
5. Trocar adapter não requer mudar handlers

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar Gateway de Pagamento conforme spec SPEC-27.
Interface em src/lib/gateway/interface.js, adapter Asaas em
src/lib/gateway/asaas-adapter.js, handlers em src/functions/gateway/.

Alterar SOMENTE:
- template.yaml (rotas, role)
- src/lib/gateway/interface.js
- src/lib/gateway/asaas-adapter.js
- src/functions/gateway/criar-cobranca-externa.js
- src/functions/gateway/webhook-handler.js

NÃO refatorar, renomear ou mexer em mais nada.
```
