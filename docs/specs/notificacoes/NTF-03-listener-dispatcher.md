# NTF-03: Listener + Dispatcher (Consome evento, aplica regra, roteia para canal)

## Metadados
- **ID:** NTF-03
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto — motor principal
- **Esforço:** Médio
- **Dependência:** NTF-01, NTF-02

## Contexto
Lambda que escuta TODOS os eventos do barramento, busca regras ativas para aquele tipo_evento, e roteia para o canal correto (in-app, email, WhatsApp). É o coração do módulo.

## Escopo
- `apps/backend/src/handlers/notificacoes/dispatcher.js` — NOVO
- EventBridge: rule catch-all no bus mbf-events
- Invoca adapters de canal

## Fora de Escopo (NÃO TOCAR)
- Adapters de canal (NTF-04/05/06 — chamados pelo dispatcher)
- CRUD regras (NTF-02)
- Barramento (NTF-01)

## Spec Técnica

### Fluxo
```
EventBridge (qualquer evento no mbf-events)
  → Lambda dispatcher
    → Verificar idempotência (NTF-07)
    → Buscar regras ativas para tipo_evento
    → Para cada regra:
      → Resolver destinatário (admin ID ou cliente_id)
      → Para cada canal na regra:
        → Rotear para adapter (inapp | email | whatsapp)
      → Registrar LOG_ENTREGA
```

### Lambda — dispatcher.js
```js
async function handler(event) {
  const detail = event.detail
  const tipoEvento = event['detail-type']
  const tenantId = detail.tenant_id
  
  // 1. Idempotência
  const jaProcesado = await verificarDedup(detail.evento_id)
  if (jaProcesado) return // Já notificou
  
  // 2. Buscar regras ativas
  const regras = await getRegrasAtivas(tenantId, tipoEvento)
  if (!regras.length) return // Sem regras para este evento
  
  // 3. Processar cada regra
  for (const regra of regras) {
    const destinatarioId = resolverDestinatario(regra.destinatario, detail)
    
    for (const canal of regra.canais) {
      try {
        await despachar(canal, {
          tenantId,
          destinatarioId,
          regra,
          evento: detail,
          tipoEvento
        })
        
        await registrarLog(tenantId, {
          evento_id: detail.evento_id,
          regra_id: regra.id,
          destinatario: destinatarioId,
          canal,
          status: 'enviado'
        })
      } catch (error) {
        await registrarLog(tenantId, {
          evento_id: detail.evento_id,
          regra_id: regra.id,
          destinatario: destinatarioId,
          canal,
          status: 'falha',
          erro: error.message
        })
      }
    }
  }
  
  // 4. Marcar como processado
  await marcarProcessado(detail.evento_id)
}

function resolverDestinatario(tipo, detail) {
  if (tipo === 'admin') return 'admin' // Sempre o admin do tenant
  if (tipo === 'cliente') return detail.cliente_id
  return tipo // ID direto
}

async function despachar(canal, payload) {
  switch (canal) {
    case 'inapp':
      return await criarNotificacaoInApp(payload)
    case 'email':
      return await enviarNotificacaoEmail(payload)
    case 'whatsapp':
      return await enviarNotificacaoWhatsApp(payload)
    default:
      throw new Error(`Canal desconhecido: ${canal}`)
  }
}
```

### EventBridge Rule (catch-all)
```yaml
NotificacaoDispatcherRule:
  Type: AWS::Events::Rule
  Properties:
    Name: notificacao-dispatcher
    EventBusName: !Ref MbfEventBus
    EventPattern:
      source:
        - prefix: "mbf."
    Targets:
      - Arn: !GetAtt DispatcherFunction.Arn
        Id: DispatcherTarget
```

### Regras
- Catch-all: escuta tudo com prefix "mbf."
- Se sem regras: silencioso (não é erro)
- Fire-and-forget: falha em 1 canal não impede outros
- Log de entrega SEMPRE (sucesso ou falha)
- Idempotência verificada ANTES de processar
- Timeout Lambda: 30s (vários canais podem ser lentos)

## Critérios de Aceite
- [ ] Escuta todos eventos mbf.*
- [ ] Busca regras ativas por tipo_evento
- [ ] Roteia para canal correto
- [ ] Falha em 1 canal não bloqueia outros
- [ ] Log registrado (sucesso/falha)
- [ ] Idempotência funciona
- [ ] Se sem regras: silencioso

## Prompt Pronto para o Kiro CLI

```
Implemente a spec NTF-03: Listener + Dispatcher.

1. Crie handlers/notificacoes/dispatcher.js: event handler.
2. EventBridge rule catch-all (prefix mbf.).
3. Buscar regras ativas por tipo_evento.
4. Rotear para adapter (inapp/email/whatsapp).
5. Log de entrega sempre.
6. Idempotência: verificar antes de processar.
7. SAM: Lambda + Rule.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
