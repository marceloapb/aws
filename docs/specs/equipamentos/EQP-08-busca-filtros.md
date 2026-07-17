# EQP-08: Busca e Filtros Avançados

## Metadados
- **ID:** EQP-08
- **Tipo:** Melhoria
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** EQP-03

## Contexto
Com o crescimento do inventário, o admin precisa de busca rápida e filtros combinados para encontrar equipamentos específicos.

## Escopo
- `apps/frontend/src/pages/admin/Equipamentos.jsx` — ALTERAR (melhorar filtros)
- `apps/backend/src/handlers/equipamento/equipamentos.js` — ALTERAR (suportar query params)

## Fora de Escopo (NÃO TOCAR)
- Modelo de dados (EQP-01)
- Checklist (EQP-06)
- Outros módulos

## Spec Técnica

### Filtros Disponíveis
| Filtro | Tipo | Valores |
|---|---|---|
| categoria | select múltiplo | categorias ativas |
| status | select múltiplo | disponivel, em_uso, manutencao, indisponivel |
| padrao | toggle | sim/não/todos |
| ativo | toggle | sim/não/todos |
| busca | text | nome, marca, modelo, num_serie |

### Busca Textual
- Busca em: nome, marca, modelo, num_serie (case-insensitive)
- Frontend: debounce 300ms
- Backend: FilterExpression com contains()
- Highlight dos termos na listagem

### UX
- Filtros em barra horizontal (collapsible em mobile)
- Badge com quantidade de filtros ativos
- Botão "Limpar filtros"
- URL params persistem filtros (refresh mantém)
- Resultados: "X equipamentos encontrados"

### Performance
- Se > 100 equipamentos: paginar (20 por página)
- Lazy load com infinite scroll ou paginação tradicional

## Critérios de Aceite
- [ ] Filtro por categoria funciona
- [ ] Filtro por status funciona
- [ ] Filtro por padrão/ativo funciona
- [ ] Busca textual com debounce
- [ ] Filtros combináveis
- [ ] Badge de filtros ativos
- [ ] Botão limpar
- [ ] URL params persistem
- [ ] Paginação se > 100 itens

## Prompt Pronto para o Kiro CLI

```
Implemente a spec EQP-08: Busca e Filtros Avançados.

1. Em Equipamentos.jsx: adicionar barra de filtros (categoria, status, padrão, ativo, busca).
2. Em equipamentos.js: suportar query params combinados com FilterExpression.
3. Debounce 300ms na busca textual.
4. Paginação para > 100 itens.
5. URL params para persistir filtros.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
