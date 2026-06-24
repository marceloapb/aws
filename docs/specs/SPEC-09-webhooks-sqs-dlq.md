# SPEC-09 — Webhooks + Pagamento → SQS + DLQ

**ID:** 09  
**TIPO:** Melhoria  
**PRIORIDADE:** P2  
**IMPACTO:** Confiabilidade | **ESFORÇO:** Médio  

## CONTEXTO

`routes/webhooks.js` processa webhooks de pagamento de forma síncrona. Se falhar, o evento se perde. Gateways de pagamento fazem retry, mas sem idempotência o sistema pode duplicar cobranças.

## ESCOPO

- `apps/api/src/routes/webhooks.js` → receber, validar assinatura, enfileirar no SQS, retornar 200 imediatamente
- Criar Lambda consumer que processa da fila com idempotência
- DLQ para eventos que falharem 3x
- `template.yaml` → SQS Queue + DLQ + Lambda consumer

## FORA DE ESCOPO (NÃO TOCAR)

- Lógica dos adapters de pagamento (mantém interface)
- Outras rotas
- Frontend

## SPEC TÉCNICA

- SQS: `HorizonsWebhookQueue`, VisibilityTimeout 60s, MaxReceiveCount 3
- DLQ: `HorizonsWebhookDLQ`, retention 14 dias
- Lambda consumer: batch size 1, processa evento, grava idempotency key no DynamoDB
- Idempotency: `PK=IDEMPOTENCY#<webhookId>`, TTL 24h

## CRITÉRIOS DE ACEITE

- Webhook retorna 200 em <100ms (só enfileira)
- Processamento assíncrono com retry automático
- Eventos duplicados não geram cobrança duplicada
- DLQ captura falhas persistentes

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente processamento assíncrono de webhooks com SQS e idempotência.

1. Refatore `apps/api/src/routes/webhooks.js`:
   - Valide assinatura do webhook (header específico de cada gateway)
   - Envie mensagem para SQS com `SendMessageCommand`
   - Retorne 200 imediatamente com `{ received: true }`

2. Crie `apps/api/src/handlers/webhookConsumer.js`:
   ```js
   const { processWebhookEvent } = require('../services/webhookProcessorService');
   exports.handler = async (event) => {
     for (const record of event.Records) {
       const payload = JSON.parse(record.body);
       await processWebhookEvent(payload);
     }
   };
   ```

3. Crie `apps/api/src/services/webhookProcessorService.js`:
   - Verifique idempotency key no DynamoDB (`PK=IDEMPOTENCY#<eventId>`)
   - Se já existe, skip
   - Se não, processe via adapter correto e grave idempotency key com TTL

4. No `template.yaml`, adicione:
   ```yaml
   WebhookQueue:
     Type: AWS::SQS::Queue
     Properties:
       VisibilityTimeout: 60
       RedrivePolicy:
         deadLetterTargetArn: !GetAtt WebhookDLQ.Arn
         maxReceiveCount: 3

   WebhookDLQ:
     Type: AWS::SQS::Queue
     Properties:
       MessageRetentionPeriod: 1209600

   WebhookConsumerFunction:
     Type: AWS::Serverless::Function
     Properties:
       Handler: src/handlers/webhookConsumer.handler
       Timeout: 60
       Events:
         SQSEvent:
           Type: SQS
           Properties:
             Queue: !GetAtt WebhookQueue.Arn
             BatchSize: 1
   ```

5. Adicione `@aws-sdk/client-sqs` ao `package.json`.

Altere SOMENTE: `apps/api/src/routes/webhooks.js`, `apps/api/src/handlers/webhookConsumer.js` (criar), `apps/api/src/services/webhookProcessorService.js` (criar), `template.yaml`, `apps/api/package.json`. Não refatore, renomeie ou mexa em mais nada.
```
