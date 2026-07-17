# CLI-06: Busca Global com Autocomplete

## Metadados
- **ID:** CLI-06
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** CLI-05

## Contexto
O admin precisa encontrar um cliente rapidamente de qualquer tela. Uma busca global (cmd+K ou barra no header) com autocomplete resolve isso. Busca por nome, email, telefone, CPF.

## Escopo
- `apps/frontend/src/components/layout/SearchBar.jsx` — NOVO
- `apps/frontend/src/components/layout/Header.jsx` — integrar
- Backend: Lambda `searchClientes` — busca fuzzy
- API: GET /admin/clientes/search?q=

## Fora de Escopo (NÃO TOCAR)
- Busca de outros módulos (futuro: busca unificada)
- `Clientes.jsx` (filtro local)
- Mobile (responsivo mas sem cmd+K)

## Spec Técnica

### Frontend — SearchBar.jsx
- Input com ícone de busca no header
- Atalho: Cmd+K (Mac) / Ctrl+K (Windows)
- Dropdown com resultados (máx 5)
- Cada resultado: avatar, nome, email, status badge
- Debounce 300ms
- Clique navega para ClienteDetalhe
- ESC fecha dropdown
- Loading state durante busca

### Backend — searchClientes
- Busca em: nome, email, telefone, cpf_cnpj
- Estratégia: contains case-insensitive (DynamoDB Scan com filter para MVP, migrar para OpenSearch depois se necessário)
- Limit: 5 resultados
- Response: `[{ id, nome, email, telefone, status, avatar_url }]`

### Otimização Futura
- Para escala: indexar em DynamoDB com GSI de busca (nome_lower) ou migrar para OpenSearch
- MVP: Scan com FilterExpression é aceitável até ~1000 clientes

## Critérios de Aceite
- [ ] Barra de busca visível no header
- [ ] Cmd+K / Ctrl+K abre com foco
- [ ] Autocomplete com 5 resultados
- [ ] Busca por nome, email, telefone, CPF
- [ ] Debounce 300ms
- [ ] Clique navega para detalhe
- [ ] ESC fecha
- [ ] Loading state visível
- [ ] Resultado vazio: "Nenhum cliente encontrado"

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CLI-06: Busca Global com Autocomplete.

1. Crie components/layout/SearchBar.jsx: input, dropdown, atalho Cmd+K.
2. Em Header.jsx: integrar SearchBar.
3. Backend GET /admin/clientes/search?q=: busca contains em nome/email/telefone/cpf.
4. Limit 5, debounce 300ms no front.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
