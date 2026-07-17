# IG-06: Central de Publicações (Governança)

## Metadados
- **ID:** IG-06
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Alto
- **Dependência:** IG-03, IG-05

## Contexto
Tela que exibe TODOS os posts (publicados, agendados, falhos, rascunhos) em uma visão unificada. Permite gerenciar o pipeline de conteúdo, ver status, reagendar ou republicar posts com falha.

## Escopo
- `apps/backend/src/handlers/instagram/central.js` — NOVO
- `apps/frontend/src/pages/admin/InstagramCentral.jsx` — NOVO
- API: GET /admin/instagram/posts

## Fora de Escopo (NÃO TOCAR)
- Publicação (IG-03)
- Agendamento (IG-05)
- Insights (IG-08/09)

## Spec Técnica

### API — GET /admin/instagram/posts
Query params: `status`, `periodo_inicio`, `periodo_fim`, `album_id`, `page`, `limit`

```json
{
  "items": [
    {
      "id": "post_001",
      "tipo": "imagem",
      "formato": "feed",
      "status": "publicado",
      "caption": "Casamento Ana & Pedro 💍",
      "thumbnail_url": "https://...",
      "ig_permalink": "https://www.instagram.com/p/ABC123/",
      "publicado_em": "2026-07-17T10:00:00Z",
      "metricas": { "likes": 45, "comments": 8 }
    }
  ],
  "resumo": {
    "total": 45,
    "publicados": 38,
    "agendados": 5,
    "falhos": 2,
    "rascunhos": 0
  },
  "total": 45,
  "page": 1
}
```

### Frontend — InstagramCentral.jsx
- **Cards Resumo:** Publicados, Agendados, Falhos, Total
- **Filtros:** Status, período, álbum
- **Grid de posts:** Thumbnail + caption preview + status badge + métricas
- **Ações por post:**
  - Publicado: Ver no IG (link externo), ver insights
  - Agendado: Editar caption, reagendar, cancelar
  - Falho: Ver erro, republicar
  - Rascunho: Editar, publicar agora, agendar
- **Badges:** 🟢 Publicado, 🔵 Agendado, 🔴 Falho, ⚪ Rascunho
- **Ordenação:** Por data (recente primeiro)

### Ações
| Ação | Endpoint | Disponível em |
|---|---|---|
| Republicar | POST /admin/instagram/publicar | Falho |
| Cancelar | DELETE /admin/instagram/agendar/:id | Agendado |
| Editar caption | PUT /admin/instagram/posts/:id | Agendado, Rascunho |
| Ver insights | GET /admin/instagram/insights/:id | Publicado |

## Critérios de Aceite
- [ ] Listagem de todos os posts
- [ ] Filtros por status/período/álbum
- [ ] Cards resumo
- [ ] Grid com thumbnails
- [ ] Ações contextuais por status
- [ ] Republicar post falho
- [ ] Cancelar agendamento
- [ ] Badges de status

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IG-06: Central de Publicações.

1. Crie handlers/instagram/central.js: GET /admin/instagram/posts com filtros.
2. Crie pages/admin/InstagramCentral.jsx: grid posts, filtros, ações.
3. Cards resumo: publicados/agendados/falhos/total.
4. Ações: republicar falho, cancelar agendado, editar rascunho.
5. Badges de status, thumbnails, métricas inline.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
