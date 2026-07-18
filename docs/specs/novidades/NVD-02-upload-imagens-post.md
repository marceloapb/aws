# NVD-02 — Upload de Imagens no Post

**TIPO:** Feature  
**PRIORIDADE:** P1  
**IMPACTO:** Alto — diferencial visual do blog  
**ESFORÇO:** Médio  

## CONTEXTO

O ADM insere imagens no corpo do post (via editor) e define imagem de capa. O fluxo é idêntico ao do portfólio: presigned URL → upload direto S3 → processamento (web+thumb) → URL final no CDN. A diferença: imagens do blog ficam no prefixo `1/novidades/` e o original também é descartado.

## ESCOPO

- `src/functions/novidades/solicitar-upload.js` — handler POST (gera presigned URL)
- `src/functions/novidades/processar-imagem.js` — handler S3 event (gera web + thumb)
- `template.yaml` — 2 Lambdas, 1 rota, trigger S3

## FORA DE ESCOPO (NÃO TOCAR)

- CRUD de posts (NVD-01) — já feito
- Editor frontend (NVD-03)
- Upload do portfólio (PTF-02/03)
- Qualquer outro módulo

## SPEC TÉCNICA

**Fluxo:**
1. `POST /admin/novidades/imagens/upload` com body `{ post_id, filename, content_type, size_bytes, tipo }` (tipo: `corpo` ou `capa`)
2. Handler valida: content_type ∈ [image/jpeg, image/png, image/webp], size ≤ 20MB, post existe.
3. Gera `img_id` (ULID), key = `1/novidades/${post_id}/${img_id}/original/${filename}`.
4. Gera presigned PUT URL (expiração 10min).
5. Retorna `{ upload_url, img_id, key, expires_in: 600 }`.
6. Browser faz PUT no S3.
7. Trigger S3 (`s3:ObjectCreated:*`, prefixo `1/novidades/`) invoca processar-imagem.

**Processamento (Lambda S3 trigger):**
1. GetObject original.
2. Sharp: web (1200px, JPEG q80), thumb (600px, JPEG q75 — thumb maior que portfólio, pois blog usa como preview).
3. PutObject em `1/novidades/{post_id}/{img_id}/web.jpg` e `thumb.jpg`.
4. DeleteObject original.
5. Não grava no DynamoDB — a URL é inserida direto no `corpo_html` pelo editor. Para capa, o frontend faz PUT no post com `capa_url`.

**S3:**
- Mesmo bucket `mbf-media-${Stage}`.
- Prefixo: `1/novidades/{post_id}/{img_id}/`
- Lifecycle: `*/original/*` expira em 24h.

**CloudFront:** já serve `1/novidades/*` via OAC (mesmo path pattern do PTF-06, basta ampliar ou já cobrir `1/*`).

**IAM:**
- solicitar-upload: `s3:PutObject` (prefixo `1/novidades/*`) + `dynamodb:GetItem` (verificar post).
- processar-imagem: `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` (prefixo `1/novidades/*`).

## CRITÉRIOS DE ACEITE

1. Presigned URL funcional para upload direto.
2. Processamento gera web (1200px) e thumb (600px).
3. Original apagado após processamento.
4. Rejeita tipo inválido ou size > 20MB.
5. URLs finais acessíveis via CloudFront.

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente o upload de imagens para posts do blog conforme spec NVD-02. Crie src/functions/novidades/solicitar-upload.js (POST, valida tipo/size/post existe, gera presigned PUT URL, key=1/novidades/{post_id}/{img_id}/original/{filename}) e src/functions/novidades/processar-imagem.js (trigger S3 ObjectCreated prefixo 1/novidades/, sharp resize web 1200px + thumb 600px JPEG, DeleteObject original). No template.yaml: 2 Lambdas arm64 (solicitar: 256MB 10s, processar: 512MB 30s), 1 rota POST com Cognito JWT admin, trigger S3, lifecycle 24h em */original/*, policies IAM mínimas. ALTERE SOMENTE os arquivos listados; não refatore, renomeie ou mexa em mais nada.
```
