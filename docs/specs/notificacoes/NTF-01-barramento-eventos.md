# NTF-01: Barramento de Eventos (EventBridge + Emissão Padronizada)

## Metadados
- **ID:** NTF-01
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto — pré-requisito de tudo
- **Esforço:** Médio
- **Dependência:** Nenhuma (fundação)

## Contexto
Todo módulo precisa emitir eventos no barramento (EventBridge) para que notificações e follow-ups funcionem. Padronizar formato do evento, source, detail-type e payload. Criar helper reutilizável que todos os handlers importam.

## Escopo
- `apps/backend/src/services/eventBus.js` — NOVO (helper)
- `apps/backend/src/events/schemas/` — NOVO (schemas de eventos)
- EventBridge: bus customizado `mbf-events`
- SAM: recurso EventBus

## Fora de Escopo (NÃO TOCAR)
- Listeners (NTF-03)
- Regras de notificação (NTF-02)
- Lógica dos domínios (handlers existentes)

## Spec Técnica

### Formato Padrão de Evento
```json
{
  "Source": "mbf.orcamentos",
  "DetailType": "orcamento.aceito",
  "EventBusName": "mbf-events",
  "Detail": {
    "evento_id": "evt_01J5X...",
    "tenant_id": "t123",
    "dominio": "orcamento",
    "acao": "aceito",
    "recurso_id": "orc_001",
    "cliente_id": "cli_001",
    "cliente_nome": "Ana Carolina",
    "dados": {
      "valor": 5500,
      "titulo": "Casamento Ana & Pedro"
    },
    "ocorrido_em": "2026-07-18T10:00:00Z",
    "actor": "cli_001"
  }
}
```

### Helper — eventBus.js
```js
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge')
const { ulid } = require('ulid')

const client = new EventBridgeClient({})
const BUS_NAME = process.env.EVENT_BUS_NAME || 'mbf-events'

async function emitirEvento({ source, detailType, tenantId, dominio, acao, recursoId, clienteId, clienteNome, dados, actor }) {
  const evento_id = `evt_${ulid()}`
  
  const entry = {
    Source: source,
    DetailType: detailType,
    EventBusName: BUS_NAME,
    Detail: JSON.stringify({
      evento_id,
      tenant_id: tenantId,
      dominio,
      acao,
      recurso_id: recursoId,
      cliente_id: clienteId,
      cliente_nome: clienteNome,
      dados: dados || {},
      ocorrido_em: new Date().toISOString(),
      actor: actor || 'system'
    })
  }
  
  await client.send(new PutEventsCommand({ Entries: [entry] }))
  return evento_id
}

module.exports = { emitirEvento }
```

### Catálogo de Eventos
| Source | DetailType | Quando |
|---|---|---|
| mbf.orcamentos | orcamento.criado | Orçamento criado |
| mbf.orcamentos | orcamento.enviado | Enviado ao cliente |
| mbf.orcamentos | orcamento.aceito | Cliente aceita |
| mbf.orcamentos | orcamento.recusado | Cliente recusa |
| mbf.contratos | contrato.enviado | Contrato enviado |
| mbf.contratos | contrato.assinado | Cliente assina |
| mbf.pagamentos | pagamento.confirmado | Pagamento confirmado |
| mbf.pagamentos | pagamento.vencido | Parcela venceu |
| mbf.agenda | evento.criado | Sessão criada |
| mbf.agenda | evento.confirmado | Sessão confirmada |
| mbf.agenda | evento.realizado | Sessão concluída |
| mbf.albuns | album.publicado | Álbum publicado |
| mbf.albuns | album.baixado | Cliente baixou |
| mbf.feedbacks | feedback.respondido | Cliente respondeu |
| mbf.clientes | cliente.criado | Novo cliente |
| mbf.whatsapp | mensagem.recebida | Cliente mandou msg |

### SAM — EventBus
```yaml
MbfEventBus:
  Type: AWS::Events::EventBus
  Properties:
    Name: mbf-events
```

### Regras
- Todo handler que muda estado DEVE emitir evento
- evento_id = ULID (único, ordenável)
- Detail DEVE ter: evento_id, tenant_id, dominio, acao, recurso_id, ocorrido_em
- cliente_id e dados são opcionais (depende do contexto)
- Source: `mbf.<dominio>` (sempre lowercase)
- DetailType: `<entidade>.<acao>` (sempre lowercase, ponto como separador)
- Bus customizado (não usar default)

## Critérios de Aceite
- [ ] Helper emitirEvento funciona
- [ ] Bus customizado mbf-events criado
- [ ] Formato padrão respeitado
- [ ] evento_id gerado (ULID)
- [ ] Catálogo de 16+ eventos definido
- [ ] Pelo menos 1 handler existente emitindo via helper (prova)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec NTF-01: Barramento de Eventos.

1. Crie services/eventBus.js: helper emitirEvento().
2. Crie events/schemas/ com catálogo de eventos.
3. SAM: EventBus customizado 'mbf-events'.
4. Formato: evento_id (ULID), tenant_id, dominio, acao, recurso_id, ocorrido_em.
5. Source: mbf.<dominio>, DetailType: <entidade>.<acao>.
6. Integrar 1 handler existente como prova.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
