# NTF-03: Listener + Dispatcher (Consome Evento, Aplica Regra, Roteia Canal)

## Metadados
- **ID:** NTF-03
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto (motor principal)
- **Esforço:** Médio
- **Dependência:** NTF-01, NTF-07

## Contexto
Lambda que escuta TODOS os eventos do barramento, consulta a regra correspondente, e roteia para o canal correto (in-app, email, WhatsApp). É o motor central do módulo de notificações.

## Escopo
- `apps/backend/src/handlers/notificacoes/dispatcher.js` — NOVO
- EventBridge: rule catch-all para mbf-events
- Integração com adapters de canal

## Fora de Escopo (NÃO TOCAR)
- Adapters de canal individuais (NTF-04/05/06)
- CRUD de regras (NTF-02)
- Barramento (NTF-01)
- Follow-up (módulo separado)

## Spec Técnica

### Fluxo
```
EventBridge (mbf-events)
  → Lambda dispatcher
    → 1. Verificar idempotência (evento_id)
    → 2. Buscar regra para tipo_evento
    → 3. Para cada destinatário × canal:
      → Rotear para adapter correto
```

### Lambda — dispatcher.js
```js
async function handler(event) {
  const { tenantId, evento_id } = event.detail
  const tipoEvento = event['detail-type']
  
  // 1. Idempotência
  const jProcessado = await verificarDedup(tenantId, evento_id)
  if (jProcessado) return { duplicado: true }
  
  // 2. Buscar regra
  const regra = await getRegraParaEvento(tenantId, tipoEvento)
  if (!regra || !regra.ativa) return { ignorado: true }
  
  // 3. Para cada destinatário
  for (const dest of regra.destinatarios) {
    const destinatarioId = dest.tipo === 'admin' 
      ? tenantId 
      : event.detail.cliente_id
    
    // 4. Para cada canal do destinatário
    for (const canal of dest.canais) {
      await despacharParaCanal(canal, {
        tenantId,
        evento_id,
        tipo_evento: tipoEvento,
        destinatario_tipo: dest.tipo,
        destinatario_id: destinatarioId,
        cliente_id: event.detail.cliente_id,
        cliente_nome: event.detail.cliente_nome,
        payload: event.detail,
        template_email: dest.template_email,
        titulo_inapp: dest.titulo_inapp,
        corpo_inapp: dest.corpo_inapp
      })
    }
  }
  
  // 5. Registrar dedup
  await registrarDedup(tenantId, evento_id)
  
  return { processado: true }
}

async function despacharParaCanal(canal, dados) {
  switch (canal) {
    case 'inapp':
      await criarNotificacaoInApp(dados)
      break
    case 'email':
      await enviarNotificacaoEmail(dados)
      break
    case 'whatsapp':
      await enviarNotificacaoWhatsApp(dados)
      break
  }
  
  // Registrar log de entrega
  await registrarLogEntrega(dados, canal, 'enviado')
}
```

### EventBridge Rule — Catch-All
```yaml
NotificacaoDispatcherRule:
  Type: AWS::Events::Rule
  Properties:
    Name: notificacao-dispatcher
    EventBusName: !Ref MbfEventBus
    EventPattern:
      source:
        - prefix: 'mbf.'
    Targets:
      - Arn: !GetAtt DispatcherFunction.Arn
        Id: DispatcherTarget
```

### Regras
- Catch-all: escuta TODO source com prefix 'mbf.'
- Se sem regra para o evento: ignora silenciosamente
- Se regra desativada: ignora
- Idempotência verificada ANTES de processar
- Dispatcher NÃO faz retry (fire-and-forget)
- Se adapter falha: registra log com status='falha', não re-tenta
- Timeout: 30s (suficiente para 2-3 canais)

## Critérios de Aceite
- [ ] Escuta todos eventos mbf.*
- [ ] Busca regra por tipo_evento
- [ ] Ignora se sem regra ou desativada
- [ ] Despacha para cada canal de cada destinatário
- [ ] Idempotência funciona (não processa 2x)
- [ ] Log de entrega registrado
- [ ] Se adapter falha: log de falha sem retry

## Prompt Pronto para o Kiro CLI

```
Implemente a spec NTF-03: Listener + Dispatcher.

1. Crie handlers/notificacoes/dispatcher.js: Lambda handler.
2. EventBridge rule catch-all (prefix 'mbf.').
3. Verificar idempotência antes de processar.
4. Buscar regra por tipo_evento.
5. Despachar para cada canal×destinatário.
6. Registrar log de entrega.
7. SAM: Lambda + EventBridge rule.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
