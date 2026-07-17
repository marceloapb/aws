# CLI-03: Tags e Segmentação de Clientes

## Metadados
- **ID:** CLI-03
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** CLI-02

## Contexto
O admin precisa categorizar clientes por tipo de evento (casamento, 15 anos, corporativo), origem, e categorias livres. Tags permitem segmentar para campanhas, relatórios e filtros.

## Escopo
- `apps/frontend/src/pages/admin/ClienteForm.jsx` — campo tags
- `apps/frontend/src/pages/admin/Clientes.jsx` — filtro por tag
- DynamoDB: atributo `tags[]` no CLIENTE + entidade TAG
- Backend: CRUD de tags

## Fora de Escopo (NÃO TOCAR)
- Automação de tag (futuro)
- Campanhas de marketing
- Relatórios

## Spec Técnica

### Modelo de Dados — TAG
```json
{
  "PK": "TENANT#t123",
  "SK": "TAG#casamento",
  "nome": "Casamento",
  "cor": "#FF6B6B",
  "categoria": "tipo_evento",
  "created_at": "2026-07-17T10:00:00Z"
}
```

### Categorias de Tag (pré-definidas)
- `tipo_evento`: Casamento, 15 Anos, Ensaio, Corporativo, Batizado, Formatura
- `origem`: Instagram, Indicação, Google, Site, Outro
- `custom`: Tags livres criadas pelo admin

### Frontend — ClienteForm.jsx
- Campo multi-select com autocomplete
- Criar nova tag inline (nome + cor)
- Chips coloridos removíveis
- Máximo 10 tags por cliente

### Frontend — Clientes.jsx
- Filtro multi-tag (AND/OR toggle)
- Tags visíveis como chips na listagem
- Dropdown de tags existentes

### API
- GET /admin/tags — listar todas
- POST /admin/tags — criar nova
- DELETE /admin/tags/:id — remover (soft)

## Critérios de Aceite
- [ ] Multi-select com autocomplete
- [ ] Criar tag inline funciona
- [ ] Chips coloridos na listagem e formulário
- [ ] Filtro por tag(s) funciona
- [ ] Máximo 10 tags por cliente
- [ ] Tags pré-definidas por categoria
- [ ] Remover tag do cliente funciona

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CLI-03: Tags e Segmentação.

1. Em ClienteForm.jsx: campo multi-select com autocomplete e criação inline.
2. Em Clientes.jsx: filtro multi-tag, chips na listagem.
3. Backend: CRUD tags (GET/POST/DELETE), atributo tags[] no CLIENTE.
4. DynamoDB: entidade TAG com PK=TENANT#id, SK=TAG#nome.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
