# ALB-01: Modelo de Dados DynamoDB (ALBUM, GALERIA, FOTO)

## Metadados
- **ID:** ALB-01
- **Tipo:** Correção
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Médio
- **Dependência:** Nenhuma

## Contexto
O módulo Álbuns precisa de um modelo single-table design no DynamoDB para suportar: álbuns com N galerias, galerias com N fotos, metadados de acesso, e queries eficientes por cliente, status e data.

## Escopo
- `apps/backend/src/models/album.js` — NOVO
- DynamoDB: entidades ALBUM, GALERIA, FOTO
- Backend: Lambda CRUD álbuns/galerias/fotos
- SAM: recursos DynamoDB (GSIs)

## Fora de Escopo (NÃO TOCAR)
- Frontend (Albuns.jsx, AlbumDetalhe.jsx)
- Upload de arquivos (ALB-02)
- Processamento de imagens (ALB-03)

## Spec Técnica

### Entidade ALBUM
```json
{
  "PK": "TENANT#t123",
  "SK": "ALBUM#alb_001",
  "GSI1PK": "TENANT#t123",
  "GSI1SK": "ALBUM#STATUS#rascunho#2026-07-17",
  "GSI2PK": "CLIENTE#cli_001",
  "GSI2SK": "ALBUM#2026-07-17",
  "id": "alb_001",
  "titulo": "Casamento Ana & João",
  "cliente_id": "cli_001",
  "orcamento_id": "orc_001",
  "data_evento": "2026-06-15",
  "status": "rascunho",
  "slug": "casamento-ana-joao-2026",
  "disponivel_em": null,
  "expira_em": null,
  "permite_download": true,
  "permite_selecao": true,
  "permite_comentarios": false,
  "cota_selecao": 50,
  "capa_foto_id": null,
  "total_fotos": 0,
  "total_galerias": 0,
  "percentual_pago": 0,
  "created_at": "2026-07-17T10:00:00Z",
  "updated_at": "2026-07-17T10:00:00Z"
}
```

### Status do Álbum
| Status | Descrição |
|---|---|
| rascunho | Criado, fotos sendo organizadas |
| pronto | Fotos organizadas, aguardando publicação |
| publicado | Disponível para o cliente |
| expirado | Prazo esgotado, acesso bloqueado |
| arquivado | Admin arquivou manualmente |

### Entidade GALERIA
```json
{
  "PK": "TENANT#t123",
  "SK": "GALERIA#alb_001#gal_001",
  "id": "gal_001",
  "album_id": "alb_001",
  "nome": "Making Of",
  "ordem": 1,
  "total_fotos": 0,
  "created_at": "2026-07-17T10:00:00Z"
}
```

### Entidade FOTO
```json
{
  "PK": "TENANT#t123",
  "SK": "FOTO#alb_001#gal_001#foto_001",
  "id": "foto_001",
  "album_id": "alb_001",
  "galeria_id": "gal_001",
  "url_original": "s3://bucket/t123/albuns/alb_001/original/foto_001.jpg",
  "url_media": "s3://bucket/t123/albuns/alb_001/media/foto_001.jpg",
  "url_thumb": "s3://bucket/t123/albuns/alb_001/thumb/foto_001.jpg",
  "filename": "IMG_2345.jpg",
  "size_bytes": 8500000,
  "width": 6000,
  "height": 4000,
  "ordem": 1,
  "favoritada": false,
  "selecionada": false,
  "status_processamento": "completo",
  "created_at": "2026-07-17T10:00:00Z"
}
```

### GSIs
| GSI | PK | SK | Uso |
|---|---|---|---|
| GSI1 | TENANT#id | ALBUM#STATUS#status#date | Listar álbuns por status |
| GSI2 | CLIENTE#id | ALBUM#date | Álbuns por cliente |

### API
- POST /admin/albuns — criar álbum
- GET /admin/albuns — listar (com filtros)
- GET /admin/albuns/:id — detalhe
- PUT /admin/albuns/:id — atualizar
- DELETE /admin/albuns/:id — soft delete

## Critérios de Aceite
- [ ] Entidades ALBUM, GALERIA, FOTO no DynamoDB
- [ ] Single-table design com PK/SK corretos
- [ ] GSIs funcionais para queries por status e cliente
- [ ] CRUD completo com validação
- [ ] Status machine (rascunho → pronto → publicado → expirado/arquivado)
- [ ] Soft delete (não apaga fotos do S3)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ALB-01: Modelo de Dados DynamoDB para Álbuns.

1. Crie apps/backend/src/models/album.js com as entidades ALBUM, GALERIA, FOTO.
2. Single-table design: PK=TENANT#id, SK=ALBUM#id / GALERIA#album#id / FOTO#album#galeria#id.
3. GSI1 (status), GSI2 (cliente).
4. CRUD Lambda: createAlbum, getAlbum, listAlbuns, updateAlbum, deleteAlbum.
5. Status machine com transições válidas.
6. SAM template: declarar GSIs.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
