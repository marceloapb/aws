# PTF-02 — Upload de Fotos do Portfólio (Presigned URL + S3)

**TIPO:** Feature  
**PRIORIDADE:** P1  
**IMPACTO:** Alto — é o core visual  
**ESFORÇO:** Médio  

## CONTEXTO

O ADM faz upload de fotos para uma categoria do portfólio. O upload vai direto do browser para o S3 via presigned URL (sem passar pelo servidor). Fluxo: ADM solicita URL → backend valida (tipo, tamanho, categoria existe) → devolve presigned URL + metadata → browser faz PUT no S3. Ao completar, o registro da foto é gravado no DynamoDB com status `processando`. O processamento (gerar web+thumb) é assíncrono (PTF-03).

## ESCOPO

- `src/functions/portfolio/fotos/solicitar-upload.js` — handler POST (gera presigned URL)
- `src/functions/portfolio/fotos/confirmar-upload.js` — handler POST (grava registro no DDB após upload)
- `template.yaml` — 2 Lambdas, 2 rotas, policy para s3:PutObject no bucket de mídia
- Bucket S3 `mbf-media-${Stage}` (se não existir, criar no SAM)

## FORA DE ESCOPO (NÃO TOCAR)

- Processamento de imagem (PTF-03)
- CRUD de fotos completo (PTF-04)
- Qualquer outro módulo

## SPEC TÉCNICA

**Fluxo:**
1. `POST /admin/portfolio/fotos/upload` com body `{ categoria_id, filename, content_type, size_bytes }`
2. Handler valida: categoria existe, content_type ∈ [image/jpeg, image/png, image/webp], size ≤ 50MB.
3. Gera `foto_id` (ULID), key = `1/portfolio/${categoria_id}/${foto_id}/original/${filename}`.
4. Gera presigned PUT URL (expiração 10min) com condições de content-type e content-length.
5. Retorna `{ upload_url, foto_id, key, expires_in: 600 }`.
6. Browser faz PUT no S3.
7. Frontend chama `POST /admin/portfolio/fotos/confirmar` com `{ foto_id, categoria_id }`.
8. Handler confirma objeto existe no S3 (HeadObject), grava item no DynamoDB com `status: "processando"`.

**DynamoDB:**
- PK: `TENANT#1`
- SK: `FOTOPORT#<categoria_id>#<ordem_zero_padded>#<foto_id>`
- Atributos: `id`, `categoria_id`, `s3_key_original`, `url_web` (null), `url_thumb` (null), `ordem`, `status` (processando|pronta|erro), `created_at`

**S3:**
- Bucket: `mbf-media-${Stage}` (privado, BucketPolicy deny public).
- Prefixo: `1/portfolio/{categoria_id}/{foto_id}/original/`
- Lifecycle: objetos em `original/` expiram em 24h (após processamento, o original é desnecessário — portfólio não guarda alta).

**IAM por Lambda:**
- solicitar-upload: `s3:PutObject` restrito ao prefixo `1/portfolio/*` do bucket + `dynamodb:Query` (verificar categoria).
- confirmar-upload: `s3:HeadObject` + `dynamodb:PutItem`.

## CRITÉRIOS DE ACEITE

1. Presigned URL funcional (testável com curl PUT).
2. Rejeita content_type inválido ou size > 50MB com 400.
3. Rejeita categoria_id inexistente com 404.
4. Confirmar grava item com status `processando`.
5. S3 lifecycle de 24h no prefixo original/.

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente o upload de fotos de portfólio via presigned URL conforme spec PTF-02. Crie src/functions/portfolio/fotos/solicitar-upload.js e confirmar-upload.js. O primeiro valida input (categoria existe, tipo imagem, ≤50MB), gera ULID, monta key S3 1/portfolio/{cat_id}/{foto_id}/original/{filename}, gera presigned PUT (10min). O segundo faz HeadObject para confirmar upload e grava no DynamoDB (PK=TENANT#1, SK=FOTOPORT#{cat_id}#{ordem}#{foto_id}, status=processando). Adicione no template.yaml: 2 Lambdas arm64, 2 rotas POST com Cognito JWT admin, policies IAM mínimas, bucket mbf-media-${Stage} com lifecycle 24h em prefix */original/. ALTERE SOMENTE os arquivos listados; não refatore, renomeie ou mexa em mais nada.
```
