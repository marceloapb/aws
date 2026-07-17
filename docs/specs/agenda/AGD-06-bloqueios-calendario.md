# AGD-06: Indicador de datas bloqueadas no calendário

## Metadados
- **ID:** AGD-06
- **Tipo:** Melhoria
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** Nenhuma

## Contexto
O botão "Bloquear Data" existe mas as datas bloqueadas NÃO aparecem visualmente no calendário. Risco: admin esquece que bloqueou e tenta agendar no mesmo dia. A spec §7 prevê que dias bloqueados apareçam com fundo cinza e riscado.

## Escopo
- `apps/frontend/src/pages/admin/Agenda/AgendaCalendar.jsx` — estilo dos dias bloqueados
- API já retorna eventos com status=bloqueado

## Fora de Escopo (NÃO TOCAR)
- Modal de "Bloquear Data" (já funciona)
- Lista
- Drawer
- Backend

## Spec Técnica

### Frontend — AgendaCalendar.jsx
- Para cada dia no mês, verificar se existe evento com `status === 'bloqueado'`
- Se bloqueado:
  - Fundo: `bg-gray-100`
  - Número do dia: `text-gray-400 line-through`
  - Tooltip on hover: "Data bloqueada: {motivo}"
  - Ícone pequeno: 🔒 no canto superior direito da célula
- Se bloqueio parcial (apenas algumas horas):
  - Fundo: `bg-gray-50` (mais leve)
  - Sem line-through no número
  - Pill cinza com horário bloqueado

## Critérios de Aceite
- [ ] Dias com bloqueio total aparecem com fundo cinza e número riscado
- [ ] Ícone 🔒 visível no dia bloqueado
- [ ] Hover mostra tooltip com motivo do bloqueio
- [ ] Bloqueio parcial mostra pill cinza com horário
- [ ] Dias normais não são afetados

## Prompt Pronto para o Kiro CLI

```
Implemente a spec AGD-06: Indicador de datas bloqueadas no calendário.

1. Em AgendaCalendar.jsx, no render de cada célula de dia:
   - Verifique se há eventos com status=bloqueado naquele dia
   - Se bloqueio total (sem hora_inicio/hora_fim ou dia inteiro): bg-gray-100, text-gray-400 line-through, ícone 🔒 absolute top-0 right-0
   - Se bloqueio parcial: bg-gray-50, pill cinza com horário bloqueado
   - Tooltip (title attr ou custom tooltip): "Bloqueado: {motivo}"

2. Os eventos bloqueados já vêm na listagem de eventos do mês (mesma API).

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
