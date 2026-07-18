# FLW-03: Motor de Varredura (EventBridge Cron + SQS)

## Metadados
- **ID:** FLW-03
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Alto
- **Dependência:** FLW-01, FLW-02

## Contexto
Cron diário (6h da manhã) que varre todos os gatilhos ativos, verifica quais estão maduros para disparo (dias_inercia >= dias_configurados), aplica teto 1/dia/cliente e envia para fila SQS de despacho.

## Escopo
- `apps/backend/src/handlers/followup/motorVarredura.js` — NOVO
- EventBridge Schedule: cron diário
- SQS: fila `followup-dispatch-queue`

## Fora de Escopo (NÃO TOCAR)
- Disparo efetivo (FLW-04/05 — consome a fila)
- CRUD réguas (FLW-01)
- Gatilhos (FLW-02)
- Teto/prioridade complexo (FLW-07 — motor simples aqui)

## Spec Técnica

### Fluxo
```
EventBridge (cron 0 6 * * ? *)
  → Lambda motorVarredura
    → Query GSI1: todos gatilhos status=ativo
      → Para cada gatilho:
        → Calcular dias de inércia
        → Verificar régua: qual tentativa?
        → Se maduro: enviar para SQS
        → Atualizar proximo_disparo
```

### Lambda — motorVarredura.js
```js
async function handler() {
  // 1. Listar todos tenants ativos
  const tenants = await listarTenantsAtivos()
  
  for (const tenant of tenants) {
    await processarTenant(tenant.id)
  }
}

async function processarTenant(tenantId) {
  // 2. Buscar gatilhos ativos
  const gatilhos = await queryGatilhosAtivos(tenantId)
  
  // 3. Agrupar por cliente (para aplicar teto)
  const porCliente = agruparPorCliente(gatilhos)
  
  for (const [clienteId, gatilhosCliente] of Object.entries(porCliente)) {
    // 4. Ordenar por prioridade da régua
    const ordenados = gatilhosCliente.sort((a, b) => a.prioridade - b.prioridade)
    
    // 5. Pegar apenas o primeiro (teto 1/dia)
    const gatilho = ordenados[0]
    
    // 6. Verificar se está maduro
    if (estaMaduro(gatilho)) {
      await enviarParaFila(tenantId, gatilho)
      await atualizarGatilho(gatilho)
    }
  }
}

function estaMaduro(gatilho) {
  const regua = gatilho._regua
  const tentativaConfig = regua.tentativas[gatilho.tentativa_atual]
  if (!tentativaConfig) return false // Esgotou tentativas
  
  const diasInerciaAtual = diasDesde(gatilho.inicio_inercia)
  return diasInerciaAtual >= tentativaConfig.dias_apos_inercia
}

async function enviarParaFila(tenantId, gatilho) {
  const regua = await getRegua(tenantId, gatilho.regua_id)
  const tentativaConfig = regua.tentativas[gatilho.tentativa_atual]
  
  await sqs.sendMessage({
    QueueUrl: DISPATCH_QUEUE_URL,
    MessageBody: JSON.stringify({
      tenantId,
      gatilho_id: gatilho.id,
      cliente_id: gatilho.cliente_id,
      cliente_nome: gatilho.cliente_nome,
      dominio: gatilho.dominio,
      recurso_id: gatilho.recurso_id,
      tentativa: gatilho.tentativa_atual + 1,
      canal: tentativaConfig.canal,
      template_id: tentativaConfig.template_id
    }),
    MessageGroupId: gatilho.cliente_id
  }).promise()
}

async function atualizarGatilho(gatilho) {
  const novaTentativa = gatilho.tentativa_atual + 1
  const updates = {
    tentativa_atual: novaTentativa,
    ultimo_disparo: new Date().toISOString()
  }
  
  // Se esgotou tentativas: fechar
  if (novaTentativa >= gatilho.max_tentativas) {
    updates.status = 'esgotado'
    updates.GSI1SK = `STATUS#esgotado#${hoje()}`
  }
  
  await atualizarGatilhoDynamo(gatilho, updates)
}
```

### EventBridge Schedule
```yaml
MotorVarreduraSchedule:
  Type: AWS::Scheduler::Schedule
  Properties:
    Name: followup-motor-varredura
    ScheduleExpression: 'cron(0 9 * * ? *)'
    FlexibleTimeWindow:
      Mode: 'OFF'
    Target:
      Arn: !GetAtt MotorVarreduraFunction.Arn
      RoleArn: !GetAtt SchedulerRole.Arn
```

### SQS — followup-dispatch-queue
```yaml
FollowupDispatchQueue:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: followup-dispatch-queue.fifo
    FifoQueue: true
    ContentBasedDeduplication: true
    VisibilityTimeout: 60
    RedrivePolicy:
      deadLetterTargetArn: !GetAtt FollowupDLQ.Arn
      maxReceiveCount: 3

FollowupDLQ:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: followup-dispatch-dlq.fifo
    FifoQueue: true
```

### Performance
- Lambda timeout: 5 min (pode ter muitos gatilhos)
- Batch de 25 gatilhos por query
- Se > 1000 gatilhos: paginar
- FIFO queue para garantir ordem por cliente

### Regras
- Cron: 9h UTC (6h BRT)
- 1 disparo por cliente/dia (teto aplicado aqui)
- Prioridade: régua com menor número = mais importante
- Tentativa esgotada → status 'esgotado'
- DLQ para falhas no envio para fila
- ContentBasedDeduplication: evitar duplicatas

## Critérios de Aceite
- [ ] Cron diário funciona (6h BRT)
- [ ] Query gatilhos ativos por tenant
- [ ] Verifica maturidade (dias >= config)
- [ ] Teto 1/dia por cliente
- [ ] Prioridade aplicada
- [ ] Mensagem enviada para SQS
- [ ] Gatilho atualizado (tentativa++)
- [ ] Status 'esgotado' quando acabam tentativas
- [ ] DLQ configurada

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FLW-03: Motor de Varredura.

1. Crie handlers/followup/motorVarredura.js: cron handler.
2. Query GSI1 por status=ativo.
3. Agrupar por cliente, ordenar por prioridade.
4. Teto 1/dia: só o mais prioritário.
5. Se maduro: enviar para SQS FIFO.
6. Atualizar tentativa; se esgotou: status='esgotado'.
7. SAM: schedule cron(0 9 * * ? *) + SQS FIFO + DLQ.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
