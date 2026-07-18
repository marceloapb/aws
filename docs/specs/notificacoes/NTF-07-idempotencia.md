# NTF-07: Idempotência de Evento (Dedup por evento_id)

## Metadados
- **ID:** NTF-07
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto — segurança contra duplicata
- **Esforço:** Baixo
- **Dependência:** NTF-01

## Contexto
EventBridge pode entregar o mesmo evento mais de uma vez (at-least-once delivery). Se o dispatcher processar 2x, o admin recebe notificação duplicada. Solução: tabela de dedup com TTL. Verificar ANTES de processar.

## Escopo
- `apps/backend/src/services/dedupEvento.js` — NOVO
- DynamoDB: entidade DEDUP_EVENTO (com TTL)

## Fora de Escopo (NÃO TOCAR)
- Dispatcher (NTF-03 — consome este service)
- Barramento (NTF-01)
- Canais (NTF-04/05/06)

## Spec Técnica

### Entidade DEDUP_EVENTO
```json
{
  "PK": "DEDUP#evt_01J5X...",
  "evento_id": "evt_01J5X...",
  "processado_em": "2026-07-18T10:00:00Z",
  "ttl": 1721433600
}
```

### Service — dedupEvento.js
```js
async function verificarDedup(eventoId) {
  const result = await dynamo.get({
    TableName: TABLE,
    Key: { PK: `DEDUP#${eventoId}` }
  }).promise()
  
  return !!result.Item // true = já processado
}

async function marcarProcessado(eventoId) {
  const ttl = Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24h
  
  await dynamo.put({
    TableName: TABLE,
    Item: {
      PK: `DEDUP#${eventoId}`,
      evento_id: eventoId,
      processado_em: new Date().toISOString(),
      ttl
    },
    ConditionExpression: 'attribute_not_exists(PK)' // Garante atomicidade
  }).promise()
}

module.exports = { verificarDedup, marcarProcessado }
```

### Integração com Dispatcher
```js
// No início do handler:
const jaProcessado = await verificarDedup(detail.evento_id)
if (jaProcessado) {
  console.log(`Evento ${detail.evento_id} já processado (dedup). Ignorando.`)
  return { duplicado: true }
}

// No final, após sucesso:
await marcarProcessado(detail.evento_id)
```

### DynamoDB TTL
```yaml
# No SAM template, habilitar TTL na tabela:
TimeToLiveSpecification:
  AttributeName: ttl
  Enabled: true
```

### Regras
- TTL de 24h (suficiente para evitar duplicatas)
- ConditionExpression: garante que 2 Lambdas concorrentes não processem o mesmo evento
- Se ConditionExpression falha: ConditionalCheckFailedException → significa que outro já processou → silencioso
- PK simples: DEDUP#<evento_id> (não precisa de tenant porque evento_id é ULID global)
- DynamoDB TTL remove automaticamente após 24h
- Zero custo de manutenção

### Tratamento de Concorrência
```js
async function marcarProcessado(eventoId) {
  try {
    await dynamo.put({
      TableName: TABLE,
      Item: { PK: `DEDUP#${eventoId}`, ... },
      ConditionExpression: 'attribute_not_exists(PK)'
    }).promise()
    return true // Marcado com sucesso
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      return false // Outro já marcou — ok, silencioso
    }
    throw error // Erro real
  }
}
```

## Critérios de Aceite
- [ ] Evento processado 1x, nunca 2x
- [ ] TTL 24h funciona (item expira)
- [ ] ConditionExpression impede concorrência
- [ ] Se já processado: retorna silencioso
- [ ] evento_id global (sem colisão entre tenants)
- [ ] DynamoDB TTL habilitado

## Prompt Pronto para o Kiro CLI

```
Implemente a spec NTF-07: Idempotência de Evento.

1. Crie services/dedupEvento.js: verificarDedup() + marcarProcessado().
2. Entidade DEDUP_EVENTO: PK=DEDUP#<evento_id>, ttl=24h.
3. ConditionExpression: attribute_not_exists(PK).
4. ConditionalCheckFailedException: silencioso.
5. Habilitar TTL na tabela DynamoDB.
6. Integrar no dispatcher (verificar antes, marcar depois).

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
