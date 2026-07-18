# MID-04 — Registro de Mídia (DynamoDB)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | MID-04 |
| **Tipo** | Feature |
| **Prioridade** | P0 |
| **Impacto** | Alto — metadados necessários para listar/servir |
| **Esforço** | Baixo |

## Contexto
Toda mídia processada é registrada no DynamoDB. Entidade `Midia` com metadados: keys S3, dimensões, tamanho, status, contexto, entidade vinculada. Permite queries por evento, categoria de portfólio, post de novidade, etc.

## Escopo
- **DynamoDB:** entidade `Midia` no single-table design
- **Chamada interna:** processMedia (MID-03) cria o registro após gerar versões
- **Lambda:** `listMedia` — lista mídias por contexto/entidade (usado por outros módulos)
- **Lambda:** `deleteMedia` — soft-delete (marca como deletada, cleanup async)
- **API Gateway:** `GET /admin/media/:contexto/:entidade_id`, `DELETE /admin/media/:id`

## Fora de Escopo (NÃO TOCAR)
- Upload (MID-02)
- Processamento (MID-03)
- Presigned URLs (MID-05)
- Exclusão física do S3 (MID-07 lifecycle)

## Spec Técnica

### DynamoDB Schema
```
PK: TENANT#1
SK: MEDIA#{contexto}#{entidade_id}#{ulid}

Atributos:
{
  media_id: "01JABC",
  tenant_id: "1",
  contexto: "album",
  entidade_id: "ev123",
  original_key: "1/album/ev123/01JABC-original.jpg",
  web_key: "1/album/ev123/01JABC-web.webp",
  thumb_key: "1/album/ev123/01JABC-thumb.webp",
  bucket: "private",
  content_type: "image/jpeg",
  original_size: 15000000,
  web_size: 850000,
  thumb_size: 45000,
  width: 5472,
  height: 3648,
  status: "processed",
  ordem: 1,
  created_at: "2026-07-18T10:00:00Z",
  deleted_at: null
}
```

### GSI para queries
```
GSI-MEDIA-CONTEXTO:
  PK: TENANT#{tenant_id}#MEDIA#{contexto}
  SK: {entidade_id}#{ordem}
  
  → Lista todas as mídias de um contexto/entidade ordenadas
```

### Lambda listMedia
- Auth: JWT admin (ou público dependendo do contexto)
- Query: GSI-MEDIA-CONTEXTO PK=TENANT#1#MEDIA#album, SK begins_with ev123#
- Filtro: status = processed (ignora deleted/error)
- Retorna array com thumb_key, web_key, media_id, ordem

### Lambda deleteMedia
- Auth: JWT admin
- Soft-delete: marca status = deleted, deleted_at = now
- NÃO exclui do S3 imediatamente (lifecycle cuida)
- Retorna 200

## Critérios de Aceite
- Após processamento, registro existe no DynamoDB com todas as keys
- listMedia retorna apenas status=processed
- deleteMedia é soft (não apaga S3)
- Query por contexto+entidade retorna ordenado por campo `ordem`
- Mídia com status error não aparece na listagem

## Prompt Pronto para o Kiro CLI
```
Implemente a spec MID-04 (Registro de Mídia no DynamoDB).

Crie:
1. src/functions/media/listMedia/index.mjs — lista mídias por contexto/entidade (GSI)
2. src/functions/media/deleteMedia/index.mjs — soft-delete (status=deleted)
3. Rotas GET /admin/media/:contexto/:entidade_id e DELETE /admin/media/:id no template.yaml
4. template.yaml — GSI-MEDIA-CONTEXTO na tabela principal

Schema: PK TENANT#1, SK MEDIA#{contexto}#{entidade_id}#{ulid}.
GSI: PK TENANT#1#MEDIA#{contexto}, SK {entidade_id}#{ordem}.
Status: processed | deleted | error. Soft-delete (nunca remove do S3 aqui).

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
