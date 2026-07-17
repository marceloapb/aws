# ALB-03: Processamento Assíncrono de 3 Versões

## Metadados
- **ID:** ALB-03
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Alto
- **Dependência:** ALB-02

## Contexto
Após upload do original, um job assíncrono (SQS → Lambda) deve gerar 3 versões: original preservado, média (web 2048px), thumb (400px). Isso permite entrega rápida de thumbnails e economia de banda.

## Escopo
- `apps/backend/src/handlers/album/processarFoto.js` — NOVO (Lambda triggered by SQS)
- SQS: fila `foto-processamento` + DLQ
- S3: paths `media/` e `thumb/` ao lado do `original/`
- DynamoDB: atualizar status_processamento e URLs na FOTO

## Fora de Escopo (NÃO TOCAR)
- Upload (ALB-02 — já feito)
- Frontend (thumbnails carregam via URL do DynamoDB)
- Watermark (ALB-13 — separado)

## Spec Técnica

### Versões Geradas
| Versão | Max Width | Qualidade | Path S3 | Uso |
|---|---|---|---|---|
| original | — (preservado) | 100% | `/original/{id}.jpg` | Download final |
| media | 2048px | 85% | `/media/{id}.jpg` | Visualização web/lightbox |
| thumb | 400px | 75% | `/thumb/{id}.jpg` | Grade/listagem |

### Fluxo
```
1. SQS recebe mensagem: { tenant_id, album_id, galeria_id, foto_id, s3_key_original }
2. Lambda:
   a. Baixa original do S3
   b. Lê metadados (width, height, EXIF)
   c. Gera versão média (resize 2048px, JPEG 85%)
   d. Gera versão thumb (resize 400px, JPEG 75%)
   e. Upload média e thumb ao S3
   f. Atualiza FOTO no DynamoDB: url_media, url_thumb, width, height, status_processamento: 'completo'
3. Se falha → retry (3x) → DLQ
```

### Lambda — processarFoto
- Runtime: Node.js 20
- Memory: 1024MB (processamento de imagem)
- Timeout: 60s
- Layer: sharp (via Lambda Layer)
- Concurrency: 10 (evitar throttle de S3)

### Resize com Sharp
```js
const sharp = require('sharp')

async function gerarVersoes(buffer) {
  const media = await sharp(buffer)
    .resize({ width: 2048, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()

  const thumb = await sharp(buffer)
    .resize({ width: 400, withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer()

  return { media, thumb }
}
```

### SQS
- Fila: `foto-processamento`
- Visibility timeout: 120s
- Max receive count: 3
- DLQ: `foto-processamento-dlq` (retention 14 days)
- Batch size: 1 (1 foto por invocação)

### SAM
```yaml
FotoProcessamentoQueue:
  Type: AWS::SQS::Queue
  Properties:
    VisibilityTimeout: 120
    RedrivePolicy:
      deadLetterTargetArn: !GetAtt FotoProcessamentoDLQ.Arn
      maxReceiveCount: 3

ProcessarFotoFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: src/handlers/album/processarFoto.handler
    MemorySize: 1024
    Timeout: 60
    Events:
      SQSEvent:
        Type: SQS
        Properties:
          Queue: !GetAtt FotoProcessamentoQueue.Arn
          BatchSize: 1
```

## Critérios de Aceite
- [ ] Versão média gerada (2048px, 85%)
- [ ] Versão thumb gerada (400px, 75%)
- [ ] Ambas salvas no S3 nos paths corretos
- [ ] DynamoDB atualizado com URLs e status 'completo'
- [ ] Width/height extraídos do original
- [ ] Retry 3x antes de DLQ
- [ ] DLQ retém mensagens por 14 dias
- [ ] Lambda com 1024MB e timeout 60s
- [ ] Sharp via Lambda Layer
- [ ] Concurrency reservada: 10

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ALB-03: Processamento Assíncrono de 3 Versões.

1. Crie handlers/album/processarFoto.js: recebe SQS, baixa original, gera média (2048px) e thumb (400px) com sharp, upload S3, atualiza DynamoDB.
2. Lambda Layer com sharp.
3. SQS fila foto-processamento + DLQ.
4. SAM: Queue, DLQ, Function com SQS event source.
5. Memory 1024MB, timeout 60s, batch 1, reserved concurrency 10.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
