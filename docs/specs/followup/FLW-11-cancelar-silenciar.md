# FLW-11: Cancelamento Manual + Silenciar Cliente

## Metadados
- **ID:** FLW-11
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** FLW-08

## Contexto
Admin pode cancelar um ciclo de follow-up manualmente (ex: conversou com cliente por telefone) ou silenciar um cliente completamente (não recebe mais nenhum follow-up futuro). Silenciar é reversível.

## Escopo
- `apps/backend/src/handlers/followup/cancelar.js` — NOVO
- `apps/backend/src/handlers/followup/silenciar.js` — NOVO
- API: PATCH /admin/followup/gatilhos/:id/cancelar, POST/DELETE /admin/followup/silenciar/:clienteId

## Fora de Escopo (NÃO TOCAR)
- Resolução automática (FLW-10)
- Governança (FLW-08 — só consome)
- Motor (FLW-03)

## Spec Técnica

### API — PATCH /admin/followup/gatilhos/:id/cancelar
```json
// Input
{ "motivo": "Conversei com cliente por telefone" }

// Response
{ "sucesso": true, "gatilho_id": "gat_001", "status": "cancelado" }
```

### Backend — cancelar.js
```js
async function cancelarGatilho(tenantId, gatilhoId, motivo) {
  const gatilho = await getGatilho(tenantId, gatilhoId)
  if (!gatilho) throw new NotFoundError('Gatilho não encontrado')
  if (gatilho.status !== 'ativo') throw new BadRequestError('Só pode cancelar gatilho ativo')
  
  await dynamo.update({
    TableName: TABLE,
    Key: { PK: gatilho.PK, SK: gatilho.SK },
    UpdateExpression: 'SET #status = :cancelado, cancelado_em = :agora, motivo_cancelamento = :motivo, GSI1SK = :gsi',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':cancelado': 'cancelado',
      ':agora': new Date().toISOString(),
      ':motivo': motivo || 'Cancelado manualmente pelo admin',
      ':gsi': `STATUS#cancelado#${hoje()}`
    }
  }).promise()
  
  return { sucesso: true, gatilho_id: gatilhoId, status: 'cancelado' }
}
```

### API — POST /admin/followup/silenciar/:clienteId
```json
// Input
{ "motivo": "Cliente pediu para não receber mensagens" }

// Response
{ "sucesso": true, "cliente_id": "cli_001", "silenciado": true }
```

### API — DELETE /admin/followup/silenciar/:clienteId
```json
// Response
{ "sucesso": true, "cliente_id": "cli_001", "silenciado": false }
```

### Entidade SILENCIADO
```json
{
  "PK": "TENANT#t123",
  "SK": "SILENCIADO#cli_001",
  "cliente_id": "cli_001",
  "cliente_nome": "Ana Carolina",
  "motivo": "Cliente pediu para não receber mensagens",
  "silenciado_em": "2026-07-17T10:00:00Z",
  "silenciado_por": "admin"
}
```

### Integração com Motor (FLW-03)
```js
// No motor de varredura, antes de processar:
async function clienteSilenciado(tenantId, clienteId) {
  const result = await dynamo.get({
    TableName: TABLE,
    Key: { PK: `TENANT#${tenantId}`, SK: `SILENCIADO#${clienteId}` }
  }).promise()
  return !!result.Item
}

// No processamento:
if (await clienteSilenciado(tenantId, clienteId)) continue // Skip
```

### Regras
- Cancelar: só gatilho ativo
- Cancelar: registra motivo + timestamp
- Silenciar: impede TODOS os follow-ups futuros para aquele cliente
- Silenciar: NÃO cancela gatilhos ativos (admin deve cancelar separadamente se quiser)
- Desilenciar: remove o registro
- Motor verifica silenciamento antes de despachar

## Critérios de Aceite
- [ ] Cancelar gatilho ativo funciona
- [ ] Não pode cancelar resolvido/esgotado
- [ ] Motivo registrado
- [ ] Silenciar cliente funciona
- [ ] Motor ignora clientes silenciados
- [ ] Desilenciar remove bloqueio
- [ ] Silenciar não cancela gatilhos existentes

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FLW-11: Cancelar + Silenciar.

1. Crie handlers/followup/cancelar.js: PATCH gatilho/:id/cancelar.
2. Crie handlers/followup/silenciar.js: POST + DELETE.
3. Entidade SILENCIADO no DynamoDB.
4. Motor verifica silenciamento antes de despachar.
5. Cancelar só ativo; registrar motivo.
6. SAM: 3 rotas.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
