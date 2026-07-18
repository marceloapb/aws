# FLW-10: Resolução Automática de Gatilho (Eventos de Domínio)

## Metadados
- **ID:** FLW-10
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** FLW-02

## Contexto
Quando o cliente responde (aceita orçamento, assina contrato, paga parcela, dá feedback), o gatilho correspondente deve ser automaticamente resolvido para parar os follow-ups. Usa EventBridge para capturar eventos de resolução dos domínios.

## Escopo
- `apps/backend/src/listeners/followup/resolverGatilho.js` — NOVO
- EventBridge: regras de resolução
- Atualizar entidade GATILHO_INERCIA

## Fora de Escopo (NÃO TOCAR)
- Criação de gatilho (FLW-02)
- Motor (FLW-03)
- Cancelamento manual (FLW-11)

## Spec Técnica

### Eventos de Resolução
| Evento | Source | Ação |
|---|---|---|
| orcamento.aceito | mbf.orcamentos | Resolver gatilho do orçamento |
| orcamento.recusado | mbf.orcamentos | Resolver gatilho (motivo: recusado) |
| contrato.assinado | mbf.contratos | Resolver gatilho do contrato |
| pagamento.confirmado | mbf.pagamentos | Resolver gatilho do pagamento |
| feedback.respondido | mbf.feedbacks | Resolver gatilho do feedback |
| album.baixado | mbf.albuns | Resolver gatilho do álbum |

### Listener — resolverGatilho.js
```js
async function handler(event) {
  const { tenantId, recurso_id, motivo } = event.detail
  
  // Buscar gatilho ativo para este recurso
  const gatilho = await getGatilhoAtivoPorRecurso(tenantId, recurso_id)
  if (!gatilho) return // Sem gatilho ativo (normal)
  
  // Atualizar status
  await dynamo.update({
    TableName: TABLE,
    Key: { PK: gatilho.PK, SK: gatilho.SK },
    UpdateExpression: 'SET #status = :resolvido, resolvido_em = :agora, motivo_resolucao = :motivo, GSI1SK = :gsi',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':resolvido': 'resolvido',
      ':agora': new Date().toISOString(),
      ':motivo': motivo || event['detail-type'],
      ':gsi': `STATUS#resolvido#${hoje()}`
    }
  }).promise()
  
  console.log(`Gatilho ${gatilho.id} resolvido: ${motivo}`)
}
```

### EventBridge Rule
```yaml
ResolverGatilhoRule:
  Type: AWS::Events::Rule
  Properties:
    Name: followup-resolver-gatilho
    EventPattern:
      source:
        - mbf.orcamentos
        - mbf.contratos
        - mbf.pagamentos
        - mbf.feedbacks
        - mbf.albuns
      detail-type:
        - orcamento.aceito
        - orcamento.recusado
        - contrato.assinado
        - pagamento.confirmado
        - feedback.respondido
        - album.baixado
    Targets:
      - Arn: !GetAtt ResolverGatilhoFunction.Arn
        Id: ResolverGatilhoTarget
```

### Regras
- Resolução é idempotente (se já resolvido: no-op)
- Registrar motivo de resolução
- Atualizar GSI1SK para query por status
- Log estruturado com gatilho_id e motivo
- Se gatilho não encontrado: silencioso (evento pode chegar sem follow-up ativo)

## Critérios de Aceite
- [ ] Evento de resolução fecha gatilho
- [ ] Idempotente (resolver 2x = ok)
- [ ] Motivo registrado
- [ ] GSI1 atualizado
- [ ] Se sem gatilho: silencioso
- [ ] 6 tipos de evento funcionam

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FLW-10: Resolução Automática.

1. Crie listeners/followup/resolverGatilho.js.
2. EventBridge rule para 6 eventos de resolução.
3. Atualizar status='resolvido', motivo, GSI1SK.
4. Idempotente: se já resolvido, no-op.
5. Se sem gatilho ativo: silencioso.
6. SAM: Lambda + EventBridge rule.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
