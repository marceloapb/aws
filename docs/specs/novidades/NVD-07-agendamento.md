# NVD-07 — Agendamento de Publicação

**TIPO:** Feature  
**PRIORIDADE:** P3  
**IMPACTO:** Baixo — conforto, não bloqueante  
**ESFORÇO:** Baixo  

## CONTEXTO

O ADM escreve o post e agenda a publicação para uma data/hora futura. No horário agendado, o sistema muda automaticamente o status de `rascunho` para `publicado`. Usa EventBridge Scheduler (one-time schedule) para disparar uma Lambda no momento certo.

## ESCOPO

- `src/functions/novidades/agendar.js` — handler POST (cria schedule)
- `src/functions/novidades/publicar-agendado.js` — handler invocado pelo EventBridge
- `template.yaml` — 2 Lambdas, 1 rota, IAM para scheduler

## FORA DE ESCOPO (NÃO TOCAR)

- CRUD de posts (NVD-01) — já feito
- Editor (NVD-03)
- Qualquer outro módulo

## SPEC TÉCNICA

**Fluxo:**
1. ADM define data/hora de publicação no editor.
2. Frontend chama `POST /admin/novidades/{id}/agendar` com `{ publicar_em: "2026-08-15T10:00:00-03:00" }`.
3. Handler valida: post existe, status=rascunho, data no futuro.
4. Cria EventBridge Scheduler (one-time) com:
   - Schedule: `at(2026-08-15T13:00:00)` (UTC).
   - Target: Lambda `publicar-agendado` com payload `{ post_id }`.
   - Nome: `nvd-publish-${post_id}` (permite cancelamento).
5. Grava no post: `agendado_para` (ISO), `schedule_name`.
6. Retorna 200.

**Lambda publicar-agendado:**
1. Recebe `{ post_id }` do EventBridge.
2. GetItem: confirma post existe e status=rascunho.
3. UpdateItem: `status=publicado`, `publicado_em=now()`.
4. Limpa `agendado_para` e `schedule_name`.

**Cancelamento:**
- Se o ADM editar o agendamento ou publicar manualmente, a Lambda `agendar.js` deleta o schedule anterior (via `DeleteSchedule`) antes de criar o novo (ou apenas no PUT se status muda para publicado).

**Atributos adicionais no DynamoDB:**
- `agendado_para` (ISO) — exibido no admin.
- `schedule_name` — referência para cancelar.

**IAM:**
- agendar: `scheduler:CreateSchedule`, `scheduler:DeleteSchedule` + `dynamodb:UpdateItem` + `iam:PassRole` (para o scheduler invocar a Lambda).
- publicar-agendado: `dynamodb:GetItem`, `dynamodb:UpdateItem`.

**Scheduler execution role:** role dedicada com `lambda:InvokeFunction` apenas na Lambda publicar-agendado.

## CRITÉRIOS DE ACEITE

1. Agendar cria schedule no EventBridge para hora UTC correta.
2. No horário, post muda de rascunho para publicado automaticamente.
3. Re-agendar cancela o schedule anterior.
4. Publicar manualmente cancela agendamento existente.
5. Data no passado retorna 400.
6. Post já publicado retorna 409.

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente o agendamento de publicação de posts conforme spec NVD-07. Crie src/functions/novidades/agendar.js (POST /admin/novidades/{id}/agendar, valida post rascunho + data futura, cria EventBridge Scheduler one-time nome=nvd-publish-${post_id}, target=Lambda publicar-agendado com payload {post_id}, grava agendado_para e schedule_name no DDB) e src/functions/novidades/publicar-agendado.js (invocado pelo scheduler, GetItem confirma rascunho, UpdateItem status=publicado + publicado_em=now, limpa agendado_para). Cancelamento: DeleteSchedule ao re-agendar ou publicar manual. No template.yaml: 2 Lambdas arm64, 1 rota POST com Cognito JWT admin, IAM scheduler:Create/DeleteSchedule + lambda:InvokeFunction na role do scheduler. ALTERE SOMENTE os arquivos listados; não refatore, renomeie ou mexa em mais nada.
```
