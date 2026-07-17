# ORC-09: Expiração Automática

## Metadados
- **ID:** ORC-09
- **Tipo:** Melhoria
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** ORC-02, ORC-06

## Contexto
Orçamentos enviados ao cliente ficam "vivos" eternamente se não houver resposta. O admin precisa definir um prazo de validade; após expirar, o status muda automaticamente e a reserva de agenda é liberada.

## Escopo
- `apps/frontend/src/pages/admin/OrcamentoForm.jsx` — campo validade
- Backend: Lambda `expirarOrcamento` — triggered por EventBridge
- EventBridge Scheduler: regra por orçamento
- DynamoDB: campo `expira_em` no ORCAMENTO

## Fora de Escopo (NÃO TOCAR)
- Reserva de agenda (ORC-06 já libera)
- Portal do cliente
- Notificações

## Spec Técnica

### Frontend — OrcamentoForm.jsx
- Campo "Validade da proposta" com opções:
  - 7 dias (default)
  - 15 dias
  - 30 dias
  - Personalizado (date picker)
- Mostrar data de expiração calculada
- No detalhe: countdown "Expira em X dias"

### Backend — enviarOrcamento
- Calcular `expira_em` = data_envio + validade
- Criar schedule no EventBridge: `at(expira_em)` → Lambda expirarOrcamento
- Salvar schedule_arn no ORCAMENTO

### Lambda — expirarOrcamento
- Verificar se status_interno == 'enviado' (idempotência)
- Se sim: atualizar status → 'expirado'
- Chamar liberarReservas(orcamento_id)
- Deletar o schedule do EventBridge

### Cancelamento do Schedule
- Se cliente aceita/recusa antes: deletar schedule

## Critérios de Aceite
- [ ] Campo validade com opções pré-definidas + custom
- [ ] Data de expiração calculada e visível
- [ ] EventBridge schedule criado no envio
- [ ] Lambda expira automaticamente após prazo
- [ ] Reservas liberadas na expiração
- [ ] Se aceito/recusado antes: schedule cancelado
- [ ] Countdown no detalhe do orçamento

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ORC-09: Expiração Automática.

1. Em OrcamentoForm.jsx: campo validade (7/15/30/custom dias).
2. Backend enviarOrcamento: calcular expira_em, criar EventBridge schedule.
3. Lambda expirarOrcamento: verificar status=enviado, mudar para expirado, liberar reservas.
4. Em aceitarOrcamento/recusarOrcamento: deletar schedule.
5. IAM: EventBridge scheduler permissions.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
