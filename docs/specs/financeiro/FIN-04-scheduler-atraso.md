# FIN-04: Scheduler — Status em_aberto → atrasada

## Metadados
- **ID:** FIN-04
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** FIN-01

## Contexto
Um job diário verifica cobranças com vencimento passado e muda o status de 'em_aberto' para 'atrasada'. Opcionalmente envia notificação ao admin e ao cliente.

## Escopo
- `apps/backend/src/handlers/financeiro/verificarAtrasos.js` — NOVO
- EventBridge Scheduler: execução diária (06:00 UTC-3)
- DynamoDB: atualizar status
- Notificação: email/push ao admin

## Fora de Escopo (NÃO TOCAR)
- Marcar como pago (FIN-03)
- Gateway (FIN-07+)
- Frontend

## Spec Técnica

### Trigger
- EventBridge Scheduler: `cron(0 9 * * ? *)` (06:00 BRT = 09:00 UTC)
- Executa diariamente

### Lógica
```js
async function handler() {
  const hoje = new Date().toISOString().split('T')[0]
  
  // Query: cobranças com status=em_aberto E vencimento < hoje
  const atrasadas = await queryCobrancasEmAbertoVencidas(hoje)
  
  for (const cobranca of atrasadas) {
    await updateCobranca(cobranca.id, {
      status: 'atrasada',
      updated_at: new Date().toISOString()
    })
  }
  
  // Notificar admin se há novas atrasadas
  if (atrasadas.length > 0) {
    await notificarAdmin('cobrancas_atrasadas', {
      quantidade: atrasadas.length,
      valor_total: atrasadas.reduce((sum, c) => sum + c.valor, 0)
    })
  }
  
  return { processadas: atrasadas.length }
}
```

### Query Eficiente
- GSI1: PK=TENANT#id, SK begins_with('COBRANCA#STATUS#em_aberto#')
- Filtrar SK < 'COBRANCA#STATUS#em_aberto#' + hoje
- Ou: scan com FilterExpression (aceitável se volume baixo < 1000)

### Notificação ao Admin
- Canal: email (SES) + notificação in-app
- Template: "Você tem {X} cobranças atrasadas totalizando R$ {Y}"
- Frequência: 1x por dia (no job)

### Notificação ao Cliente (opcional, configurável)
- Se habilitado em ConfigEmpresa:
  - Enviar lembrete ao cliente no dia do atraso
  - Template: "Sua parcela de R$ {valor} venceu em {data}. Regularize."
  - Canal: email + WhatsApp (se configurado)

## Critérios de Aceite
- [ ] Job executa diariamente
- [ ] Cobranças vencidas mudam para 'atrasada'
- [ ] Apenas em_aberto são processadas (não toca paga/cancelada)
- [ ] Notificação ao admin com resumo
- [ ] Notificação ao cliente (se habilitado)
- [ ] Idempotente (rodar 2x no mesmo dia não quebra)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-04: Scheduler de Atrasos.

1. Crie handlers/financeiro/verificarAtrasos.js: query cobranças em_aberto com vencimento < hoje.
2. Atualizar status para 'atrasada'.
3. Notificar admin (email SES) com resumo.
4. EventBridge Scheduler: cron diário 09:00 UTC.
5. SAM: rule + Lambda.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
