# SPEC-41 — Expandir Tela de Catálogo (P1)

| Campo | Valor |
|-------|-------|
| **ID** | SPEC-41 |
| **Tipo** | Feature |
| **Título** | Expandir Catalogo.jsx com CRUD completo e galeria |
| **Prioridade** | P1 |
| **Impacto** | Alto — base para montar orçamentos |
| **Esforço** | Alto (ref: 42.2KB protótipo) |

---

## Contexto

Catalogo.jsx tem 7.3KB (17.3% do protótipo). Exibe listagem básica de pacotes. Falta: CRUD completo com fotos, categorias, variações de preço, e seletor usado no orçamento.

Backend: `apps/api/src/routes/admin-catalogo.js` (8.9KB) — CRUD com upload.
Protótipo ref: `docs/prototipos/catalogo-prototipo.jsx` (42.2KB).

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/pages/admin/CatalogoForm.jsx` — criar/editar item
- `apps/frontend/src/pages/admin/CatalogoDetalhe.jsx` — visualização
- `apps/frontend/src/components/catalogo/GaleriaUpload.jsx` — upload múltiplo de fotos
- `apps/frontend/src/components/catalogo/VariacaoPreco.jsx` — tabela de variações
- `apps/frontend/src/components/catalogo/CategoriaFilter.jsx` — filtro por categoria

### Arquivos a ALTERAR
- `apps/frontend/src/pages/admin/Catalogo.jsx` — expandir com grid/list view e filtros
- `apps/frontend/src/App.js` — rotas

---

## Spec Técnica

### Listagem (Catalogo.jsx)
- Toggle view: Grid (cards com foto) / Lista (tabela)
- Filtros: categoria, faixa de preço, status (ativo/inativo)
- Busca por nome
- Cada card: foto principal, nome, preço base, categoria, badge ativo/inativo
- Ações: Editar, Duplicar, Desativar

### Formulário (CatalogoForm.jsx)
- Nome do serviço/pacote (text)
- Descrição (textarea rica)
- Categoria (select: Casamento, Ensaio, Corporativo, Newborn, Produto, etc.)
- Preço base (R$)
- Variações de preço (tabela dinâmica):
  - Ex: "até 100 fotos" = R$X, "até 200 fotos" = R$Y
  - Ou: "4 horas" = R$X, "8 horas" = R$Y
- O que inclui (lista de itens: bullets editáveis)
- Galeria de fotos (upload múltiplo, drag para reordenar, definir capa)
- Duração estimada (horas)
- Status: Ativo / Inativo
- Tags (chips editáveis)

### Galeria (GaleriaUpload.jsx)
- Upload via presigned URL (padrão de admin-fotos.js)
- Preview de thumbnails
- Drag & drop para reordenar
- Clique para definir foto de capa
- Excluir foto individual

### API Endpoints (já existentes)
- `GET /api/admin/catalogo` — listar
- `GET /api/admin/catalogo/:id` — detalhe
- `POST /api/admin/catalogo` — criar
- `PUT /api/admin/catalogo/:id` — editar
- `DELETE /api/admin/catalogo/:id` — excluir
- `POST /api/admin/catalogo/:id/fotos` — upload foto
- `DELETE /api/admin/catalogo/:id/fotos/:fotoId` — remover foto

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/`, `template.yaml`, `infra/`
- Outras pages

---

## Critérios de Aceite
1. Grid/List toggle funciona
2. Criar item com fotos e variações persiste corretamente
3. Upload de fotos usa presigned URL
4. Reordenar fotos atualiza a ordem
5. Filtros por categoria e status funcionam
6. Duplicar item cria cópia editável

---

## Prompt Pronto para o Kiro CLI

```
Implemente a SPEC-41 conforme docs/specs/SPEC-41-catalogo-frontend-completo.md.

Expanda Catalogo.jsx e crie CatalogoForm.jsx com upload de fotos via presigned URL (mesmo padrão de admin-fotos.js).
Siga docs/prototipos/catalogo-prototipo.jsx.

Arquivos a criar:
- apps/frontend/src/pages/admin/CatalogoForm.jsx
- apps/frontend/src/pages/admin/CatalogoDetalhe.jsx
- apps/frontend/src/components/catalogo/GaleriaUpload.jsx
- apps/frontend/src/components/catalogo/VariacaoPreco.jsx
- apps/frontend/src/components/catalogo/CategoriaFilter.jsx

Arquivos a alterar:
- apps/frontend/src/pages/admin/Catalogo.jsx
- apps/frontend/src/App.js

NÃO TOQUE em nenhum arquivo fora dessa lista.
```
