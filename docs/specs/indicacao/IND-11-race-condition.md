# IND-11 — Race Condition First-Touch

**ID:** IND-11  
**TIPO:** Correção  
**PRIORIDADE:** P2  
**IMPACTO:** Baixo | **ESFORÇO:** Baixo  

---

## Contexto

Se um indicado clica 2 links de indicadores diferentes quase simultaneamente e faz 2 cadastros, first-touch pode ser corrompido (ambos gravam `indicado_por`).

---

## Escopo

- `src/handlers/clientes/cadastroLeve.mjs`

## Fora de Escopo (NÃO TOCAR)

- Lógica de cadastro existente (email/whatsapp check).
- Outros handlers.

---

## Spec Técnica

### Cenário

Indicado recebe link de A e B. Clica A, inicia cadastro. Antes de completar, abre link B em outra aba.

### Mitigação

O cadastro é atômico — PutItem com `ConditionExpression: attribute_not_exists(PK)`. Apenas o primeiro request a completar o PutItem vence. O segundo recebe `ConditionalCheckFailedException` → retorna erro "conta já existe" (que é o comportamento correto do §25).

### Mitigação adicional para `indicado_por`

Gravar `indicado_por` no mesmo PutItem do cadastro (TransactWriteItems não necessário — é um único item).

```javascript
// Dentro do PutItem do cadastro
Item: {
  PK: `CLIENTE#${novoId}`,
  SK: `CLIENTE#${novoId}`,
  // ...demais campos...
  indicado_por: indicadorId || null,  // vem do ref validado
}
ConditionExpression: 'attribute_not_exists(PK)'
```

### Resultado

First-touch é garantido pela atomicidade do PutItem. Não há race condition porque o item não existe antes do cadastro.

---

## Critérios de Aceite

1. `indicado_por` é gravado atomicamente no PutItem do cadastro.
2. Segundo cadastro com mesmo email/whatsapp falha com "conta já existe".
3. Não é possível sobrescrever `indicado_por` após criação.

---

## Prompt para o Kiro

```
No handler `src/handlers/clientes/cadastroLeve.mjs`, garanta que o campo `indicado_por`
é incluído no PutItem principal (mesmo que null). O PutItem já deve ter
ConditionExpression attribute_not_exists(PK). Não use TransactWriteItems — a
atomicidade do PutItem é suficiente. Altere SOMENTE este arquivo.
```
