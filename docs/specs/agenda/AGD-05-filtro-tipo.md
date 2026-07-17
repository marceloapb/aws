# AGD-05: Filtro por tipo de sessão

## Metadados
- **ID:** AGD-05
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** AGD-04

## Contexto
Além do status, o admin precisa filtrar por tipo de sessão (Ensaio, Casamento, Aniversário, Corporativo, etc.) para ver apenas eventos de um tipo específico.

## Escopo
- `apps/frontend/src/pages/admin/Agenda/AgendaFilters.jsx` — adicionar filtro de tipo
- `apps/frontend/src/pages/admin/Agenda/Agenda.jsx` — state adicional

## Fora de Escopo (NÃO TOCAR)
- Backend
- Cadastro de tipos (vem do catálogo)
- Drawer (AGD-01)
- Layout calendário/lista

## Spec Técnica

### Tipos de Sessão (do catálogo)
- Ensaio
- Casamento
- Aniversário
- Corporativo
- Batizado
- Formatura
- Newborn
- Outro

### Frontend
- Select/dropdown ao lado dos chips de status
- Label: "Tipo de sessão"
- Options: "Todos os tipos" (default) + lista de tipos
- Filtro combinado: status AND tipo

```js
const eventosFiltrados = eventos
  .filter(e => statusFilter.includes('todos') || statusFilter.includes(e.status))
  .filter(e => tipoFilter === 'todos' || e.tipo === tipoFilter)
```

## Critérios de Aceite
- [ ] Dropdown "Tipo de sessão" ao lado dos chips de status
- [ ] Filtra por tipo em ambas as views
- [ ] Combina com filtro de status (AND)
- [ ] "Todos os tipos" mostra tudo
- [ ] Lista de tipos vem do catálogo ou constante

## Prompt Pronto para o Kiro CLI

```
Implemente a spec AGD-05: Filtro por tipo de sessão.

1. Em AgendaFilters.jsx, adicione um <select> à direita dos chips de status:
   - Label: "Tipo"
   - Options: Todos os tipos, Ensaio, Casamento, Aniversário, Corporativo, Batizado, Formatura, Newborn, Outro
   - onChange → onTipoChange(value)

2. Em Agenda.jsx:
   - State: const [tipoFilter, setTipoFilter] = useState('todos')
   - Combine filtros: status AND tipo
   - Passe eventosFiltrados para AgendaCalendar e AgendaList

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
