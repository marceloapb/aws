# MID-09 — DLQ + Retry + Alerta (Resiliência)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | MID-09 |
| **Tipo** | Melhoria |
| **Prioridade** | P1 |
| **Impacto** | Alto — sem isso, fotos podem se perder silenciosamente |
| **Esforço** | Baixo |

## Contexto
Se o processamento (MID-03) falhar 3x, a mensagem vai pra Dead Letter Queue (DLQ). Precisa de: (1) alerta quando mensagem chega na DLQ, (2) Lambda de reprocessamento manual, (3) métrica de saúde no dashboard admin.

## Escopo
- **SQS DLQ:** `MediaProcessingDLQ` (já referenciada no MID-03)
- **CloudWatch Alarm:** dispara quando DLQ tem mensagens
- **SNS:** tópico para alerta (e-mail do admin)
- **Lambda:** `reprocessDLQ` — admin triggera manualmente para reprocessar mensagens da DLQ
- **API Gateway:** `POST /admin/media/reprocess-dlq`

## Fora de Escopo (NÃO TOCAR)
- Lógica de processamento (MID-03)
- Fila principal (MID-03)
- Alertas de outros módulos

## Spec Técnica

### SQS DLQ
```yaml
MediaProcessingDLQ:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: mbf-media-processing-dlq
    MessageRetentionPeriod: 1209600
```

### CloudWatch Alarm
```yaml
DLQAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: mbf-media-dlq-not-empty
    MetricName: ApproximateNumberOfMessagesVisible
    Namespace: AWS/SQS
    Dimensions:
      - Name: QueueName
        Value: !GetAtt MediaProcessingDLQ.QueueName
    Statistic: Sum
    Period: 300
    EvaluationPeriods: 1
    Threshold: 1
    ComparisonOperator: GreaterThanOrEqualToThreshold
    AlarmActions:
      - !Ref AlertTopic
```

### SNS Topic
```yaml
AlertTopic:
  Type: AWS::SNS::Topic
  Properties:
    TopicName: mbf-alerts
    Subscription:
      - Protocol: email
        Endpoint: admin@marcelobloisefotografia.com.br
```

### Lambda reprocessDLQ
- Auth: JWT admin
- Lê mensagens da DLQ (ReceiveMessage, max 10)
- Re-envia para a fila principal (MediaProcessingQueue)
- Deleta da DLQ após re-envio
- Retorna: { reprocessed: 10, remaining: 3 }

## Critérios de Aceite
- Falha 3x no processamento → mensagem na DLQ
- DLQ com mensagens → alerta por e-mail em <5min
- Admin pode reprocessar via API
- Reprocess move da DLQ para fila principal (não processa in-place)
- Mensagens na DLQ retidas por 14 dias
- Metric: count de mensagens na DLQ visível para o admin

## Prompt Pronto para o Kiro CLI
```
Implemente a spec MID-09 (DLQ + Retry + Alerta de resiliência).

Crie:
1. template.yaml — MediaProcessingDLQ (SQS) + AlertTopic (SNS) + DLQAlarm (CloudWatch)
2. src/functions/media/reprocessDLQ/index.mjs — lê DLQ, re-envia para fila principal
3. Rota POST /admin/media/reprocess-dlq no template.yaml

DLQ: retenção 14d. Alarm: threshold ≥1 mensagem, period 5min → SNS email.
Reprocess: ReceiveMessage DLQ → SendMessage fila principal → DeleteMessage DLQ.
Admin-only.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
