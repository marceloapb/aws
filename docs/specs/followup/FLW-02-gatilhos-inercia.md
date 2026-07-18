# FLW-02: Gatilhos de Inércia (Criação + Resolução Event-Driven)

## Metadados
- **ID:** FLW-02
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** FLW-01

## Contexto
Gatilho é criado quando um item entra em estado de inércia (ex: orçamento vira 'pendente'). O gatilho fica ativo até ser resolvido (cliente responde) ou até todas tentativas esgotarem. Resolução é event-driven: domínio emite evento → listener fecha gatilho.

## Escopo
- `apps/backend/src/handlers/followup/gatilhos.js` — NOVO
- `apps/backend/src/listeners/followup/criarGatilho.js` — NOVO
- DynamoDB: entidade GATILHO_INERCIA
- EventBridge: regras de criação de gatilho

## Fora de Escopo (NÃO TOCAR)
- Motor de varredura (FLW-03 — consome gatilhos)
- Disparo (FLW-04/05)
- Tela (FLW-08/09)

## Spec Técnica

### Entidade GATILHO_INERCIA
```json
{
  "PK": "TENANT#t123",
  "SK": "GATILHO#gat_001",
  "GSI1PK": "TENANT#t123",
  "GSI1SK": "STATUS#ativo#2026-07-17",
  "id": "gat_001",
  "regua_id": "regua_001",
  "dominio": "orcamento",
  "recurso_id": "orc_001",
  "cliente_id": "cli_001",
  "cliente_nome": "Ana Carolina",
  "status": "ativo",
  "tentativa_atual": 0,
  "max_tentativas": 3,
  "inicio_inercia": "2026-07-14T10:00:00Z",
  "proximo_disparo": "2026-07-17T10:00:00Z",
  "disparos": [],
  "created_at": "2026-07-14T10:00:00Z",
  "resolvido_em": null,
  "motivo_resolucao": null
}
```

### Eventos que CRIAM gatilho
| Evento | Domínio | Status Gatilho |
|---|---|---|
| orcamento.criado (status=pendente) | orcamento | ativo |
| contrato.enviado (aguardando aceite) | contrato | ativo |
| pagamento.vencido | pagamento | ativo |
| evento.realizado (aguardando feedback) | feedback | ativo |
| album.publicado (aguardando download) | album | ativo |

### Eventos que RESOLVEM gatilho
| Evento | Ação |
|---|---|
| orcamento.aceito | Fechar gatilho (motivo: 'aceito') |
| orcamento.recusado | Fechar gatilho (motivo: 'recusado') |
| contrato.assinado | Fechar gatilho (motivo: 'assinado') |
| pagamento.confirmado | Fechar gatilho (motivo: 'pago') |
| feedback.respondido | Fechar gatilho (motivo: 'respondido') |
| album.baixado | Fechar gatilho (motivo: 'baixado') |

### Listener — criarGatilho.js
```js
async function handler(event) {
  const { tenantId, dominio, recurso_id, cliente_id, cliente_nome } = event.detail
  
  // 1. Buscar régua ativa para este domínio
  const regua = await getReguaAtiva(tenantId, dominio)
  if (!regua) return // Sem régua configurada
  
  // 2. Verificar se já existe gatilho ativo para este recurso
  const existente = await getGatilhoAtivo(tenantId, recurso_id)
  if (existente) return // Já tem gatilho
  
  // 3. Criar gatilho
  const gatilho = {
    PK: `TENANT#${tenantId}`,
    SK: `GATILHO#gat_${ulid()}`,
    GSI1PK: `TENANT#${tenantId}`,
    GSI1SK: `STATUS#ativo#${hoje()}`,
    id: `gat_${ulid()}`,
    regua_id: regua.id,
    dominio,
    recurso_id,
    cliente_id,
    cliente_nome,
    status: 'ativo',
    tentativa_atual: 0,
    max_tentativas: regua.tentativas.length,
    inicio_inercia: new Date().toISOString(),
    proximo_disparo: calcularProximoDisparo(regua.tentativas[0]),
    disparos: [],
    created_at: new Date().toISOString()
  }
  
  await dynamo.put({ TableName: TABLE, Item: gatilho }).promise()
}
```

### Listener — resolverGatilho.js
```js
async function handler(event) {
  const { tenantId, dominio, recurso_id, motivo } = event.detail
  
  const gatilho = await getGatilhoAtivoPorRecurso(tenantId, recurso_id)
  if (!gatilho) return
  
  await atualizarGatilho(gatilho, {
    status: 'resolvido',
    resolvido_em: new Date().toISOString(),
    motivo_resolucao: motivo,
    GSI1SK: `STATUS#resolvido#${hoje()}`
  })
}
```

### EventBridge Rules
```yaml
CriarGatilhoRule:
  Type: AWS::Events::Rule
  Properties:
    EventPattern:
      source: ["mbf.orcamentos", "mbf.contratos", "mbf.pagamentos", "mbf.albuns"]
      detail-type: ["orcamento.criado", "contrato.enviado", "pagamento.vencido", "album.publicado"]
    Targets:
      - Arn: !GetAtt CriarGatilhoFunction.Arn

ResolverGatilhoRule:
  Type: AWS::Events::Rule
  Properties:
    EventPattern:
      source: ["mbf.orcamentos", "mbf.contratos", "mbf.pagamentos", "mbf.feedbacks", "mbf.albuns"]
      detail-type: ["orcamento.aceito", "orcamento.recusado", "contrato.assinado", "pagamento.confirmado", "feedback.respondido", "album.baixado"]
    Targets:
      - Arn: !GetAtt ResolverGatilhoFunction.Arn
```

### Regras
- 1 gatilho por recurso (não duplicar)
- Gatilho ativo → motor pode disparar
- Resolução: status='resolvido', registra motivo
- Se régua desativada depois: gatilhos existentes continuam (decisão consciente)
- GSI1 para query rápida por status + data

## Critérios de Aceite
- [ ] Gatilho criado ao evento de inércia
- [ ] Não duplica (1 por recurso)
- [ ] Resolução fecha gatilho
- [ ] EventBridge rules funcionam
- [ ] GSI1 permite query por status
- [ ] Motivo de resolução registrado

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FLW-02: Gatilhos de Inércia.

1. Crie handlers/followup/gatilhos.js: CRUD gatilhos.
2. Crie listeners/followup/criarGatilho.js + resolverGatilho.js.
3. Entidade GATILHO_INERCIA com GSI1.
4. EventBridge rules para criar e resolver.
5. 1 gatilho por recurso (idempotente).
6. SAM: 2 funções + 2 rules.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
