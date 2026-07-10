# SPEC-17 — Orçamento: Fluxo Completo

| Campo | Valor |
|-------|-------|
| ID | GAP-03 / SPEC-17 |
| Tipo | Feature |
| Prioridade | P1 |
| Impacto | Alto |
| Esforço | Alto |

## CONTEXTO

§6 do MVP-1 define o fluxo: solicitar → precificar → montar opções → enviar → aceitar/recusar. É o eixo central do sistema — sem orçamento não existe agenda, contrato nem pagamento.

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/functions/orcamento/solicitar.js` — POST /client/orcamentos
- `src/functions/orcamento/listar.js` — GET /admin/orcamentos
- `src/functions/orcamento/get.js` — GET /admin/orcamentos/:id
- `src/functions/orcamento/montar-opcoes.js` — PUT /admin/orcamentos/:id/opcoes
- `src/functions/orcamento/enviar.js` — POST /admin/orcamentos/:id/enviar
- `src/functions/orcamento/aceitar.js` — POST /client/orcamentos/:id/aceitar
- `src/functions/orcamento/recusar.js` — POST /client/orcamentos/:id/recusar
- `src/functions/orcamento/expirar.js` — handler EventBridge (cron diário)
- `template.yaml` — rotas + roles + EventBridge rule

## FORA DE ESCOPO (NÃO TOCAR)

- Edição pós-envio (§16 backlog)
- Cálculo Price com juros (fica em util separada, spec futura)
- Notificação ao admin/cliente (§23)
- Qualquer arquivo não listado

## SPEC TÉCNICA

### Modelo DynamoDB

```
Orçamento:     PK=TENANT#1, SK=ORC#<ulid>
Opção:         PK=TENANT#1, SK=ORC#<orc_id>#OPT#<n>
Item da Opção: PK=TENANT#1, SK=ORC#<orc_id>#OPT#<n>#ITEM#<m>

GSI2PK: CLIENTE#<cognito_sub>
GSI2SK: ORC#<created_at>
```

### Máquina de Status

```
orcando → aguardando_precificacao → enviado → confirmado
                                           → recusado
                                           → expirado
                                           → standby
```

### Fluxos

**Solicitar (cliente):**
- Cria orçamento status=`orcando`
- Campos: tipo_evento, data_evento, local, observacoes, cliente_id (do token)
- valor_sugerido calculado no backend (soma itens do catálogo se informados)

**Montar opções (admin):**
- Adiciona N opções com itens e valores finais
- Status → `aguardando_precificacao`

**Enviar (admin):**
- Status → `enviado`
- Congela valores: snapshot de config + itens no campo `snapshot_config`
- Registra `enviado_em` + `expira_em` (enviado_em + config.prazos.reserva_temporaria_dias)
- Dispara reserva temporária de agenda (invoca handler agenda via evento)

**Aceitar (cliente):**
- Valida data livre (checa se reserva ainda existe)
- Status → `confirmado`
- Congela forma_pagamento escolhida
- Libera datas de opções descartadas
- Se data já ocupada → status `standby`

**Expirar (EventBridge cron diário):**
- Query: status=`enviado` AND expira_em < now
- Para cada: status → `expirado`, libera reservas de agenda

### Status interno vs cliente

Util `mapStatusCliente(statusInterno)` retorna:
- orcando → "Em análise"
- aguardando_precificacao → "Em análise"
- enviado → "Aguardando sua resposta"
- confirmado → "Confirmado"
- recusado → "Recusado"
- expirado → "Expirado"
- standby → "Em espera"

### IAM

Role `OrcamentoFunctionRole`:
- `dynamodb:PutItem`, `dynamodb:GetItem`, `dynamodb:UpdateItem`, `dynamodb:Query` — tabela principal + GSI2
- `dynamodb:BatchGetItem` — para buscar itens do catálogo

## CRITÉRIOS DE ACEITE

1. Fluxo completo solicitar → aceitar funciona
2. Valores congelados no envio não mudam se config muda depois
3. Status correto em cada etapa da máquina
4. Expiração automática libera datas de agenda
5. Cliente só vê status traduzido
6. Rotas admin protegidas; rotas client protegidas por grupo respectivo

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar fluxo completo de Orçamento conforme spec SPEC-17.
Handlers em src/functions/orcamento/, modelo DynamoDB com opções e itens aninhados,
cálculo de valor sugerido a partir do catálogo, congelamento no envio, máquina de status.

Alterar SOMENTE:
- template.yaml (rotas, roles e EventBridge rule)
- src/functions/orcamento/*.js (8 handlers)

NÃO refatorar, renomear ou mexer em mais nada.
```
