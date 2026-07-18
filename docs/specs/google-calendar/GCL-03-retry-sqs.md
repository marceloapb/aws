# GCL-03: Fila de Retry (3x Backoff via SQS)

## Metadados
- **ID:** GCL-03
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** GCL-02

## Contexto
Quando a chamada ao Google Calendar falha (timeout, 500, 429, rede), a mensagem vai para uma fila SQS com retry automático: 3 tentativas com backoff exponencial. Após 3 falhas, vai para DLQ e gera alerta.

## Escopo
- `apps/backend/src/handlers/google-calendar/retrySync.js` — NOVO
- SQS: GoogleCalendarRetryQueue + DLQ
- SAM: filas + Lambda consumer

## Fora de Escopo (NÃO TOCAR)
- Sync principal (GCL-02)
- Log (GCL-04)
- Token expirado (GCL-06 — tratamento separado)

## Spec Técnica

### Arquitetura
```
GCL-02 (falha) → SQS (GoogleCalendarRetryQueue) → Lambda retrySync
                                                       ↓ (falha 3x)
                                                    DLQ → Alerta admin
```

### Fila SQS
```yaml
GoogleCalendarRetryQueue:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: !Sub '${AWS::StackName}-gcal-retry'
    VisibilityTimeout: 180
    MessageRetentionPeriod: 86400
    RedrivePolicy:
      deadLetterTargetArn: !GetAtt GoogleCalendarDLQ.Arn
      maxReceiveCount: 3

GoogleCalendarDLQ:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: !Sub '${AWS::StackName}-gcal-dlq'
    MessageRetentionPeriod: 1209600
```

### Backoff Strategy
| Tentativa | Delay | Total acumulado |
|---|---|---|
| 1ª | Imediato (visibilityTimeout 30s) | 30s |
| 2ª | 60s | ~90s |
| 3ª | 120s | ~210s |
| DLQ | — | Alerta admin |

### Lambda Consumer
```js
async function retrySync(event) {
  for (const record of event.Records) {
    const { tenant_id, acao, evento, tentativa } = JSON.parse(record.body)
    
    try {
      switch (acao) {
        case 'criar':
          await espelharEventoCriado(evento)
          break
        case 'atualizar':
          await espelharEventoAtualizado(evento)
          break
        case 'deletar':
          await espelharEventoCancelado(evento)
          break
      }
      
      // Sucesso — registrar no log
      await registrarSyncLog(tenant_id, evento.evento_id, {
        status: 'sucesso',
        tentativa: tentativa + 1,
        acao
      })
      
    } catch (error) {
      // Se é erro de token (401/403): não fazer retry, ir direto para GCL-06
      if (error.code === 401 || error.code === 403) {
        await marcarTokenInvalido(tenant_id)
        // Deletar da fila (não faz retry)
        return
      }
      
      // Outros erros: deixar SQS fazer retry automático (throw)
      throw error
    }
  }
}
```

### Enviar para Fila (chamado por GCL-02)
```js
async function enviarParaFilaRetry(tenantId, acao, evento, error) {
  await sqs.sendMessage({
    QueueUrl: process.env.GCAL_RETRY_QUEUE_URL,
    MessageBody: JSON.stringify({
      tenant_id: tenantId,
      acao,
      evento,
      tentativa: 0,
      erro_original: error.message,
      timestamp: new Date().toISOString()
    }),
    MessageAttributes: {
      'tenant_id': { DataType: 'String', StringValue: tenantId }
    }
  }).promise()
}
```

### Alerta DLQ
- EventBridge rule: quando mensagem chega na DLQ → notificar admin
- Mensagem: "Falha ao sincronizar evento com Google Calendar após 3 tentativas"

### Regras
- Erro 401/403: NÃO retry (token inválido → GCL-06)
- Erro 404/410 em delete: tratar como sucesso
- maxReceiveCount: 3 (depois vai pra DLQ)
- DLQ: reter 14 dias
- Alerta no DLQ para admin

## Critérios de Aceite
- [ ] Fila SQS criada com DLQ
- [ ] 3 tentativas com backoff
- [ ] Erro 401/403 não faz retry
- [ ] Sucesso registrado no log
- [ ] DLQ gera alerta admin
- [ ] Mensagem com tenant_id e ação

## Prompt Pronto para o Kiro CLI

```
Implemente a spec GCL-03: Fila de Retry Google Calendar.

1. Crie handlers/google-calendar/retrySync.js: consumer SQS.
2. SQS Queue + DLQ no SAM template.
3. maxReceiveCount: 3.
4. Erro 401/403: não retry, marcar token inválido.
5. Sucesso: registrar log.
6. DLQ: alerta admin via EventBridge.
7. SAM: filas + trigger Lambda.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
