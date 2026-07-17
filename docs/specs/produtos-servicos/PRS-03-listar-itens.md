# PRS-03: Listar Itens com Filtros

## Metadados
- **ID:** PRS-03
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Baixo
- **Dependência:** PRS-02

## Contexto
Tela principal do módulo "Produtos e Serviços": listagem de todos os itens com filtros por tipo, categoria, ativo/inativo e busca textual.

## Escopo
- `apps/backend/src/handlers/produtos/itens.js` — ALTERAR (adicionar GET)
- `apps/frontend/src/pages/admin/ProdutosServicos.jsx` — ALTERAR (listagem)
- API: GET /admin/produtos/itens

## Fora de Escopo (NÃO TOCAR)
- Criação (PRS-02 — já feito)
- Pacotes (PRS-06)
- Outros módulos

## Spec Técnica

### API — GET /admin/produtos/itens
Query params: `tipo`, `categoria_id`, `ativo`, `busca`, `page`, `limit`

```json
{
  "items": [
    {
      "id": "itm_001",
      "nome": "Cobertura Casamento",
      "tipo": "servico_principal",
      "categoria": "Fotografia",
      "valor_base": 3500.00,
      "duracao_base": 8,
      "ativo": true,
      "exibir_ao_cliente": true
    }
  ],
  "total": 15,
  "page": 1
}
```

### Filtros
| Filtro | Tipo | Valores |
|---|---|---|
| tipo | select | servico_principal, produto, adicional, todos |
| categoria_id | select | categorias ativas |
| ativo | toggle | ativos/inativos/todos |
| busca | text | nome, descrição |

### Frontend — ProdutosServicos.jsx
- **Tabs por tipo:** Todos | Serviços | Produtos | Adicionais
- **Tabela:** Nome, Tipo, Categoria, Valor, Duração, Status, Ações
- **Filtros:** barra acima da tabela
- **Busca:** debounce 300ms
- **Ações:** Editar, Desativar, Duplicar
- **Botão:** "+ Novo Item" (abre ItemForm)
- **Badge de status:** verde=ativo, cinza=inativo
- **Ícone tipo:** 📷 servico, 📦 produto, ➕ adicional

### Query Strategy
- Se filtro por tipo: usar GSI1 (eficiente)
- Se filtro por categoria: usar GSI2
- Se sem filtro: query PK=TENANT, begins_with(SK, 'ITEM#')
- Busca textual: FilterExpression com contains()

## Critérios de Aceite
- [ ] Listagem com todos os itens
- [ ] Filtro por tipo funciona (usa GSI)
- [ ] Filtro por categoria funciona
- [ ] Busca textual com debounce
- [ ] Tabs por tipo
- [ ] Badge de status
- [ ] Ações (editar, desativar, duplicar)
- [ ] Responsive

## Prompt Pronto para o Kiro CLI

```
Implemente a spec PRS-03: Listar Itens com Filtros.

1. Em handlers/produtos/itens.js: GET /admin/produtos/itens com query params.
2. Em pages/admin/ProdutosServicos.jsx: tabs por tipo, tabela, filtros, busca.
3. Query via GSI1 (tipo) ou GSI2 (categoria) conforme filtro.
4. Busca textual com FilterExpression contains().
5. Ações: editar, desativar, duplicar.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
