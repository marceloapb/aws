# ORC-05: Integração Agenda — Alerta de Conflito

## Metadados
- **ID:** ORC-05
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** ORC-07

## Contexto
O admin monta o orçamento com datas de evento mas não tem visibilidade de conflitos com a agenda. Pode enviar proposta para uma data já ocupada.

## Escopo
- `apps/frontend/src/pages/admin/OrcamentoForm.jsx` — alerta
- `apps/frontend/src/components/orcamento/AgendaConflictAlert.jsx` — NOVO
- API: POST /admin/agenda/check-conflict
- Lambda: checkAgendaConflict

## Fora de Escopo (NÃO TOCAR)
- Reserva de agenda (ORC-06)
- Módulo Agenda (AGD-*)
- Bloqueio de envio (apenas alerta)

## Spec Técnica

### Frontend — AgendaConflictAlert.jsx
- useEffect com debounce 500ms → POST /admin/agenda/check-conflict
- Se conflito: card amarelo com detalhes
- Se livre: badge verde "✅ Data disponível"

### Lambda — checkAgendaConflict
- Query DynamoDB por data, verificar overlap de horário
- Overlap: inicio_A < fim_B AND inicio_B < fim_A
- Ignorar cancelados

## Critérios de Aceite
- [ ] Check automático de conflito ao preencher data/hora
- [ ] Conflito mostra alerta amarelo
- [ ] Sem conflito mostra badge verde
- [ ] NÃO bloqueia envio
- [ ] Se API falha, não quebra formulário

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ORC-05: Integração Agenda — Alerta de Conflito.

1. Crie AgendaConflictAlert.jsx com debounce e visual de conflito.
2. Backend POST /admin/agenda/check-conflict com query de overlap.
3. Em OrcamentoForm.jsx: renderizar abaixo dos campos data/hora.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
