# ALB-01: Modelo de Dados DynamoDB (ALBUM, GALERIA, FOTO)

## Metadados
- **ID:** ALB-01
- **Tipo:** Correção
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Médio
- **Dependência:** Nenhuma

## Contexto
O módulo Álbuns precisa de um modelo de dados robusto em DynamoDB (single-table design) que suporte: álbuns com N galerias, galerias com N fotos, metadados de cada foto (3 versões), status de seleção, e queries eficientes (listar álbuns de um cliente, fotos de uma galeria, etc.).

## Escopo
- `apps/backend/src/models/album.js` — NOVO
- `apps/backend/src/handlers/album/` — NOVO (diretório)
- DynamoDB: entidades ALBUM, GALERIA, FOTO
- SAM template: adicionar recursos

## Fora de Escopo (NÃO TOCAR)
- Frontend (Albuns.jsx, AlbumDetalhe.jsx)
- S3 / CloudFront (ALB-02/03)
- Pagamentos

## Spec Técnica

### Entidade ALBUM
```json
{
  "PK": "TENANT#t123",
  "SK": "ALBUM#alb_001",
  "GSI1PK": "TENANT#t123",
  "GSI1SK": "ALBUM#2026-07-17",
  "GSI2PK": "CLIENTE#cli_001",
  "GSI2SK": "ALBUM#2026-07-17",
  "id": "alb_001",
  "titulo": "Casamento Ana & Pedro",
  "cliente_id": "cli_001",
  "orcamento_id": "orc_001",
  "data_evento": "2026-06-15",
  "status": "rascunho",
  "slug": "casamento-ana-pedro-2026",
  "capa_foto_id": "foto_042",
  "total_fotos": 450,
  "total_galerias": 5,
  "disponivel_em": "2026-07-01T00:00:00Z",
  "expira_em": "2026-10-01T00:00:00Z",
  "permite_download": true,
  "permite_selecao": true,
  "permite_comentarios": false,
  "cota_selecao": 100,
  "selecao_confirmada": false,
  "percentual_pago": 70,
  "created_at": "2026-07-01T10:00:00Z",
  "updated_at": "2026-07-17T10:00:00Z"
}
```

### Status do Álbum
| Status | Descrição |
|---|---|
| rascunho | Criado, sem fotos ou em edição |
| processando | Upload/processamento em andamento |
| pronto | Fotos processadas, não publicado |
| publicado | Visível ao cliente |
| expirado | Prazo vencido, acesso bloqueado |
| arquivado | Admin arquivou manualmente |

### Entidade GALERIA
```json
{
  "PK": "ALBUM#alb_001",
  "SK": "GALERIA#gal_001",
  "id": "gal_001",
  "album_id": "alb_001",
  "nome": "Cerimônia",
  "ordem": 1,
  "total_fotos": 120,
  "created_at": "2026-07-01T10:00:00Z"
}
```

### Entidade FOTO
```json
{
  "PK": "GALERIA#gal_001",
  "SK": "FOTO#foto_001",
  "GSI1PK": "ALBUM#alb_001",
  "GSI1SK": "FOTO#0001",
  "id": "foto_001",
  "galeria_id": "gal_001",
  "album_id": "alb_001",
  "nome_original": "DSC_4521.jpg",
  "s3_key_original": "t123/alb_001/original/foto_001.jpg",
  "s3_key_media": "t123/alb_001/media/foto_001.jpg",
  "s3_key_thumb": "t123/alb_001/thumb/foto_001.jpg",
  "status_processamento": "concluido",
  "largura": 6000,
  "altura": 4000,
  "tamanho_bytes": 12500000,
  "ordem": 1,
  "favoritada": false,
  "selecionada": false,
  "created_at": "2026-07-01T10:05:00Z"
}
```

### GSIs
| GSI | PK | SK | Uso |
|---|---|---|---|
| GSI1 | TENANT#id | ALBUM#data | Listar álbuns do tenant por data |
| GSI2 | CLIENTE#id | ALBUM#data | Listar álbuns de um cliente |
| GSI1 (FOTO) | ALBUM#id | FOTO#ordem | Listar todas as fotos do álbum |

### API Routes
- GET /admin/albuns
- POST /admin/albuns
- GET /admin/albuns/:id
- PUT /admin/albuns/:id
- DELETE /admin/albuns/:id

## Critérios de Aceite
- [ ] Entidades ALBUM, GALERIA, FOTO criadas no DynamoDB
- [ ] GSIs configurados e funcionais
- [ ] CRUD completo de álbuns via API
- [ ] Status machine funciona (transições válidas)
- [ ] Query por cliente retorna álbuns corretos
- [ ] Contadores (total_fotos, total_galerias) consistentes

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ALB-01: Modelo de Dados DynamoDB para Álbuns.

1. Crie apps/backend/src/models/album.js com helpers para ALBUM, GALERIA, FOTO.
2. Crie handlers em apps/backend/src/handlers/album/ (CRUD).
3. Configure entidades no DynamoDB single-table com GSI1 e GSI2.
4. Rotas: GET/POST /admin/albuns, GET/PUT/DELETE /admin/albuns/:id.
5. Status machine: rascunho → processando → pronto → publicado → expirado/arquivado.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
