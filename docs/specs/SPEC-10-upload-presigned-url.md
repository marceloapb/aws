# SPEC-10 — Upload via S3 Presigned URL

**ID:** 10  
**TIPO:** Melhoria  
**PRIORIDADE:** P2  
**IMPACTO:** Performance/Custo | **ESFORÇO:** Baixo  

## CONTEXTO

`middlewares/upload.js` usa multer para receber fotos pelo Express. Isso faz o arquivo inteiro trafegar pela Lambda (payload limit 6MB, timeout). Com presigned URL, o client faz upload direto ao S3.

## ESCOPO

- `apps/api/src/middlewares/upload.js` → remover
- `apps/api/src/routes/admin-fotos.js` → endpoint que gera presigned URL
- `apps/api/src/services/s3Service.js` → adicionar método `generateUploadUrl()`

## FORA DE ESCOPO (NÃO TOCAR)

- Download de fotos (SPEC-11)
- Frontend (precisará adaptar, mas é spec separada)
- Outras rotas

## SPEC TÉCNICA

- Endpoint: `POST /admin/fotos/upload-url` → retorna `{ uploadUrl, key }`
- `@aws-sdk/s3-request-presigner` + `PutObjectCommand`
- Presigned URL expira em 15 minutos
- Key pattern: `fotos/{tenantId}/{albumId}/{uuid}.{ext}`
- Content-Type restrito a `image/jpeg`, `image/png`, `image/webp`
- Max size via `Content-Length` condition: 50MB

## CRITÉRIOS DE ACEITE

- Client consegue fazer PUT direto no S3 com a URL retornada
- Lambda não recebe payload de imagem
- Fotos ficam no bucket correto com key organizada

## PROMPT PRONTO PARA O KIRO CLI

```
Substitua upload via multer por S3 presigned URLs.

1. Delete `apps/api/src/middlewares/upload.js`.

2. Em `apps/api/src/services/s3Service.js`, adicione:
   ```js
   const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
   const { PutObjectCommand } = require('@aws-sdk/client-s3');
   const { v4: uuid } = require('uuid');

   async function generateUploadUrl(tenantId, albumId, contentType) {
     const ext = contentType.split('/')[1];
     const key = `fotos/${tenantId}/${albumId}/${uuid()}.${ext}`;
     const command = new PutObjectCommand({
       Bucket: process.env.S3_BUCKET_NAME,
       Key: key,
       ContentType: contentType,
     });
     const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
     return { uploadUrl: url, key };
   }
   ```

3. Em `apps/api/src/routes/admin-fotos.js`, adicione rota:
   ```js
   router.post('/upload-url', adminAuth, async (req, res) => {
     const { albumId, contentType } = req.body;
     const result = await s3Service.generateUploadUrl(req.user.tenantId, albumId, contentType);
     res.json(result);
   });
   ```

4. Em `apps/api/src/app.js`: remova qualquer import/use de `./middlewares/upload`.

5. Adicione `@aws-sdk/s3-request-presigner` e `uuid` ao `package.json`.

Altere SOMENTE: `apps/api/src/middlewares/upload.js` (deletar), `apps/api/src/services/s3Service.js`, `apps/api/src/routes/admin-fotos.js`, `apps/api/src/app.js`, `apps/api/package.json`. Não refatore, renomeie ou mexa em mais nada.
```
