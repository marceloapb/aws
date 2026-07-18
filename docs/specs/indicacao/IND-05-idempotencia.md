# IND-05 — Idempotência na Confirmação

**ID:** IND-05  
**TIPO:** Correção  
**PRIORIDADE:** P1  
**IMPACTO:** Médio | **ESFORÇO:** Baixo  

---

## Contexto

EventBridge entrega at-least-once. Se o evento `ContratoAssinado` for processado 2x, o incremento seria aplicado 2x, corrompendo o desconto acumulado.

---

## Escopo

- `src/handlers/indicacoes/confirmarIndicacao.mjs`

## Fora de Escopo (NÃO TOCAR)

- Outros handlers.
- Lógica de emissão do evento (§8).

---

## Spec Técnica

### Mecanismo: condition expression no UpdateItem

```javascript
// Só atualiza se status atual é 'pendente'
const updateParams = {
  Key: { PK: `CLIENTE#${indicadorId}`, SK: `INDICACAO#${dataCadastro}#${indicadoId}` },
  UpdateExpression: 'SET #status = :confirmada, data_confirmacao = :now',
  ConditionExpression: '#status = :pendente',
  ExpressionAttributeNames: { '#status': 'status' },
  ExpressionAttributeValues: {
    ':confirmada': 'confirmada',
    ':pendente': 'pendente',
    ':now': timestamp
  }
};
```

Se `ConditionalCheckFailedException` → indicação já confirmada → log + return (sem erro).

### Para o incremento no indicador

```javascript
const incrementParams = {
  Key: { PK: `CLIENTE#${indicadorId}`, SK: `CLIENTE#${indicadorId}` },
  UpdateExpression: 'SET desconto_indicacao_acumulado = desconto_indicacao_acumulado + :inc',
  ConditionExpression: 'desconto_indicacao_acumulado < :teto',
  ExpressionAttributeValues: {
    ':inc': incremento,
    ':teto': teto_indicacao
  }
};
```

Se `ConditionalCheckFailedException` no incremento → já no teto → log + continue (indicação conta como confirmada, mas % não sobe).

---

## Critérios de Aceite

1. Processar o mesmo evento 2x não incrementa o desconto 2x.
2. Indicação já confirmada gera log INFO, não erro.
3. Indicador no teto: indicação confirma mas % não sobe.

---

## Prompt para o Kiro

```
No handler `src/handlers/indicacoes/confirmarIndicacao.mjs`, use ConditionExpression
`#status = :pendente` no UpdateItem da Indicacao e ConditionExpression
`desconto_indicacao_acumulado < :teto` no incremento do Cliente. Capture
ConditionalCheckFailedException em ambos e faça early return com log INFO.
Altere SOMENTE este arquivo.
```
