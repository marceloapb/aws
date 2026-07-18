# MID-03 — Processamento Assíncrono (Sharp + SQS)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | MID-03 |
| **Tipo** | Feature |
| **Prioridade** | P0 |
| **Impacto** | Alto — gera as versões otimizadas de cada foto |
| **Esforço** | Alto |

## Contexto
Após upload do original, S3 Event dispara mensagem na SQS. Lambda consumidora processa com Sharp: gera versões (web, thumb) otimizadas em WebP/JPEG. Coloca as versões derivadas nos paths corretos e registra no DynamoDB (MID-04).

## Escopo
- **SQS:** fila `MediaProcessingQueue` (recebe S3 events)
- **Lambda:** `processMedia` — consome SQS, processa imagem, gera versões
- **Sharp:** resize + convert para WebP (fallback JPEG)
- **Versões por contexto:**
  - album: original (mantém) + web (2048px, 85%) + thumb (400px, 70%)
  - portfolio: web (2048px, 85%) + thumb (600px, 70%)
  - novidades: web (1200px, 85%) + thumb (400px, 70%)
  - perfil: thumb (200px, 80%)
- **Layer Lambda:** sharp como Lambda Layer (ou bundled)
- **DynamoDB:** registra mídia processada (invoca MID-04)

## Fora de Escopo (NÃO TOCAR)
- Upload (MID-02)
- Infraestrutura dos buckets (MID-01)
- DLQ e retry (MID-09)
- Vídeo
- Metadados EXIF (futuro P3)

## Spec Técnica

### SQS
```yaml
MediaProcessingQueue:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: mbf-media-processing
    VisibilityTimeout: 300
    MessageRetentionPeriod: 1209600
    RedrivePolicy:
      deadLetterTargetArn: !GetAtt MediaProcessingDLQ.Arn
      maxReceiveCount: 3
```

### Lambda processMedia
- Trigger: SQS (batch size 1, para não estourar memória)
- Memory: 1536MB (Sharp precisa de RAM)
- Timeout: 300s
- Runtime: Node.js 20.x
- Layers: sharp (arm64)

### Lógica
```
1. Recebe mensagem SQS (S3 event: bucket, key)
2. Extrai metadados da key: tenant, contexto, entidade, foto_id
3. Baixa o original do S3
4. Switch por contexto:
   - album: gera web (2048px max-side, quality 85, WebP) + thumb (400px, quality 70, WebP)
   - portfolio: gera web (2048px, 85) + thumb (600px, 70)
   - novidades: gera web (1200px, 85) + thumb (400px, 70)
   - perfil: gera thumb (200px, quality 80, WebP)
5. Upload das versões para o bucket correto:
   - Mesmo path, troca sufixo: -original → -web, -thumb
   - album: versões ficam no bucket privado
   - portfolio/novidades/perfil: versões ficam no bucket público
6. Registra no DynamoDB (entidade Midia): original_key, web_key, thumb_key, size, dimensões, content_type
7. Deleta mensagem da fila (ack)
```

### Chaves de Output
```
Original: 1/album/ev123/01JABC-original.jpg     (private)
Web:      1/album/ev123/01JABC-web.webp          (private)
Thumb:    1/album/ev123/01JABC-thumb.webp         (private)

Original: 1/portfolio/cat01/01JDEF-original.jpg  (upload temp, pode deletar)
Web:      1/portfolio/cat01/01JDEF-web.webp       (public)
Thumb:    1/portfolio/cat01/01JDEF-thumb.webp      (public)
```

### Sharp Config
```javascript
const CONFIGS = {
  album: {
    web:   { width: 2048, height: 2048, fit: 'inside', quality: 85, format: 'webp' },
    thumb: { width: 400,  height: 400,  fit: 'cover',  quality: 70, format: 'webp' }
  },
  portfolio: {
    web:   { width: 2048, height: 2048, fit: 'inside', quality: 85, format: 'webp' },
    thumb: { width: 600,  height: 600,  fit: 'cover',  quality: 70, format: 'webp' }
  },
  novidades: {
    web:   { width: 1200, height: 1200, fit: 'inside', quality: 85, format: 'webp' },
    thumb: { width: 400,  height: 400,  fit: 'cover',  quality: 70, format: 'webp' }
  },
  perfil: {
    thumb: { width: 200,  height: 200,  fit: 'cover',  quality: 80, format: 'webp' }
  }
};
```

## Critérios de Aceite
- Upload de original → versões geradas em <30s (foto de 20MB)
- WebP gerado com qualidade visual aceitável
- Versões no path correto (private ou public conforme contexto)
- DynamoDB atualizado com todas as keys + dimensões
- Foto corrompida → log de erro + mensagem vai pra DLQ após 3 retries
- Lambda não estoura memória com foto de 50MB (1536MB de RAM)

## Prompt Pronto para o Kiro CLI
```
Implemente a spec MID-03 (Processamento Assíncrono de Mídia com Sharp).

Crie:
1. template.yaml — recurso MediaProcessingQueue (SQS) + MediaProcessingDLQ
2. src/functions/media/processMedia/index.mjs — consome SQS, processa com Sharp, gera versões
3. template.yaml — Lambda processMedia (1536MB, 300s, trigger SQS batch 1)
4. Lambda Layer com sharp (arm64) ou bundle no build

Versões: album (web 2048+thumb 400), portfolio (web 2048+thumb 600), novidades (web 1200+thumb 400), perfil (thumb 200).
Formato: WebP. fit: inside para web, cover para thumb.
Output: mesma key trocando sufixo (-original→-web/-thumb). Registra DynamoDB.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
