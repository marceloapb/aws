# WPP-09: Retry Automático (3x Backoff, Falha Técnica)

## Metadados
- **ID:** WPP-09
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** WPP-06

## Contexto
Se o envio falha por motivo técnico (timeout, 5xx da Meta, rate limit), o sistema tenta novamente com backoff exponencial. NÃO faz retry para erros de negócio (número inválido, template rejeitado).

## Escopo
- `apps/backend/src/handlers/whatsapp/retry.js` — NOVO
- SQS: fila de retry com delay
- DynamoDB: atualizar LOG_WPP.tentativas

## Fora de Escopo (NÃO TOCAR)
- Envio principal (WPP-06)
- Log (WPP-08)
- DLQ (mensagens que falharam 3x vão para análise)

## Spec Técnica

### Estratégia de Retry
| Tentativa | Delay | Ação |
|---|---|---|
| 1ª | Imediato | Envio normal |
| 2ª | 30 segundos | SQS delay |
| 3ª | 2 minutos | SQS delay |
| Após 3ª | — | Move para DLQ, status='falho' |

### Erros Retryable
| Código | Descrição | Retry? |
|---|---|---|
| 500 | Internal Server Error Meta | ✅ |
| 503 | Service Unavailable | ✅ |
| 429 | Rate Limit | ✅ (com backoff maior) |
| Timeout | Sem resposta em 10s | ✅ |
| 400 | Bad Request | ❌ |
| 401 | Unauthorized | ❌ |
| 404 | Number not found | ❌ |

### SQS
```yaml
WhatsAppRetryQueue:
  Type: AWS::SQS::Queue
  Properties:
    VisibilityTimeout: 180
    RedrivePolicy:
      deadLetterTargetArn: !GetAtt WhatsAppDLQ.Arn
      maxReceiveCount: 3

WhatsAppDLQ:
  Type: AWS::SQS::Queue
  Properties:
    MessageRetentionPeriod: 1209600  # 14 dias
```

### Lógica
```js
async function processarRetry(event) {
  for (const record of event.Records) {
    const { logId, payload, tentativa } = JSON.parse(record.body)
    
    try {
      await enviar(payload)
      await atualizarLog(logId, { status: 'enviado', tentativas: tentativa })
    } catch (err) {
      if (tentativa >= 3 || !isRetryable(err)) {
        await atualizarLog(logId, { status: 'falho', erro: err.message, tentativas: tentativa })
      } else {
        throw err // SQS reprocessa com delay
      }
    }
  }
}
```

## Critérios de Aceite
- [ ] Retry automático para erros técnicos
- [ ] Backoff: 0s → 30s → 2min
- [ ] Max 3 tentativas
- [ ] DLQ para falhas permanentes
- [ ] LOG_WPP.tentativas atualizado
- [ ] Não faz retry para erro de negócio
- [ ] Status final='falho' após 3x

## Prompt Pronto para o Kiro CLI

```
Implemente a spec WPP-09: Retry Automático.

1. Crie handlers/whatsapp/retry.js: consumer da SQS de retry.
2. SQS com VisibilityTimeout + DLQ (maxReceiveCount: 3).
3. Backoff: 30s, 2min via MessageDelaySeconds.
4. Só retry para erros técnicos (5xx, timeout, 429).
5. Atualizar LOG_WPP.tentativas.
6. SAM: filas SQS + DLQ + trigger Lambda.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
