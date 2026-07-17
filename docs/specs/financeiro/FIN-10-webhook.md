# FIN-10: API Pública — Webhook de Confirmação + Idempotência

## Metadados
- **ID:** FIN-10
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Alto
- **Dependência:** FIN-09

## Contexto
O gateway envia notificações (webhooks) quando o status do pagamento muda (aprovado, recusado, reembolsado). O sistema precisa: receber, validar assinatura, deduplicar (idempotência), processar e atualizar a cobrança.

## Escopo
- `apps/backend/src/handlers/financeiro/webhook.js` — NOVO
- API: POST /webhooks/:gatewayId (pública, sem Cognito auth)
- DynamoDB: registrar EVENTO_WEBHOOK
- Atualizar COBRANCA

## Fora de Escopo (NÃO TOCAR)
- Adapter (FIN-09 — já feito)
- Frontend
- Página de pagamento (FIN-11)

## Spec Técnica

### Rota
- `POST /webhooks/{gatewayId}` — PÚBLICA (sem authorizer)
- Segurança: validação de assinatura HMAC do provedor

### Fluxo
```
1. Receber POST do provedor
2. Extrair gateway_id do path
3. Buscar GATEWAY no DynamoDB → obter provedor e webhook_secret (SSM)
4. Validar assinatura HMAC (rejeitar se inválido → 401)
5. Extrair idempotency_key do payload (ex: event.id do MP)
6. Verificar se já processou (EVENTO_WEBHOOK com mesma key)
7. Se já processou → 200 OK (idempotente, não reprocessar)
8. Parsear evento → mapear para status interno
9. Buscar COBRANCA pelo gateway_cobranca_id
10. Atualizar COBRANCA (status, data_pagamento, valor_pago)
11. Registrar EVENTO_WEBHOOK
12. Disparar evento cobranca.paga (se aplicável)
13. Retornar 200 OK
```

### Mapeamento de Eventos (Mercado Pago)
| Evento MP | Status Interno |
|---|---|
| payment.approved | paga |
| payment.pending | em_aberto (manter) |
| payment.rejected | em_aberto (manter) |
| payment.cancelled | cancelada |
| payment.refunded | reembolsada |

### Validação HMAC (Mercado Pago)
```js
const crypto = require('crypto')

function validarAssinatura(payload, signature, secret) {
  // MP usa x-signature header com ts e v1
  const [ts, v1] = parseSignature(signature)
  const manifest = `id:${payload.data.id};request-id:${requestId};ts:${ts};`
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  return hmac === v1
}
```

### Idempotência
- Key: `{provedor}_{evento_id}` (ex: `mp_12345678`)
- Antes de processar: query EVENTO_WEBHOOK com idempotency_key
- Se existe e processado=true: retornar 200 sem reprocessar
- Se não existe: processar e registrar

### Error Handling
- Assinatura inválida: 401 (não registrar)
- Gateway não encontrado: 404
- Cobrança não encontrada: 200 (registrar evento, não quebrar)
- Erro interno: 500 (provedor fará retry)

### Retry do Provedor
- Mercado Pago: retry em 1min, 5min, 30min, 2h, 12h
- Idempotência garante que retry não duplica

## Critérios de Aceite
- [ ] Rota pública funciona (sem auth Cognito)
- [ ] Validação HMAC rejeita assinatura inválida (401)
- [ ] Idempotência: não reprocessa evento duplicado
- [ ] Cobrança atualizada para status correto
- [ ] Evento cobranca.paga disparado
- [ ] EVENTO_WEBHOOK registrado com payload
- [ ] TTL 90 dias nos eventos
- [ ] Retry do provedor funciona (idempotente)
- [ ] Error handling não quebra (200 em caso de cobrança não encontrada)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-10: Webhook de Confirmação.

1. Crie handlers/financeiro/webhook.js: receber, validar HMAC, deduplicar, processar.
2. Rota pública: POST /webhooks/{gatewayId} (sem authorizer).
3. Validar assinatura HMAC do provedor (SSM para secret).
4. Idempotência via EVENTO_WEBHOOK (idempotency_key).
5. Atualizar COBRANCA + disparar evento cobranca.paga.
6. SAM: rota pública, IAM para SSM e DynamoDB.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
