# CT-07: Expiração / Prazo Parametrizável

## Metadados
- **ID:** CT-07
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** CT-05

## Contexto
Contratos têm prazo de assinatura configurável (default 7 dias). Após o prazo, status muda para 'expirado'. Cron diário verifica contratos vencidos.

## Escopo
- `apps/backend/src/handlers/contratos/expirar.js` — NOVO
- EventBridge: cron diário

## Fora de Escopo (NÃO TOCAR)
- Aceite (CT-05)
- Follow-up (CT-09)
- Modelos (CT-02)

## Spec Técnica

### Cron Diário
```js
async function verificarContratosExpirados() {
  const agora = new Date().toISOString()
  
  // Buscar contratos pendentes com expira_em < agora
  const contratos = await queryContratosPendentes()
  
  for (const contrato of contratos) {
    if (contrato.expira_em < agora && contrato.status === 'pendente') {
      await atualizarContrato(contrato.id, { status: 'expirado' })
      await emitirEvento('contrato.expirado', {
        tenant_id: contrato.tenant_id,
        contrato_id: contrato.id,
        cliente_id: contrato.cliente_id
      })
    }
  }
}
```

### Configuração de Prazo
- Default: 7 dias (definido no MODELO_CONTRATO)
- Admin pode alterar por modelo: 3, 5, 7, 14, 30 dias
- Ao gerar contrato: `expira_em = created_at + prazo_assinatura_dias`

### Renovação de Prazo (Admin)
```
POST /admin/contratos/:id/renovar-prazo
{ "novos_dias": 7 }
→ Recalcula expira_em, status volta para 'pendente' se estava 'expirado'
```

### EventBridge
```yaml
ContratoExpiracaoSchedule:
  Type: AWS::Scheduler::Schedule
  Properties:
    ScheduleExpression: 'cron(0 6 * * ? *)'
    Target:
      Arn: !GetAtt ExpirarContratosFunction.Arn
      RoleArn: !GetAtt SchedulerRole.Arn
```

## Critérios de Aceite
- [ ] Cron diário verifica expiração
- [ ] Status muda para 'expirado'
- [ ] Evento emitido
- [ ] Prazo configurável por modelo
- [ ] Admin pode renovar prazo
- [ ] Contrato expirado: cliente vê banner mas não pode assinar

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CT-07: Expiração de Contratos.

1. Crie handlers/contratos/expirar.js: cron diário.
2. Query contratos pendentes com expira_em vencido.
3. Atualizar status='expirado', emitir evento.
4. API: POST /admin/contratos/{id}/renovar-prazo.
5. EventBridge cron diário às 6h.
6. SAM: schedule + rota.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
