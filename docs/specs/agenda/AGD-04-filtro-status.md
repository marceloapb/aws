# AGD-04: Filtro por status

## Metadados
- **ID:** AGD-04
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** Nenhuma

## Contexto
Não existe filtro na agenda. O admin precisa filtrar por status (Confirmada, Pendente, Bloqueada, Cancelada) para triagem rápida.

## Escopo
- `apps/frontend/src/pages/admin/Agenda/AgendaFilters.jsx` — NOVO
- `apps/frontend/src/pages/admin/Agenda/Agenda.jsx` — importar filtros
- Filtro client-side (dados já carregados via API de listagem)

## Fora de Escopo (NÃO TOCAR)
- Backend (filtro é client-side)
- Layout do calendário/lista
- Cards de métricas
- Drawer (AGD-01)

## Spec Técnica

### Frontend — AgendaFilters.jsx
- Barra de filtros abaixo dos cards de métricas, acima do calendário/lista
- Pills/chips clicáveis (multi-select):
  - "Todos" (default, ativo)
  - "Confirmadas" (verde)
  - "Pendentes" (laranja)
  - "Bloqueadas" (cinza)
  - "Canceladas" (vermelho)
- Ao clicar, filtra os eventos visíveis (Calendário e Lista)
- Múltiplos selecionáveis (ex: Confirmadas + Pendentes)
- "Todos" desmarca os outros; selecionar qualquer outro desmarca "Todos"

### Lógica
```js
const eventosFiltrados = selectedStatuses.includes('todos')
  ? eventos
  : eventos.filter(e => selectedStatuses.includes(e.status))
```

## Critérios de Aceite
- [ ] Barra de filtros visível abaixo dos cards de métricas
- [ ] Chips com cores correspondentes ao status
- [ ] Filtro aplica em ambas as views (Calendário e Lista)
- [ ] Multi-select funciona
- [ ] "Todos" reseta os filtros
- [ ] Contagem de eventos atualiza nos cards de métrica conforme filtro

## Prompt Pronto para o Kiro CLI

```
Implemente a spec AGD-04: Filtro por status na Agenda.

1. Crie apps/frontend/src/pages/admin/Agenda/AgendaFilters.jsx:
   - Barra horizontal com chips/pills: Todos, Confirmadas, Pendentes, Bloqueadas, Canceladas
   - Cada chip com cor do status (use agendaColors.js)
   - Props: { selectedStatuses, onFilterChange }
   - Multi-select: clique adiciona/remove do array
   - "Todos" é exclusivo (desmarca outros)

2. Em Agenda.jsx:
   - Importe AgendaFilters entre os cards de métricas e a view (calendário/lista)
   - State: const [statusFilter, setStatusFilter] = useState(['todos'])
   - Filtre os eventos antes de passar para AgendaCalendar/AgendaList

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
