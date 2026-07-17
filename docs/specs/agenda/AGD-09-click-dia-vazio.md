# AGD-09: Clique no dia vazio → criar sessão direto

## Metadados
- **ID:** AGD-09
- **Tipo:** Melhoria
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** Nenhuma

## Contexto
Atualmente para criar uma sessão o admin precisa clicar em "+ Nova Sessão" e depois escolher a data. Seria mais natural clicar em um dia vazio no calendário e já abrir o formulário com a data pré-preenchida.

## Escopo
- `apps/frontend/src/pages/admin/Agenda/AgendaCalendar.jsx` — onClick no dia
- `apps/frontend/src/pages/admin/Agenda/Agenda.jsx` — handler de navegação

## Fora de Escopo (NÃO TOCAR)
- Formulário de nova sessão (já existe via "+ Nova Sessão")
- Backend
- Lista
- Drawer

## Spec Técnica

### Frontend
- No calendário, cada célula de dia tem onClick:
  - Se clicou na pill de um evento → abre drawer (AGD-01)
  - Se clicou na área vazia do dia → abre modal/formulário de nova sessão com `data` pré-preenchida
- Distinguir clique no evento vs clique no dia: event.stopPropagation() na pill
- Cursor: dia vazio mostra `cursor-pointer` com hover sutil (bg-blue-50)
- Dias bloqueados (AGD-06): clique mostra toast "Esta data está bloqueada" e NÃO abre formulário

## Critérios de Aceite
- [ ] Clicar em dia vazio abre formulário de nova sessão
- [ ] Data pré-preenchida com o dia clicado
- [ ] Clicar em evento abre drawer (não abre formulário)
- [ ] Dia bloqueado mostra toast e não abre formulário
- [ ] Hover no dia mostra cursor-pointer e bg-blue-50

## Prompt Pronto para o Kiro CLI

```
Implemente a spec AGD-09: Clique no dia vazio → criar sessão direto.

1. Em AgendaCalendar.jsx:
   - Cada célula de dia: onClick={() => onDayClick(date)}
   - Pills de eventos: onClick={(e) => { e.stopPropagation(); onEventClick(eventoId) }}
   - Estilo hover: hover:bg-blue-50 cursor-pointer na célula

2. Em Agenda.jsx:
   - Handler onDayClick(date):
     - Se dia tem bloqueio total → toast "Esta data está bloqueada"
     - Senão → abrir modal/rota de nova sessão com date pré-preenchida
     - Se formulário é modal: setNovaSessionDate(date); setShowNovaSession(true)
     - Se é rota: navigate(`/admin/agenda/nova?data=${date}`)

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
