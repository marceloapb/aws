# AGD-02: Cores por status no calendário e lista

## Metadados
- **ID:** AGD-02
- **Tipo:** Melhoria
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** Nenhuma

## Contexto
Atualmente todos os eventos aparecem em azul, independente do status. A spec §7 prevê cores distintas: verde (confirmado), laranja (reserva/pendente), cinza (bloqueado), vermelho (cancelado).

## Escopo
- `apps/frontend/src/pages/admin/Agenda/AgendaCalendar.jsx` — cor da pill
- `apps/frontend/src/pages/admin/Agenda/AgendaList.jsx` — cor da barra lateral e badge
- `apps/frontend/src/utils/agendaColors.js` — NOVO, constante de mapeamento

## Fora de Escopo (NÃO TOCAR)
- Drawer de detalhe (AGD-01)
- Filtros (AGD-04, AGD-05)
- Cards de métricas
- Backend

## Spec Técnica

### Mapeamento de Cores
| Status | Cor pill (calendário) | Barra lateral (lista) | Badge |
|---|---|---|---|
| confirmado | bg-emerald-500 text-white | border-l-emerald-500 | bg-emerald-100 text-emerald-800 |
| reserva/pendente | bg-orange-500 text-white | border-l-orange-500 | bg-orange-100 text-orange-800 |
| bloqueado | bg-gray-400 text-white | border-l-gray-400 | bg-gray-100 text-gray-800 |
| cancelado | bg-red-500 text-white | border-l-red-500 | bg-red-100 text-red-800 |

### Frontend — agendaColors.js
```js
export const STATUS_COLORS = {
  confirmado: { pill: 'bg-emerald-500 text-white', border: 'border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-800' },
  pendente: { pill: 'bg-orange-500 text-white', border: 'border-l-orange-500', badge: 'bg-orange-100 text-orange-800' },
  reserva: { pill: 'bg-orange-500 text-white', border: 'border-l-orange-500', badge: 'bg-orange-100 text-orange-800' },
  bloqueado: { pill: 'bg-gray-400 text-white', border: 'border-l-gray-400', badge: 'bg-gray-100 text-gray-800' },
  cancelado: { pill: 'bg-red-500 text-white', border: 'border-l-red-500', badge: 'bg-red-100 text-red-800' },
}
```

## Critérios de Aceite
- [ ] Evento confirmado aparece verde no calendário e na lista
- [ ] Evento pendente/reserva aparece laranja
- [ ] Evento bloqueado aparece cinza
- [ ] Evento cancelado aparece vermelho
- [ ] Barra lateral do card na lista reflete a cor
- [ ] Badge de status usa a cor correspondente

## Prompt Pronto para o Kiro CLI

```
Implemente a spec AGD-02: Cores por status no calendário e lista.

1. Crie apps/frontend/src/utils/agendaColors.js com o mapeamento STATUS_COLORS.
2. Em AgendaCalendar.jsx, substitua a classe fixa azul da pill por STATUS_COLORS[evento.status].pill
3. Em AgendaList.jsx, substitua border-l-blue-500 por STATUS_COLORS[evento.status].border e o badge por STATUS_COLORS[evento.status].badge

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
