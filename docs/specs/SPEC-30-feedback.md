# SPEC-30 — Feedback

| Campo | Valor |
|-------|-------|
| ID | GAP-09 / SPEC-30 |
| Tipo | Feature |
| Prioridade | P3 |
| Impacto | Médio |
| Esforço | Baixo |

## CONTEXTO

§12 do MVP-1 define módulo de feedback: cliente avalia após entrega, admin aprova para exibição pública (double-gate).

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/functions/feedback/solicitar.js` — POST /admin/feedbacks/solicitar
- `src/functions/feedback/responder.js` — POST /client/feedbacks/:id/responder
- `src/functions/feedback/listar.js` — GET /admin/feedbacks
- `src/functions/feedback/aprovar.js` — PUT /admin/feedbacks/:id/aprovar
- `src/functions/feedback/listar-publicos.js` — GET /public/feedbacks
- `template.yaml` — rotas + role

## FORA DE ESCOPO (NÃO TOCAR)

- Widget de frontend
- Integração com Google Reviews
- Qualquer outro arquivo

## SPEC TÉCNICA

### Modelo DynamoDB

```
PK: TENANT#1, SK: FEEDBACK#<ulid>
```

Campos: id, orcamento_id, cliente_id, nota (1-5), texto, respondido_em, aprovado (bool), aprovado_em, publico (bool), created_at

### Fluxos

**Solicitar (admin):** Cria item status aguardando, dispara notificação ao cliente.

**Responder (cliente):** Preenche nota + texto, marca respondido_em.

**Aprovar (admin):** Marca aprovado=true, publico=true.

**Listar públicos:** FilterExpression publico=true. Rota sem auth.

### IAM

Role `FeedbackFunctionRole`:
- DynamoDB: PutItem, GetItem, UpdateItem, Query

## CRITÉRIOS DE ACEITE

1. Solicitação cria feedback pendente
2. Cliente responde com nota e texto
3. Admin aprova para publicação
4. Endpoint público retorna apenas aprovados
5. Double-gate: precisa resposta + aprovação

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar módulo Feedback conforme spec SPEC-30.
Handlers em src/functions/feedback/, double-gate (resposta + aprovação),
endpoint público para vitrine.

Alterar SOMENTE:
- template.yaml (rotas, role)
- src/functions/feedback/*.js (5 handlers)

NÃO refatorar, renomear ou mexer em mais nada.
```
