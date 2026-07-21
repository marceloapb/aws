# SPEC MD-03 — GET /clients/me/avatar-url (Presigned Upload)

**ID:** MD-03
**TIPO:** Feature
**TÍTULO:** Geração de presigned URL para upload de avatar
**PRIORIDADE:** P1
**IMPACTO:** Alto — foto de perfil do cliente
**ESFORÇO:** Médio — presigned URL + CORS + CDN

## CONTEXTO

O cliente clica no ícone de câmera, seleciona uma imagem, e o frontend faz upload direto ao S3 via presigned PUT URL. Isso evita o limite de 10 MB do API Gateway e reduz custo/latência da Lambda.

## ESCOPO

- `src/functions/clients/me-avatar-url/index.mjs` (NOVO)
- `infra/cloudformation.yml` (Lambda + rota + bucket policy se necessário)

## FORA DE ESCOPO (NÃO TOCAR)

- Bucket S3 de fotos/galerias existente
- Handlers de clients existentes
- CloudFront distribution (já deve existir; apenas confirmar que serve `/avatars/`)

## SPEC TÉCNICA

**Lambda:** `ClientMeAvatarUrlFunction`
**Rota:** `GET /clients/me/avatar-url?contentType=image/webp`
**Authorizer:** Cognito JWT

**Fluxo completo:**

```
Cliente → GET /clients/me/avatar-url?contentType=image/jpeg
       ← 200 { uploadUrl, key, cdnUrl }
Cliente → PUT <uploadUrl> (binary, Content-Type header)
       ← 200 OK (S3)
Cliente → PATCH /clients/me { avatarKey: "<key>" }
       ← 200 (perfil atualizado)
```

**Lógica da Lambda:**
1. Extrair `sub` do JWT
2. Validar `contentType` query param (whitelist: `image/jpeg`, `image/png`, `image/webp`)
3. Gerar key: `avatars/${sub}/${Date.now()}.${ext}`
4. Gerar presigned PUT URL com:
   - `expiresIn: 120` (2 minutos)
   - `Content-Type` fixo
   - `Content-Length-Range: [1, 5242880]` (max 5 MB)
   - Metadata: `{ "client-id": sub }`
5. Retornar:

```json
{
  "uploadUrl": "https://mbf-assets.s3.amazonaws.com/avatars/...",
  "key": "avatars/<sub>/1721000000.webp",
  "cdnUrl": "https://cdn.mbfsystems.com/avatars/<sub>/1721000000.webp"
}
```

**S3 Bucket:** `mbf-assets` (ou bucket existente)
- Prefixo: `avatars/`
- Lifecycle rule: versões antigas expiram em 7 dias (manter só o avatar atual)

**IAM Role:** `ClientMeAvatarUrlRole`
- `s3:PutObject` em `arn:aws:s3:::mbf-assets/avatars/*`
- NÃO dar s3:GetObject (CloudFront OAC serve leitura)

**Env Vars:**
- `ASSETS_BUCKET`: nome do bucket
- `CDN_DOMAIN`: domínio CloudFront

**CORS no bucket:**

```json
{
  "AllowedOrigins": ["https://app.mbfsystems.com"],
  "AllowedMethods": ["PUT"],
  "AllowedHeaders": ["Content-Type", "Content-Length"],
  "MaxAgeSeconds": 3600
}
```

## CRITÉRIOS DE ACEITE

- [ ] Retorna presigned URL válida para content types permitidos
- [ ] Rejeita content types não-imagem com 400
- [ ] Upload > 5 MB é rejeitado pelo S3 (condition)
- [ ] Key usa `sub` do cliente (isolamento)
- [ ] URL expira em 2 min
- [ ] Após upload + PATCH /clients/me, avatar aparece via CDN

## PROMPT PRONTO PARA O KIRO CLI

```
Crie src/functions/clients/me-avatar-url/index.mjs que implementa GET /clients/me/avatar-url.
Extraia sub do JWT. Leia query param contentType e valide contra whitelist (image/jpeg, image/png, image/webp).
Gere presigned PUT URL via @aws-sdk/s3-request-presigner com: bucket do env ASSETS_BUCKET, key avatars/{sub}/{timestamp}.{ext}, expiresIn 120, ContentType fixo, content-length-range [1, 5242880].
Retorne 200 com { uploadUrl, key, cdnUrl } onde cdnUrl usa env CDN_DOMAIN.
Adicione no cloudformation.yml: Lambda ClientMeAvatarUrlFunction, role com s3:PutObject em arn:aws:s3:::{bucket}/avatars/*, env vars ASSETS_BUCKET e CDN_DOMAIN, rota GET /clients/me/avatar-url com Cognito authorizer.
Se CORS do bucket não estiver configurado, adicione CorsConfiguration para PUT de https://app.mbfsystems.com.
Altere SOMENTE: src/functions/clients/me-avatar-url/index.mjs (novo) e infra/cloudformation.yml. Não refatore, renomeie ou mexa em mais nada.
```
