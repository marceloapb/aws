# PTF-03 — Processamento Assíncrono de Imagem (Lambda gera web + thumb)

**TIPO:** Feature  
**PRIORIDADE:** P1  
**IMPACTO:** Alto — sem thumbnails a grade não performa  
**ESFORÇO:** Médio  

## CONTEXTO

Quando uma foto é carregada no S3 (prefixo `*/portfolio/*/original/`), uma Lambda é invocada via evento S3 para gerar duas versões: **web** (1200px lado maior) e **thumb** (400px lado maior). Após gerar, atualiza o registro no DynamoDB com as URLs e apaga o original (portfólio não persiste alta resolução).

## ESCOPO

- `src/functions/portfolio/fotos/processar-imagem.js` — handler S3 event
- `template.yaml` — Lambda + trigger S3 + policy
- Layer `sharp` (ou incluir sharp como dependency no package.json da função)

## FORA DE ESCOPO (NÃO TOCAR)

- Upload (PTF-02) — já feito
- CRUD de fotos no DynamoDB (PTF-04) — só o status muda aqui
- Álbum de entrega (processamento diferente)
- Qualquer outro módulo

## SPEC TÉCNICA

**Trigger:** S3 Event `s3:ObjectCreated:*` no bucket `mbf-media-${Stage}`, filtro de prefixo `1/portfolio/` e sufixo vazio (pega tudo).

**Lógica:**
1. Extrai `tenant_id`, `categoria_id`, `foto_id` da key.
2. Faz GetObject do original.
3. Usa `sharp` para redimensionar:
   - **web:** resize lado maior 1200px, qualidade 80, format JPEG.
   - **thumb:** resize lado maior 400px, qualidade 75, format JPEG.
4. PutObject em `1/portfolio/{cat_id}/{foto_id}/web.jpg` e `1/portfolio/{cat_id}/{foto_id}/thumb.jpg`.
5. UpdateItem no DynamoDB: `url_web`, `url_thumb` (paths relativos), `status = "pronta"`.
6. DeleteObject do original (economiza storage).

**Em caso de erro:**
- Retry automático (SQS DLQ com 3 retries, backoff).
- Se falhar 3x, `status = "erro"` no DynamoDB. ADM vê no painel.

**Lambda config:** arm64, 512MB (sharp precisa de memória), timeout 30s, layer sharp-arm64.

**IAM:**
- `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` — restrito ao bucket/prefixo `1/portfolio/*`.
- `dynamodb:UpdateItem` — tabela MbfTable, condição no PK/SK.

**Outputs (CloudFront):**
- As URLs `web.jpg` e `thumb.jpg` serão servidas via CloudFront (PTF-06). Aqui só gravamos o path relativo.

## CRITÉRIOS DE ACEITE

1. Upload de JPEG/PNG/WebP gera web (≤1200px) e thumb (≤400px) em ≤5s para imagem de 10MB.
2. Original é apagado após processamento com sucesso.
3. Status no DynamoDB muda para `pronta` com URLs preenchidas.
4. Falha 3x → status `erro`, item na DLQ.
5. Não gera original em alta (diferença-chave do álbum).

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente o processamento assíncrono de imagens do portfólio conforme spec PTF-03. Crie src/functions/portfolio/fotos/processar-imagem.js. Trigger: evento S3 ObjectCreated no bucket mbf-media-${Stage} prefixo 1/portfolio/. Lógica: GetObject, sharp resize para web (1200px, JPEG q80) e thumb (400px, JPEG q75), PutObject em {prefix}/web.jpg e thumb.jpg, UpdateItem DynamoDB (url_web, url_thumb, status=pronta), DeleteObject do original. Config: arm64, 512MB, 30s. DLQ com SQS (3 retries). Em falha definitiva, status=erro. No template.yaml: Lambda com evento S3, SQS DLQ, policy IAM mínima (s3:Get/Put/Delete no prefixo, dynamodb:UpdateItem na tabela). ALTERE SOMENTE os arquivos listados; não refatore, renomeie ou mexa em mais nada.
```
