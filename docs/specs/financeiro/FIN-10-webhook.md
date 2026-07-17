# FIN-10: API Pública — Webhook de Confirmação + Idempotência

## Metadados
- **ID:** FIN-10
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Alto
- **Dependência:** FIN-09

## Contexto
O gateway de pagamento envia webhooks quando um pagamento é confirmado, cancelado ou reembolsado. O sistema recebe, valida (assinatura), processa de forma idempotente e atualiza a cobrança.

## Escopo
- `apps/backend/src/handlers/financeiro/webhook.js` — NOVO
- API: POST /webhooks/pagamento/:provedor (rota PÚBLICA, sem Cognito)
- DynamoDB: registrar EVENTO_WEBHOOK
- EventBridge: emitir cobranca.paga

## Fora de Escopo (NÃO TOCAR)
- Adapter (FIN-09)
- Frontend
- Outros módulos

## Spec Técnica

### Rota
- POST /webhooks/pagamento/{provedor}
- Pública (sem autenticação Cognito)
- Protegida por validação de assinatura do provedor

### Fluxo
```
1. Gateway envia POST com payload do evento
2. Lambda valida assinatura (x-signature header)
3. Lambda extrai idempotency_key do payload
4. Verifica se já processou esse evento (EVENTO_WEBHOOK)
5. Se já processou: retorna 200 OK (idempotente)
6. Se novo: processa conforme tipo de evento
7. Registra EVENTO_WEBHOOK no DynamoDB
8. Retorna 200 OK
```

### Validação de Assinatura
```js
// Mercado Pago
function validarAssinatura(headers, body, webhookSecret) {
  const xSignature = headers['x-signature']
  const xRequestId = headers['x-request-id']
  // HMAC SHA256 do body com webhook_secret
  const hash = crypto.createHmac('sha256', webhookSecret)
    .update(xRequestId + body)
    .digest('hex')
  return hash === xSignature
}
```

### Tipos de Evento
| Tipo | Ação |
|---|---|
| payment.confirmed / payment.approved | Marcar cobrança como paga |
| payment.cancelled | Marcar cobrança como cancelada |
| payment.refunded | Marcar cobrança como reembolsada |
| payment.pending | Noop (já está em_aberto) |

### Processar Pagamento Confirmado
```js
async function processarPagamentoConfirmado(payload, gatewayConfig) {
  const cobrancaId = mapearCobrancaId(payload) // extrair do metadata
  const cobranca = await getCobranca(cobrancaId)
  
  if (['paga', 'cancelada', 'reembolsada'].includes(cobranca.status)) {
    return // já processado, idempotente
  }
  
  await updateCobranca(cobrancaId, {
    status: 'paga',
    valor_pago: payload.amount,
    metodo_pagamento: payload.payment_method,
    data_pagamento: payload.date_approved,
    updated_at: new Date().toISOString()
  })
  
  // Emitir evento downstream
  await emitEvent('cobranca.paga', {
    cobranca_id: cobrancaId,
    orcamento_id: cobranca.orcamento_id,
    valor_pago: payload.amount,
    origem: 'gateway'
  })
}
```

### Idempotência
- Key: `idempotency_key` = ID do evento no provedor (ex: payment.id do Mercado Pago)
- Antes de processar: verificar se existe EVENTO_WEBHOOK com mesmo idempotency_key
- Se existe e processado=true: retornar 200 sem reprocessar
- Se não existe: processar e registrar

### Segurança
- Rota pública (sem Cognito) — necessário para webhooks
- Validação de assinatura obrigatória
- Rate limiting: max 100 req/min por IP
- Body max: 1MB
- Se assinatura inválida: retornar 401

### SAM
```yaml
WebhookFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: src/handlers/financeiro/webhook.handler
    Events:
      WebhookAPI:
        Type: HttpApi
        Properties:
          Path: /webhooks/pagamento/{provedor}
          Method: POST
          # SEM authorizer (rota pública)
```

## Critérios de Aceite
- [ ] Rota pública funciona (sem Cognito)
- [ ] Validação de assinatura funciona
- [ ] Assinatura inválida retorna 401
- [ ] Pagamento confirmado atualiza cobrança para 'paga'
- [ ] Evento cobranca.paga emitido
- [ ] Idempotência: mesmo evento não reprocessa
- [ ] EVENTO_WEBHOOK registrado no DynamoDB
- [ ] TTL de 90 dias nos eventos
- [ ] Diferentes tipos de evento mapeados
- [ ] Retorna 200 em todos os cenários válidos (evitar retry do provedor)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-10: Webhook de Pagamento.

1. Crie handlers/financeiro/webhook.js: receber, validar assinatura, processar.
2. Idempotência via EVENTO_WEBHOOK no DynamoDB.
3. Tipos: confirmed → paga, cancelled → cancelada, refunded → reembolsada.
4. Emitir evento cobranca.paga via EventBridge.
5. Rota PÚBLICA: POST /webhooks/pagamento/{provedor} (sem Cognito).
6. Validar assinatura HMAC por provedor.
7. SAM: HttpApi sem authorizer.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
