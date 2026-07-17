# ORC-09: Expiração Automática de Orçamentos

## Metadados
- **ID:** ORC-09
- **Tipo:** Melhoria
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** ORC-02, ORC-06

## Contexto
Orçamentos enviados ficam "vivos" indefinidamente. A spec §6 define prazo de validade parametrizável. Ao expirar: status muda automaticamente, reservas de agenda são liberadas, cliente é notificado.

## Escopo
- Backend: Lambda `expirarOrcamentos` — NOVO (scheduled)
- EventBridge Scheduler: regra de expiração diária
- DynamoDB: campo `expira_em` no ORCAMENTO
- `apps/frontend/src/pages/admin/OrcamentoForm.jsx` — campo prazo
- `apps/frontend/src/pages/admin/OrcamentoDetalhe.jsx` — countdown

## Fora de Escopo (NÃO TOCAR)
- Notificação ao cliente (ORC-12 futuro via SES)
- Reservas em si (ORC-06 — apenas chamar a liberação)
- Configurações globais (CFG-*)

## Spec Técnica

### Frontend
- OrcamentoForm: campo "Válido por" (dias, default do tenant)
- Cálculo: `expira_em = data_envio + prazo_dias`
- OrcamentoDetalhe: countdown "Expira em X dias" / "Expirado há Y dias"

### Backend — expirarOrcamentos (Lambda scheduled)
- Cron: EventBridge rule `rate(1 day)` às 08:00 UTC
- Query: status_interno=enviado AND expira_em < now()
- Para cada expirado:
  1. Atualizar status_interno → expirado
  2. Calcular status_cliente
  3. Chamar liberarReservas(orcamento_id)
  4. Gravar log de expiração

### SAM
```yaml
ExpirarOrcamentosFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: handlers/expirarOrcamentos.handler
    Timeout: 60
    Events:
      ScheduleEvent:
        Type: Schedule
        Properties:
          Schedule: cron(0 8 * * ? *)
```

### DynamoDB
- GSI: GSI_STATUS_EXPIRA (PK: status_interno, SK: expira_em)
- Permite query eficiente de expirados

## Critérios de Aceite
- [ ] Campo "prazo de validade" no formulário
- [ ] Countdown visível no detalhe
- [ ] Lambda roda diariamente
- [ ] Orçamentos expirados mudam de status automaticamente
- [ ] Reservas de agenda liberadas na expiração
- [ ] Admin pode reabrir expirado (→ em_revisao)
- [ ] GSI permite query eficiente

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ORC-09: Expiração Automática.

1. Em OrcamentoForm.jsx: campo prazo_validade (dias), calcular expira_em.
2. Em OrcamentoDetalhe.jsx: countdown visual.
3. Backend Lambda expirarOrcamentos: query expirados, atualizar status, liberar reservas.
4. SAM: EventBridge cron(0 8 * * ? *) → expirarOrcamentos.
5. DynamoDB: GSI GSI_STATUS_EXPIRA.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
