# ALB-03: Processamento Assíncrono de 3 Versões

## Metadados
- **ID:** ALB-03
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Alto
- **Dependência:** ALB-02

## Contexto
Após o upload do original ao S3, um job assíncrono (SQS → Lambda) deve gerar 2 versões adicionais: média (web, 2048px) e thumbnail (400px). Isso garante carregamento rápido no lightbox e na grade de miniaturas, sem expor o original antes do pagamento completo.

## Escopo
- `apps/backend/src/handlers/album/processPhoto.js` — NOVO (Lambda triggered by SQS)
- SQS queue: `photo-processing-queue` + DLQ
- S3: gravar versões em paths separados
- DynamoDB: atualizar status da FOTO
- SAM template: Lambda + SQS + IAM

## Fora de Escopo (NÃO TOCAR)
- Upload (ALB-02 — já feito)
- Frontend
- Watermark (ALB-13 — separado)
- CloudFront signed URLs (SPEC-11)

## Spec Técnica

### Trigger
- SQS message publicada após confirmação de upload (ALB-02)
- Payload: `{ tenant_id, album_id, galeria_id, foto_id, s3_key_original }`

### Processamento (sharp)
```js
const sharp = require('sharp')

async function processPhoto(originalKey) {
  const original = await s3.getObject({ Bucket, Key: originalKey })
  
  // Versão média (2048px no lado maior)
  const media = await sharp(original.Body)
    .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()
  
  // Versão thumbnail (400px no lado maior)
  const thumb = await sharp(original.Body)
    .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer()
  
  // Upload das versões
  await Promise.all([
    s3.putObject({ Bucket, Key: mediaKey, Body: media, ContentType: 'image/jpeg' }),
    s3.putObject({ Bucket, Key: thumbKey, Body: thumb, ContentType: 'image/jpeg' })
  ])
}
```

### Configuração Lambda
- Runtime: Node.js 20.x
- Memory: 1024 MB (sharp precisa de memória)
- Timeout: 60s
- Layer: sharp (pré-compilado para Lambda)
- Concurrency: 10 (evitar throttle no S3)

### SQS Config
- Visibility timeout: 120s
- Max receive count: 3 (depois vai para DLQ)
- Batch size: 1 (uma foto por invocação)
- DLQ: `photo-processing-dlq` (retenção 14 dias)

### Status da Foto
| Status | Descrição |
|---|---|
| pendente_processamento | Upload confirmado, aguardando |
| processando | Lambda executando |
| concluido | 3 versões disponíveis |
| erro | Falha (na DLQ) |

### Atualização DynamoDB
Após processamento com sucesso:
- `status_processamento` → "concluido"
- `s3_key_media` → path da versão média
- `s3_key_thumb` → path da thumbnail
- `largura` / `altura` → extraídos dos metadados
- `tamanho_bytes` → do original
- Incrementar `total_fotos` no ALBUM

### Verificação de Conclusão
Quando todas as fotos de um álbum estão "concluido":
- Atualizar status do álbum: "processando" → "pronto"
- (Futuro: notificar admin)

## Critérios de Aceite
- [ ] Lambda triggered por SQS funciona
- [ ] Versão média gerada (2048px, 85% quality)
- [ ] Thumbnail gerada (400px, 75% quality)
- [ ] Ambas salvas no S3 nos paths corretos
- [ ] Status da foto atualizado no DynamoDB
- [ ] DLQ configurada (3 retries)
- [ ] Memory 1024MB / Timeout 60s
- [ ] Concurrency limitada a 10
- [ ] Álbum muda para "pronto" quando todas fotos concluídas
- [ ] Foto em erro não trava o álbum todo

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ALB-03: Processamento Assíncrono de 3 Versões.

1. Crie handlers/album/processPhoto.js: Lambda triggered por SQS.
2. Usar sharp para gerar média (2048px, jpeg 85%) e thumb (400px, jpeg 75%).
3. SQS queue com DLQ (3 retries, visibility 120s).
4. Lambda: 1024MB, 60s timeout, concurrency 10.
5. Atualizar status FOTO no DynamoDB após conclusão.
6. SAM template: Lambda + SQS + DLQ + IAM role.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
