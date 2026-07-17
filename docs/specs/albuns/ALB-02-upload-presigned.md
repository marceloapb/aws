# ALB-02: Upload de Fotos via Presigned URL

## Metadados
- **ID:** ALB-02
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Alto
- **Dependência:** ALB-01

## Contexto
O upload de fotos deve ir direto do navegador para o S3 (sem passar pela Lambda/API Gateway). O backend gera presigned URLs e o frontend faz PUT direto. Isso evita limites de payload e reduz custo.

## Escopo
- `apps/backend/src/handlers/album/getPresignedUrl.js` — NOVO
- `apps/frontend/src/pages/admin/AlbumDetalhe.jsx` — integrar upload
- `apps/frontend/src/components/album/UploadFotos.jsx` — NOVO
- API: POST /admin/albuns/:id/upload-urls
- S3: bucket privado, path: `{tenant_id}/albuns/{album_id}/original/`

## Fora de Escopo (NÃO TOCAR)
- Processamento de versões (ALB-03)
- Albuns.jsx (listagem)
- Outros módulos

## Spec Técnica

### Fluxo de Upload
```
1. Frontend seleciona N arquivos (drag & drop ou file picker)
2. Frontend chama POST /admin/albuns/:id/upload-urls com lista de filenames
3. Backend gera presigned PUT URLs (1 por arquivo, expira 15min)
4. Frontend faz PUT direto ao S3 para cada arquivo (paralelo, max 3 simultâneos)
5. Frontend reporta progresso individual e total
6. Ao completar cada upload, frontend chama POST /admin/albuns/:id/fotos/confirm
7. Backend registra a FOTO no DynamoDB com status_processamento: 'pendente'
8. Backend envia mensagem SQS para processamento (ALB-03)
```

### Backend — getPresignedUrl
```js
// Input
{ files: [{ filename: "IMG_001.jpg", content_type: "image/jpeg", size_bytes: 8500000 }] }

// Validações
- Max 50 arquivos por request
- Max 30MB por arquivo
- Content-type: image/jpeg, image/png, image/webp, image/tiff
- Total storage do tenant não excede plano

// Output
{ urls: [{ filename, foto_id, presigned_url, expires_in: 900 }] }
```

### Frontend — UploadFotos.jsx
- Drag & drop zone com preview de thumbnails
- File picker como fallback
- Barra de progresso individual por foto
- Barra de progresso total
- Max 3 uploads paralelos (queue)
- Retry automático 1x em falha
- Cancelar upload individual
- Resumo: X de Y enviadas, Z falhas
- Validação client-side: tipo, tamanho

### Bucket S3
- Path: `{tenant_id}/albuns/{album_id}/original/{foto_id}.{ext}`
- Lifecycle: nenhuma (original é preservado)
- Encryption: SSE-S3
- Block public access: ON
- CORS: permitir PUT do domínio do app

### IAM
- Lambda: s3:PutObject apenas no path do tenant
- Presigned URL: condição de content-type e max-size

## Critérios de Aceite
- [ ] Presigned URL gerada corretamente
- [ ] Upload direto ao S3 funciona (sem proxy)
- [ ] Drag & drop funciona
- [ ] Progresso individual e total
- [ ] Max 3 paralelos
- [ ] Validação de tipo e tamanho (client + server)
- [ ] Foto registrada no DynamoDB após confirm
- [ ] Mensagem SQS enviada para processamento
- [ ] Retry automático em falha
- [ ] Cancelar upload funciona

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ALB-02: Upload de Fotos via Presigned URL.

1. Crie handlers/album/getPresignedUrl.js: gerar presigned PUT URLs (max 50, 15min, validar tipo/tamanho).
2. Crie handlers/album/confirmUpload.js: registrar FOTO no DynamoDB, enviar SQS.
3. Crie components/album/UploadFotos.jsx: drag & drop, progress bars, max 3 paralelos, retry.
4. Em AlbumDetalhe.jsx: integrar UploadFotos.
5. S3 CORS: permitir PUT do domínio.
6. SAM: rota POST /admin/albuns/{id}/upload-urls e POST /admin/albuns/{id}/fotos/confirm.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
