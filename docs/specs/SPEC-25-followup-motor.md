# SPEC-25 — Follow-up: Motor de Réguas

| Campo | Valor |
|-------|-------|
| ID | GAP-11 / SPEC-25 |
| Tipo | Feature |
| Prioridade | P2 |
| Impacto | Alto |
| Esforço | Médio |

## CONTEXTO

§20 do MVP-1 define réguas de follow-up configuráveis com agendamento, escalonamento de canal e idempotência de disparo.

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/functions/followup/criar-regua.js` — POST /admin/reguas
- `src/functions/followup/listar-reguas.js` — GET /admin/reguas
- `src/functions/followup/update-regua.js` — PUT /admin/reguas/:id
- `src/functions/followup/processar-disparos.js` — EventBridge cron (diário)
- `template.yaml` — rotas + EventBridge rule + role

## FORA DE ESCOPO (NÃO TOCAR)

- Envio real de WhatsApp (§24)
- Envio real de email (usar SES placeholder)
- UI de configuração
- Qualquer outro arquivo

## SPEC TÉCNICA

### Modelo DynamoDB

```
Régua:    PK=TENANT#1, SK=REGUA#<ulid>
Disparo:  PK=TENANT#1, SK=DISPARO#<regua_id>#<seq>
```

Campos Régua: id, nome, gatilho (enum: orcamento_enviado|contrato_gerado|pagamento_atrasado|album_publicado), passos[{dias_apos, canal (email|whatsapp|in_app), template_msg}], ativo, created_at

Campos Disparo: id, regua_id, orcamento_id, passo_atual, proximo_disparo_em, status (pendente|disparado|cancelado), idempotency_key, created_at

### Fluxos

**Criar régua (admin):** CRUD padrão com validação dos passos.

**Agendar disparo:** Quando gatilho ocorre (ex: orçamento enviado), cria item DISPARO com passo_atual=0, proximo_disparo_em = now + passos[0].dias_apos.

**Processar disparos (cron diário):**
- Query: SK begins_with DISPARO AND proximo_disparo_em <= now AND status=pendente
- Para cada: envia via canal configurado (placeholder), avança passo_atual
- Se último passo: status → disparado
- Idempotência: conditional write com idempotency_key

### IAM

Role `FollowupFunctionRole`:
- DynamoDB: PutItem, GetItem, UpdateItem, Query

## CRITÉRIOS DE ACEITE

1. CRUD de réguas funciona
2. Disparo agendado quando gatilho ocorre
3. Cron processa disparos pendentes
4. Idempotência impede disparo duplicado
5. Último passo marca como concluído

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar motor de Follow-up conforme spec SPEC-25.
Handlers em src/functions/followup/, réguas configuráveis,
cron diário para processamento, idempotência.

Alterar SOMENTE:
- template.yaml (rotas, EventBridge rule, role)
- src/functions/followup/*.js (4 handlers)

NÃO refatorar, renomear ou mexer em mais nada.
```
