# IND-12 — Regeneração/Desativação do Código

**ID:** IND-12  
**TIPO:** Melhoria  
**PRIORIDADE:** P3  
**IMPACTO:** Baixo | **ESFORÇO:** Baixo  

---

## Contexto

Se um código vazar ou o cliente quiser trocar, precisa poder regenerar. Se o ADM revogar, o código antigo deve ser desativado.

---

## Escopo

- `src/handlers/indicacoes/regenerarCodigo.mjs` (novo handler)
- `src/handlers/indicacoes/revogarIndicador.mjs` (desativar código na revogação)
- `template.yaml` (nova rota)

## Fora de Escopo (NÃO TOCAR)

- Indicações já feitas com o código antigo (permanecem válidas).
- Outros handlers.

---

## Spec Técnica

### Regeneração (pelo cliente)

- Nova rota: `POST /cliente/indicacoes/codigo/regenerar`
- Handler: desativa código atual (UpdateItem `ativo=false` no item REFCODE), gera novo nanoid(8), grava novo item.
- Código antigo para de funcionar (resolverCodigo checa `ativo=true`).
- Limite: 1 regeneração por semana (campo `ultima_regeneracao` no Cliente, condition expression).

### Desativação na revogação (pelo ADM)

- No `revogarIndicador.mjs`, após marcar `status_programa=revogado`, fazer UpdateItem `ativo=false` no REFCODE do indicador.
- Código revogado retorna `{ valido: false }` no resolverCodigo.

---

## Critérios de Aceite

1. Cliente pode regenerar código (máx 1x/semana).
2. Código antigo para de funcionar imediatamente.
3. Revogação pelo ADM desativa o código automaticamente.
4. Indicações feitas com código antigo permanecem (não retroage).

---

## Prompt para o Kiro

```
1) Crie handler `src/handlers/indicacoes/regenerarCodigo.mjs`: desativa código atual
(UpdateItem ativo=false no REFCODE), gera novo nanoid(8), grava novo item REFCODE.
Use ConditionExpression no Cliente para bloquear se ultima_regeneracao < 7 dias.
2) No `revogarIndicador.mjs`, adicione UpdateItem ativo=false no REFCODE do indicador.
3) Adicione rota POST /cliente/indicacoes/codigo/regenerar no template.yaml.
Altere SOMENTE esses 3 arquivos.
```
