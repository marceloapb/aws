# CLI-05: Filtros Avançados na Listagem

## Metadados
- **ID:** CLI-05
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** CLI-02, CLI-03

## Contexto
A listagem em `Clientes.jsx` (6.3KB) tem busca básica por nome. Faltam filtros por: status, tags, período de cadastro, origem, e combinações entre eles.

## Escopo
- `apps/frontend/src/pages/admin/Clientes.jsx` — painel de filtros
- Backend: Lambda listClientes — aceitar query params
- DynamoDB: GSIs para queries eficientes

## Fora de Escopo (NÃO TOCAR)
- `ClienteForm.jsx`
- `ClienteDetalhe.jsx`
- Exportação (CLI-10)

## Spec Técnica

### Filtros Disponíveis
| Filtro | Tipo | UI |
|---|---|---|
| status | enum[] | Checkbox group |
| tags | string[] | Multi-select |
| como_conheceu | enum | Dropdown |
| periodo_cadastro | date range | Date picker from/to |
| busca | string | Input text (nome, email, telefone) |

### Frontend — Clientes.jsx
- Painel colapsável "Filtros" acima da tabela
- Chips ativos mostrando filtros aplicados
- Botão "Limpar filtros"
- Contagem de resultados: "X clientes encontrados"
- Debounce 500ms na busca textual
- URL params sincronizados (deep link)

### Backend — listClientes
- Query params: `?status=lead,contato&tags=casamento&origem=instagram&from=2026-01-01&to=2026-07-17&q=maria`
- Estratégia: filtrar no backend via GSI + filter expressions
- GSI_STATUS: PK=tenant_id#status, SK=created_at
- Para tags: filter expression (DynamoDB contains)

### Paginação
- Cursor-based (LastEvaluatedKey encoded em base64)
- 25 itens por página
- Botão "Carregar mais" ou scroll infinito

## Critérios de Aceite
- [ ] Filtro por status (multi-select) funciona
- [ ] Filtro por tag(s) funciona
- [ ] Filtro por origem funciona
- [ ] Filtro por período de cadastro funciona
- [ ] Busca textual com debounce
- [ ] Chips de filtros ativos
- [ ] Botão limpar remove todos
- [ ] Contagem de resultados atualiza
- [ ] URL params sincronizados
- [ ] Paginação cursor-based

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CLI-05: Filtros Avançados na Listagem.

1. Em Clientes.jsx: painel colapsável com filtros (status, tags, origem, período, busca).
2. Chips de filtros ativos + botão limpar.
3. Sincronizar filtros com URL params.
4. Backend listClientes: aceitar query params, filtrar via GSI + filter expressions.
5. Paginação cursor-based (25 por página).

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
