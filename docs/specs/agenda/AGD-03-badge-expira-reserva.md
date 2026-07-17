# AGD-03: Badge "expira em Xd" para reservas temporárias

## Metadados
- **ID:** AGD-03
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** Nenhuma

## Contexto
Reservas temporárias (status=reserva) expiram após X dias se o cliente não confirmar. O admin precisa de um indicador visual urgente para saber quais reservas estão prestes a expirar.

## Escopo
- `apps/frontend/src/pages/admin/Agenda/AgendaList.jsx` — badge extra no card
- `apps/frontend/src/pages/admin/Agenda/AgendaCalendar.jsx` — indicador na pill
- API já retorna `reserva_expira_em` no evento (spec §7)

## Fora de Escopo (NÃO TOCAR)
- Drawer (AGD-01)
- Lógica de expiração automática (SPEC-18 cobre)
- Notificação ao cliente
- Backend

## Spec Técnica

### Frontend
- Na **Lista**: se `status === 'reserva' && reserva_expira_em <= 7`, mostrar badge vermelho/amarelo:
  - `<= 2 dias`: badge vermelho pulsante "Expira em Xd ⚠️"
  - `3-7 dias`: badge amarelo "Expira em Xd"
  - `> 7 dias`: sem badge extra
- No **Calendário**: se `reserva_expira_em <= 3`, adicionar ponto vermelho (dot) no canto da pill

## Critérios de Aceite
- [ ] Reserva com <= 2 dias mostra badge vermelho pulsante na lista
- [ ] Reserva com 3-7 dias mostra badge amarelo na lista
- [ ] Reserva com <= 3 dias mostra dot vermelho na pill do calendário
- [ ] Reserva com > 7 dias ou confirmada não mostra badge extra
- [ ] Badge mostra texto "Expira em Xd" com número correto

## Prompt Pronto para o Kiro CLI

```
Implemente a spec AGD-03: Badge "expira em Xd" para reservas temporárias.

1. Em AgendaList.jsx, após os badges existentes do card, adicione condicionalmente:
   - Se status=reserva e reserva_expira_em <= 2: badge com animate-pulse, bg-red-100, text-red-800, texto "Expira em {n}d ⚠️"
   - Se status=reserva e reserva_expira_em 3-7: badge bg-amber-100, text-amber-800, texto "Expira em {n}d"

2. Em AgendaCalendar.jsx, na pill do evento:
   - Se status=reserva e reserva_expira_em <= 3: adicionar <span> com w-2 h-2 rounded-full bg-red-500 absolute -top-1 -right-1

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
