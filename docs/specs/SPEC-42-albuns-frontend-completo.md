# SPEC-42 — Expandir Tela de Álbuns (P1)

| Campo | Valor |
|-------|-------|
| **ID** | SPEC-42 |
| **Tipo** | Feature |
| **Título** | Expandir Albuns.jsx com gestão completa de entregas |
| **Prioridade** | P1 |
| **Impacto** | Alto — entrega pro cliente é o desfecho do job |
| **Esforço** | Alto (ref: 44KB protótipo) |

---

## Contexto

Albuns.jsx tem 3.4KB (7.8% do protótipo de 44KB). Apenas lista álbuns. Falta: criação vinculada ao contrato, upload batch de fotos, seleção pelo cliente, link de entrega, expiração e retenção.

Backend: `apps/api/src/routes/admin-albuns.js` (6.2KB) + `jobs/albumRetentionJob.js` (3.1KB).
Protótipo ref: `docs/prototipos/album-gestao-prototipo.jsx` (44KB).

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/pages/admin/AlbumForm.jsx` — criar/editar álbum
- `apps/frontend/src/pages/admin/AlbumDetalhe.jsx` — gestão de fotos do álbum
- `apps/frontend/src/components/album/FotoGrid.jsx` — grid de fotos com seleção
- `apps/frontend/src/components/album/UploadBatch.jsx` — upload em lote
- `apps/frontend/src/components/album/EntregaStatus.jsx` — painel de status de entrega

### Arquivos a ALTERAR
- `apps/frontend/src/pages/admin/Albuns.jsx` — expandir listagem
- `apps/frontend/src/App.js` — rotas

---

## Spec Técnica

### Listagem (Albuns.jsx)
- Tabela: Nome, Cliente, Contrato, Qtd Fotos, Status (rascunho/publicado/expirado/arquivado), Expira em, Ações
- Filtros: status, cliente, período
- Indicador visual: dias restantes para expiração (verde/amarelo/vermelho)
- Ações: Publicar, Copiar link, Estender prazo, Arquivar

### Formulário (AlbumForm.jsx)
- Nome do álbum (text)
- Cliente (select — filtrado por contratos ativos)
- Contrato vinculado (select)
- Descrição (textarea)
- Prazo de expiração (date ou dias a partir de publicação)
- Senha de acesso (toggle + campo)
- Permite download (toggle)
- Permite seleção pelo cliente (toggle + limite de fotos)

### Gestão de Fotos (AlbumDetalhe.jsx)
- Upload batch (drag & drop de múltiplos arquivos)
- Progress bar por foto e total
- Grid de fotos com:
  - Checkbox para selecionar
  - Star para marcar como destaque
  - Excluir individual
  - Reordenar via drag
- Informações: total de fotos, tamanho total, último upload
- Botão "Publicar álbum" → gera link de entrega
- Botão "Copiar link" → clipboard

### Upload Batch (UploadBatch.jsx)
- Aceita JPG, PNG, TIFF
- Upload paralelo via presigned URLs (máx 5 simultâneos)
- Progress individual + total
- Retry automático em falha
- Preview de thumbnails durante upload

### Status de Entrega (EntregaStatus.jsx)
- Timeline: Criado → Fotos enviadas → Publicado → Visualizado pelo cliente → Download/Seleção
- Métricas: visualizações, downloads, fotos selecionadas pelo cliente
- Notificações enviadas (lista)

### API Endpoints (já existentes)
- `GET/POST /api/admin/albuns`
- `GET/PUT/DELETE /api/admin/albuns/:id`
- `POST /api/admin/albuns/:id/fotos` — upload
- `DELETE /api/admin/albuns/:id/fotos/:fotoId`
- `POST /api/admin/albuns/:id/publicar`
- `POST /api/admin/albuns/:id/estender`

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/`, `template.yaml`, `infra/`
- Outras pages

---

## Critérios de Aceite
1. Upload batch de 50+ fotos funciona com progress
2. Publicar gera link copiável
3. Status de expiração exibe countdown
4. Estender prazo funciona
5. Fotos podem ser reordenadas e excluídas
6. Vínculo com contrato/cliente está correto

---

## Prompt Pronto para o Kiro CLI

```
Implemente a SPEC-42 conforme docs/specs/SPEC-42-albuns-frontend-completo.md.

Expanda Albuns.jsx e crie AlbumForm.jsx + AlbumDetalhe.jsx com upload batch de fotos via presigned URL.
Siga docs/prototipos/album-gestao-prototipo.jsx.

Arquivos a criar:
- apps/frontend/src/pages/admin/AlbumForm.jsx
- apps/frontend/src/pages/admin/AlbumDetalhe.jsx
- apps/frontend/src/components/album/FotoGrid.jsx
- apps/frontend/src/components/album/UploadBatch.jsx
- apps/frontend/src/components/album/EntregaStatus.jsx

Arquivos a alterar:
- apps/frontend/src/pages/admin/Albuns.jsx
- apps/frontend/src/App.js

NÃO TOQUE em nenhum arquivo fora dessa lista.
```
