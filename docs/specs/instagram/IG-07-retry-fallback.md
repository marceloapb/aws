# IG-07: Retry + Fallback (Post Falhou)

## Metadados
- **ID:** IG-07
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** IG-03

## Contexto
Se a publicação falha (timeout, 5xx, rate limit), o sistema tenta novamente com backoff. Se falhar definitivamente, salva o erro e permite republicar manualmente.

## Escopo
- `apps/backend/src/handlers/instagram/retry.js` — NOVO
- SQS: fila de retry Instagram

## Fora de Escopo (NÃO TOCAR)
- Publicação principal (IG-03)
- Central (IG-06)
- Agendamento (IG-05)

## Spec Técnica

### Estratégia de Retry
| Tentativa | Delay | Ação |
|---|---|---|
| 1ª | Imediato | Publicação normal |
| 2ª | 1 minuto | SQS delay |
| 3ª | 5 minutos | SQS delay |
| Após 3ª | — | Status='falho', notificar admin |

### Erros Retryable
| Código | Descrição | Retry? |
|---|---|---|
| 500 | Internal Server Error Meta | ✅ |
| 503 | Service Unavailable | ✅ |
| 429 | Rate Limit (25 posts/24h) | ✅ (delay 1h) |
| Timeout | Sem resposta em 30s | ✅ |
| 400 | Bad Request (imagem inválida) | ❌ |
| 190 | Token expirado | ❌ (alertar refresh) |

### SQS
```yaml
InstagramRetryQueue:
  Type: AWS::SQS::Queue
  Properties:
    VisibilityTimeout: 360
    RedrivePolicy:
      deadLetterTargetArn: !GetAtt InstagramDLQ.Arn
      maxReceiveCount: 3

InstagramDLQ:
  Type: AWS::SQS::Queue
  Properties:
    MessageRetentionPeriod: 1209600
```

### Lógica
```js
async function processarRetryIG(event) {
  for (const record of event.Records) {
    const { postId, tenantId, tentativa } = JSON.parse(record.body)
    const post = await getPost(tenantId, postId)
    
    try {
      await publicarPost(post)
      await atualizarPost(postId, { status: 'publicado', tentativas: tentativa })
    } catch (err) {
      if (tentativa >= 3 || !isRetryable(err)) {
        await atualizarPost(postId, { status: 'falho', erro: err.message, tentativas: tentativa })
        await notificarAdmin(tenantId, 'post_falho', { postId, erro: err.message })
      } else {
        throw err // SQS reprocessa
      }
    }
  }
}
```

### Rate Limit 429
- Se 429: delay de 1 hora (Meta rate limit é 25 posts/24h)
- Antes de publicar: checar contador de posts nas últimas 24h
- Se >= 23: alertar admin "Próximo do limite (23/25)"
- Se >= 25: bloquear e enfileirar para dia seguinte

## Critérios de Aceite
- [ ] Retry automático para erros técnicos
- [ ] Backoff: 0 → 1min → 5min
- [ ] Max 3 tentativas
- [ ] DLQ para falhas permanentes
- [ ] Rate limit 429 respeitado (delay 1h)
- [ ] Admin notificado em falha definitiva
- [ ] Contador de posts/24h

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IG-07: Retry + Fallback Instagram.

1. Crie handlers/instagram/retry.js: consumer SQS.
2. SQS + DLQ (maxReceiveCount: 3).
3. Backoff: 1min, 5min.
4. Rate limit: checar 25/24h antes de publicar.
5. Notificar admin em falha definitiva.
6. SAM: filas + trigger.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
