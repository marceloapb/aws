# SPEC-21 — Álbum/Entrega: Lógica de Negócio + Pipeline de Imagem

| Campo | Valor |
|-------|-------|
| ID | GAP-08 / SPEC-21 |
| Tipo | Feature |
| Prioridade | P1 |
| Impacto | Alto |
| Esforço | Médio |

## CONTEXTO

§11 do MVP-1 define álbuns pré-gerados, galerias, publicação com trava dos 70%, expiração, e serviço de mídia (3 versões por upload). SPEC-10 (upload presigned) e SPEC-11 (CloudFront signed) do repo aws cobrem upload/leitura mas não a lógica de negócio.

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/functions/album/criar.js` — invocado internamente no aceite do orçamento
- `src/functions/album/listar.js` — GET /admin/albuns
- `src/functions/album/get.js` — GET /admin/albuns/:id (e /client/albuns/:id)
- `src/functions/album/publicar.js` — POST /admin/albuns/:id/publicar
- `src/functions/album/criar-galeria.js` — POST /admin/albuns/:id/galerias
- `src/functions/album/listar-fotos.js` — GET /admin/galerias/:id/fotos
- `src/functions/album/expirar.js` — handler EventBridge (cron diário)
- `src/functions/media/process-image.js` — trigger S3
- `template.yaml` — rotas + S3 trigger + roles + EventBridge rule

## FORA DE ESCOPO (NÃO TOCAR)

- Tema/skin da vitrine (frontend)
- Editor de fotos
- Seleção/favoritos (frontend)
- Nota fiscal (§28)
- Download em massa (futuro)
- Qualquer arquivo não listado

## SPEC TÉCNICA

### Modelo DynamoDB

```
Álbum:    PK=TENANT#1, SK=ALBUM#<ulid>
Galeria:  PK=TENANT#1, SK=GALERIA#<album_id>#<ordem>
Foto:     PK=TENANT#1, SK=FOTO#<galeria_id>#<ordem>
```

Campos Álbum: id, orcamento_id, cliente_id, titulo, data_evento, status (rascunho|publicado|expirado), publicado_em, expira_em, created_at

Campos Galeria: id, album_id, nome, ordem, qtd_fotos, created_at

Campos Foto: id, galeria_id, ordem, s3_key_original, s3_key_thumb, s3_key_media, processado (bool), created_at

### Fluxos

**Pré-geração (interno — no aceite do orçamento):**
- Cria álbum status=`rascunho`
- titulo = nome_evento do orçamento
- data_evento = data do orçamento
- cliente_id = do orçamento

**Publicar (admin):**
- Valida: chama GET /internal/orcamentos/:id/percentual-pago
- Se < 70% → 403 `{ error: "Pagamento insuficiente", percentual_atual: X, minimo: 70 }`
- Se >= 70% → status=`publicado`, publicado_em=now, expira_em=now + config.prazos.album_expiracao_dias

**Expirar (EventBridge cron diário):**
- Query: status=`publicado` AND expira_em < now
- Para cada: status → `expirado`

**Process-image (S3 trigger):**
- Trigger: ObjectCreated no bucket de upload, prefix `uploads/{tenant}/`
- Input: imagem original
- Gera com Sharp:
  - thumb: 200px largura, quality 70
  - media: 1200px largura, quality 85
  - original: mantém
- Output paths: `processed/{tenant}/{album_id}/thumb/`, `processed/{tenant}/{album_id}/media/`
- Atualiza item FOTO no DynamoDB: s3_key_thumb, s3_key_media, processado=true

**Cancelar orçamento → cascade:**
- Se álbum status=`rascunho` → deleta álbum + galerias + fotos (batch)

### IAM

Role `AlbumFunctionRole`:
- DynamoDB: PutItem, GetItem, UpdateItem, DeleteItem, Query, BatchWriteItem
- Lambda: InvokeFunction (para chamar get-percentual)

Role `MediaProcessRole`:
- S3: GetObject em `uploads/*`, PutObject em `processed/*`
- DynamoDB: UpdateItem na tabela principal

## CRITÉRIOS DE ACEITE

1. Álbum pré-gerado automaticamente no aceite do orçamento
2. Publicar bloqueado se percentual < 70%
3. Publicar libera se >= 70%
4. Expiração automática funciona
5. Upload gera 3 versões (thumb, media, original)
6. Cancelar orçamento apaga álbum em rascunho

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar módulo Álbum/Entrega conforme spec SPEC-21.
Handlers em src/functions/album/, trigger de processamento de imagem
com Sharp em src/functions/media/process-image.js, trava dos 70%,
pré-geração no aceite, expiração via EventBridge.

Alterar SOMENTE:
- template.yaml (rotas, S3 trigger, roles, EventBridge rule)
- src/functions/album/*.js (7 handlers)
- src/functions/media/process-image.js

NÃO refatorar, renomear ou mexer em mais nada.
```
