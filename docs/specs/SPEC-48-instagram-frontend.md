# SPEC-48 — Criar Tela de Instagram (P2)

| Campo | Valor |
|-------|-------|
| **ID** | SPEC-48 |
| **Tipo** | Feature |
| **Título** | Criar Instagram.jsx — central de publicação e métricas |
| **Prioridade** | P2 |
| **Impacto** | Relevante — marketing e captação de clientes |
| **Esforço** | Médio (ref: 12.1KB protótipo) |

---

## Contexto

Não existe tela de Instagram no frontend. O backend `admin-instagram.js` (4.8KB) + `services/instagramService.js` (5.4KB) + `jobs/instagramPublisherJob.js` (2.7KB) estão completos. Protótipo ref: `instagram-central-prototipo.jsx` (12.1KB).

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/pages/admin/Instagram.jsx` — central
- `apps/frontend/src/components/instagram/PostScheduler.jsx` — agendamento
- `apps/frontend/src/components/instagram/PostGrid.jsx` — grid de posts
- `apps/frontend/src/components/instagram/MetricasPanel.jsx` — métricas

### Arquivos a ALTERAR
- `apps/frontend/src/App.js` — rota
- `apps/frontend/src/components/Sidebar.jsx` — item no menu

---

## Spec Técnica

### Central (Instagram.jsx)
Layout com 3 seções:
1. Status da conexão (topo) — conta vinculada, status, botão reconectar
2. Agendamento de posts (meio)
3. Métricas (lateral ou abaixo)

### Agendamento (PostScheduler.jsx)
- Formulário:
  - Imagem(ns) — upload (carousel suportado)
  - Legenda (textarea com contador de caracteres)
  - Hashtags sugeridas (chips)
  - Data/hora de publicação (datetime picker)
  - Tipo: Feed / Reels / Stories
- Lista de posts agendados (tabela/cards):
  - Thumb, legenda truncada, data agendada, status (agendado/publicado/falhou)
  - Ações: Editar, Cancelar, Publicar agora

### Grid de Posts (PostGrid.jsx)
- Grid estilo Instagram (3 colunas) dos últimos posts publicados
- Cada post: thumbnail, likes, comments
- Clique abre detalhe com métricas

### Métricas (MetricasPanel.jsx)
- Seguidores (total + variação)
- Engajamento médio (%)
- Alcance médio por post
- Melhores horários para postar
- Top 5 posts por engajamento

### API Endpoints (já existentes)
- `GET /api/admin/instagram/conta` — dados da conta
- `GET /api/admin/instagram/posts` — listar posts
- `POST /api/admin/instagram/posts` — agendar post
- `PUT /api/admin/instagram/posts/:id` — editar agendamento
- `DELETE /api/admin/instagram/posts/:id` — cancelar
- `POST /api/admin/instagram/posts/:id/publicar` — publicar agora
- `GET /api/admin/instagram/metricas` — métricas

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/`, `template.yaml`, `infra/`
- Outras pages
- DMs do Instagram (futuro)

---

## Critérios de Aceite
1. Status de conexão exibe conta vinculada
2. Agendar post com imagem e legenda funciona
3. Grid exibe posts publicados com métricas
4. Painel de métricas mostra dados reais da API
5. Publicar agora funciona
6. Item aparece no Sidebar

---

## Prompt Pronto para o Kiro CLI

```
Implemente a SPEC-48 conforme docs/specs/SPEC-48-instagram-frontend.md.

Crie Instagram.jsx com agendamento e métricas.
Siga docs/prototipos/instagram-central-prototipo.jsx.

Arquivos a criar:
- apps/frontend/src/pages/admin/Instagram.jsx
- apps/frontend/src/components/instagram/PostScheduler.jsx
- apps/frontend/src/components/instagram/PostGrid.jsx
- apps/frontend/src/components/instagram/MetricasPanel.jsx

Arquivos a alterar:
- apps/frontend/src/App.js
- apps/frontend/src/components/Sidebar.jsx

NÃO TOQUE em nenhum arquivo fora dessa lista.
```
