# ALB-02: Upload de Fotos via Presigned URL

## Metadados
- **ID:** ALB-02
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Alto
- **Dependência:** ALB-01

## Contexto
O upload de fotos deve ser feito diretamente do navegador para o S3 (sem passar pelo backend/Lambda). Isso evita limite de 6MB do API Gateway e permite upload de RAW/JPEG de alta resolução (até 50MB). O backend apenas gera a presigned URL e registra a foto no DynamoDB.

## Escopo
- `apps/backend/src/handlers/album/getUploadUrl.js` — NOVO
- `apps/frontend/src/pages/admin/AlbumDetalhe.jsx` — botão upload + progress
- `apps/frontend/src/components/album/UploadDropzone.jsx` — NOVO
- API: POST /admin/albuns/:id/upload-url
- S3 bucket: política CORS

## Fora de Escopo (NÃO TOCAR)
- Processamento de versões (ALB-03)
- Albuns.jsx (listagem)
- CloudFront (SPEC-11)

## Spec Técnica

### Fluxo de Upload
```
1. Frontend solicita N presigned URLs (batch)
2. Backend gera URLs (PUT, 15min expiração, max 50MB)
3. Frontend faz PUT direto ao S3 para cada foto
4. Frontend reporta sucesso ao backend (confirma upload)
5. Backend registra FOTO no DynamoDB com status "pendente_processamento"
6. Backend publica mensagem na SQS para processamento
```

### Backend — getUploadUrl
```js
// Input
{
  "album_id": "alb_001",
  "arquivos": [
    { "nome": "DSC_4521.jpg", "tipo": "image/jpeg", "tamanho": 12500000 },
    { "nome": "DSC_4522.jpg", "tipo": "image/jpeg", "tamanho": 11800000 }
  ]
}

// Output
{
  "urls": [
    {
      "foto_id": "foto_001",
      "upload_url": "https://bucket.s3.amazonaws.com/...",
      "s3_key": "t123/alb_001/original/foto_001.jpg",
      "expires_in": 900
    }
  ]
}
```

### Validações
- Tipos aceitos: image/jpeg, image/png, image/tiff, image/webp
- Tamanho máximo: 50MB por arquivo
- Máximo 50 URLs por request (batch)
- Álbum deve existir e pertencer ao tenant
- Verificar espaço de storage disponível

### S3 CORS
```json
{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT"],
    "AllowedOrigins": ["https://app.dominio.com.br"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }]
}
```

### Frontend — UploadDropzone.jsx
- Drag & drop + click para selecionar
- Preview das fotos antes do upload
- Progress bar individual + total
- Retry automático em caso de falha
- Cancelar upload individual
- Limite visual: "Selecionadas X fotos (XXX MB)"
- Upload paralelo: máximo 3 simultâneos

### Estrutura S3
```
{tenant_id}/{album_id}/original/{foto_id}.{ext}
{tenant_id}/{album_id}/media/{foto_id}.jpg
{tenant_id}/{album_id}/thumb/{foto_id}.jpg
```

## Critérios de Aceite
- [ ] Presigned URL gerada com expiração 15min
- [ ] Upload direto ao S3 funciona (sem passar pelo backend)
- [ ] Batch de até 50 URLs por request
- [ ] Validação de tipo e tamanho
- [ ] Progress bar funciona em tempo real
- [ ] Drag & drop + click funcionam
- [ ] Upload paralelo (3 simultâneos)
- [ ] Retry em caso de falha de rede
- [ ] Foto registrada no DynamoDB com status pendente
- [ ] Mensagem publicada na SQS após confirmação

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ALB-02: Upload de Fotos via Presigned URL.

1. Crie handlers/album/getUploadUrl.js: gerar presigned URLs PUT (batch até 50).
2. Crie components/album/UploadDropzone.jsx: drag&drop, preview, progress, retry.
3. Em AlbumDetalhe.jsx: integrar UploadDropzone.
4. S3: configurar CORS para PUT direto.
5. Após confirmação: registrar FOTO no DynamoDB + publicar SQS.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
