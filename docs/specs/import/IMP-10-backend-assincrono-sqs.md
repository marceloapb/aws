# IMP-10: Backend Assíncrono (SQS + Lambda) para CSVs Grandes

## Metadados
- **ID:** IMP-10
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Alto
- **Esforço:** Alto
- **Dependência:** IMP-06, IMP-09

## Contexto
Importações grandes (500+ registros) podem exceder o timeout da Lambda (29s via API Gateway). Solução: upload do CSV processado para S3, disparo via SQS, Lambda de processamento assíncrono sem limite de tempo.

## Escopo
- `apps/frontend/src/pages/admin/ImportCSV.jsx` — upload para S3 + trigger
- API: `POST /admin/import/async` — NOVO
- Lambda: `startAsyncImport` — NOVO (enfileira no SQS)
- Lambda: `processAsyncImport` — NOVO (consumer SQS)
- SQS: `import-queue` — NOVO
- S3: bucket existente, prefix `imports/`
- DynamoDB: IMPORT_LOG (já existe de IMP-07)
- SAM: template.yaml atualizado

## Fora de Escopo (NÃO TOCAR)
- Importação síncrona para CSVs pequenos (<100 registros) — mantém como está
- Validação frontend (IMP-03)
- UI de progresso (IMP-09, já cobre polling)

## Spec Técnica

### Decisão Sync vs Async
```js
// Frontend decide:
if (validRows.length <= 100) {
  // Síncrono: POST /admin/import/batch (IMP-06)
} else {
  // Assíncrono: Upload S3 + POST /admin/import/async
}
```

### Fluxo Assíncrono
1. Frontend faz upload do CSV processado (só válidos, já mapeados) para S3:
   - Key: `imports/{tenant_id}/{timestamp}_{entidade}.json`
   - Conteúdo: JSON com rows válidas + metadata
2. Frontend chama POST /admin/import/async com { s3_key, entidade, total_rows }
3. Lambda startAsyncImport:
   - Cria IMPORT_LOG com status=processing
   - Envia mensagem para SQS: { job_id, s3_key, entidade, tenant_id }
   - Retorna { job_id } para o frontend
4. Lambda processAsyncImport (triggered by SQS):
   - Lê JSON do S3
   - Processa em batches de 25
   - Atualiza IMPORT_LOG a cada batch
   - Ao final: status=completed, deleta arquivo do S3
5. Frontend usa polling (IMP-09) para acompanhar

### API
| Método | Path | Body | Response |
|---|---|---|---|
| POST | /admin/import/async | { s3_key, entidade, total_rows } | { job_id } |

### SQS — import-queue
- Tipo: Standard (não FIFO, ordem não importa)
- Visibility timeout: 900s (15 min)
- DLQ: import-dlq (após 3 tentativas)
- Concurrency: 1 (evitar throttle do DynamoDB)

### Lambda — processAsyncImport
- Timeout: 900s (15 min)
- Memory: 512MB
- Triggered by: SQS import-queue
- Batch size: 1 mensagem por vez
- Idempotência: verificar se job_id já foi processado antes de iniciar

### SAM (template.yaml)
```yaml
ImportQueue:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: !Sub ${AWS::StackName}-import-queue
    VisibilityTimeout: 900
    RedrivePolicy:
      deadLetterTargetArn: !GetAtt ImportDLQ.Arn
      maxReceiveCount: 3

ImportDLQ:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: !Sub ${AWS::StackName}-import-dlq
    MessageRetentionPeriod: 1209600  # 14 dias

ProcessAsyncImportFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: handlers/processAsyncImport.handler
    Timeout: 900
    MemorySize: 512
    Events:
      SQSEvent:
        Type: SQS
        Properties:
          Queue: !GetAtt ImportQueue.Arn
          BatchSize: 1
```

### IAM
- startAsyncImport-role: sqs:SendMessage, dynamodb:PutItem
- processAsyncImport-role: s3:GetObject, s3:DeleteObject, dynamodb:BatchWriteItem, dynamodb:UpdateItem, sqs:ReceiveMessage

### Upload para S3 (frontend)
```js
// Gerar presigned URL via API
const { upload_url, s3_key } = await api.post('/admin/import/presign', { entidade, filename })
// Upload direto para S3
await fetch(upload_url, { method: 'PUT', body: JSON.stringify(processedData) })
// Iniciar importação async
const { job_id } = await api.post('/admin/import/async', { s3_key, entidade, total_rows })
```

## Critérios de Aceite
- [ ] CSVs com >100 registros usam fluxo assíncrono
- [ ] Upload para S3 funciona via presigned URL
- [ ] Mensagem enviada ao SQS com dados corretos
- [ ] Lambda processAsyncImport processa em batches de 25
- [ ] IMPORT_LOG atualizado a cada batch (polling funciona)
- [ ] Após conclusão: arquivo deletado do S3
- [ ] DLQ recebe mensagens após 3 falhas
- [ ] Idempotência: reprocessar mensagem não duplica dados
- [ ] CSVs com <=100 registros continuam no fluxo síncrono
- [ ] Timeout de 15min suporta até ~10.000 registros

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IMP-10: Backend Assíncrono (SQS + Lambda).

1. SAM template.yaml:
   - Adicionar ImportQueue (SQS Standard, visibility 900s)
   - Adicionar ImportDLQ (retenção 14 dias)
   - Adicionar ProcessAsyncImportFunction (timeout 900, memory 512, trigger SQS)
   - Adicionar StartAsyncImportFunction

2. Lambda startAsyncImport:
   - POST /admin/import/async
   - Cria IMPORT_LOG status=processing
   - SendMessage ao SQS com { job_id, s3_key, entidade, tenant_id }
   - Retorna { job_id }

3. Lambda processAsyncImport (SQS consumer):
   - Lê JSON do S3 (s3_key da mensagem)
   - Processa em batches de 25 via BatchWriteItem
   - Atualiza IMPORT_LOG a cada batch (processed count)
   - Ao final: UpdateItem status=completed, DeleteObject S3
   - Check idempotência por job_id

4. Frontend (ImportCSV.jsx):
   - Se validRows > 100: upload JSON para S3 via presigned URL + POST /async
   - Se <= 100: manter POST /batch síncrono

5. IAM com privilégio mínimo para cada Lambda.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
