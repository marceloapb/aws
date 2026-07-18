# NTF-01: Barramento de Eventos (EventBridge + Emissão Padronizada)

## Metadados
- **ID:** NTF-01
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto (pré-requisito de TUDO)
- **Esforço:** Médio
- **Dependência:** Nenhuma (fundação)

## Contexto
Todo módulo deve emitir eventos de negócio para o EventBridge num formato padronizado. Sem isso, Notificações e Follow-up não funcionam. Criar helper reutilizável + documentar contrato.

## Escopo
- `apps/backend/src/services/eventBus.js` — NOVO
- `apps/backend/src/events/schemas.js` — NOVO (validação)
- EventBridge: custom event bus `mbf-events`

## Fora de Escopo (NÃO TOCAR)
- Consumers (NTF-03, FLW-02)
- Módulos emissores (cada um adiciona no seu tempo)
- DLQ de eventos (futuro)

## Spec Técnica

### Helper — eventBus.js
```js
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge')
const client = new EventBridgeClient({})

async function emitirEvento({ tenantId, source, detailType, payload }) {
  const evento = {
    Source: source,
    DetailType: detailType,
    EventBusName: process.env.EVENT_BUS_NAME || 'mbf-events',
    Detail: JSON.stringify({
      tenantId,
      evento_id: `evt_${ulid()}`,
      ocorrido_em: new Date().toISOString(),
      ...payload
    })
  }
  
  await client.send(new PutEventsCommand({ Entries: [evento] }))
  return evento
}

module.exports = { emitirEvento }
```

### Contrato de Evento (padrão)
```json
{
  "source": "mbf.orcamentos",
  "detail-type": "orcamento.criado",
  "detail": {
    "tenantId": "t123",
    "evento_id": "evt_01J...",
    "ocorrido_em": "2026-07-17T10:00:00Z",
    "recurso_id": "orc_001",
    "cliente_id": "cli_001",
    "cliente_nome": "Ana Carolina",
    "dados": {
      "valor": 5500,
      "tipo_evento": "casamento"
    }
  }
}
```

### Catálogo de Eventos (fonte da verdade)
| Source | Detail-Type | Payload Mínimo |
|---|---|---|
| mbf.orcamentos | orcamento.criado | recurso_id, cliente_id, valor |
| mbf.orcamentos | orcamento.aceito | recurso_id, cliente_id |
| mbf.orcamentos | orcamento.recusado | recurso_id, cliente_id, motivo |
| mbf.contratos | contrato.enviado | recurso_id, cliente_id |
| mbf.contratos | contrato.assinado | recurso_id, cliente_id |
| mbf.pagamentos | pagamento.confirmado | recurso_id, cliente_id, valor |
| mbf.pagamentos | pagamento.vencido | recurso_id, cliente_id, valor, vencimento |
| mbf.albuns | album.publicado | recurso_id, cliente_id, link |
| mbf.albuns | album.baixado | recurso_id, cliente_id |
| mbf.feedbacks | feedback.respondido | recurso_id, cliente_id, nota |
| mbf.agenda | evento.confirmado | recurso_id, cliente_id, data |
| mbf.agenda | evento.realizado | recurso_id, cliente_id |
| mbf.whatsapp | mensagem.recebida | conversa_id, cliente_id, conteudo |
| mbf.clientes | cliente.criado | cliente_id, nome, email |

### SAM — Event Bus
```yaml
MbfEventBus:
  Type: AWS::Events::EventBus
  Properties:
    Name: mbf-events
```

### Validação — schemas.js
```js
const EVENTOS_VALIDOS = {
  'mbf.orcamentos': ['orcamento.criado', 'orcamento.aceito', 'orcamento.recusado'],
  'mbf.contratos': ['contrato.enviado', 'contrato.assinado'],
  'mbf.pagamentos': ['pagamento.confirmado', 'pagamento.vencido'],
  'mbf.albuns': ['album.publicado', 'album.baixado'],
  'mbf.feedbacks': ['feedback.respondido'],
  'mbf.agenda': ['evento.confirmado', 'evento.realizado'],
  'mbf.whatsapp': ['mensagem.recebida'],
  'mbf.clientes': ['cliente.criado']
}

function validarEvento(source, detailType) {
  const tipos = EVENTOS_VALIDOS[source]
  if (!tipos) throw new Error(`Source desconhecido: ${source}`)
  if (!tipos.includes(detailType)) throw new Error(`Tipo inválido: ${detailType}`)
  return true
}
```

### Regras
- Todo evento tem evento_id único (ULID)
- Todo evento tem tenantId
- Todo evento tem ocorrido_em (ISO 8601)
- Source = "mbf.{dominio}"
- Detail-type = "{recurso}.{acao}" (passado)
- Payload mínimo: recurso_id + cliente_id
- Helper reutilizável: qualquer Lambda pode emitir

## Critérios de Aceite
- [ ] Helper emitirEvento funciona
- [ ] Evento chega no EventBridge
- [ ] Contrato padronizado respeitado
- [ ] Validação de source/detailType
- [ ] evento_id único gerado
- [ ] SAM: event bus criado

## Prompt Pronto para o Kiro CLI

```
Implemente a spec NTF-01: Barramento de Eventos.

1. Crie services/eventBus.js: helper emitirEvento().
2. Crie events/schemas.js: validação source + detailType.
3. SAM: EventBus 'mbf-events'.
4. Contrato: tenantId, evento_id (ULID), ocorrido_em, recurso_id, cliente_id.
5. Source = 'mbf.{dominio}', detail-type = '{recurso}.{acao}'.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
