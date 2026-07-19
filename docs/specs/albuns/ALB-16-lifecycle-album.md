# ALB-16 — Lifecycle / Máquina de Estados do Álbum

## META
| Campo | Valor |
|---|---|
| ID | ALB-16 |
| Tipo | Feature |
| Prioridade | P0 |
| Impacto | Alto — toda spec ALB-* depende implicitamente destes estados |
| Esforço | Baixo-médio |
| Fonte | §11 Camada 1 + MODELO-DE-DADOS.md |

## CONTEXTO
O §11 define que o álbum tem status `rascunho → publicado`, pré-geração do orçamento, avulso, e exclusão por cancelamento. A atualização 05/07/2026 adiciona expiração e reativação. O §28 (NFS-e) exige um marco "entregue". Nenhuma spec ALB-* formaliza a máquina de estados completa — cada uma assume transições ad hoc.

## ESCOPO

### Máquina de estados (campo `status` da entidade ALBUM)

```
                ┌─────────────────────────────────────────┐
                │                                         ▼
 [pré-gerado] → RASCUNHO → PUBLICADO → ENTREGUE → EXPIRADO
                    │            │          │           │
                    ▼            ▼          ▼           ▼
               CANCELADO    (volta p/   (irreversível) REATIVADO
              (soft-delete)  rascunho                  (→ ENTREGUE)
                             = despublicar)
```

**Estados:**
- `rascunho` — criado (pré-gerado do orçamento ou avulso). Invisível ao cliente.
- `publicado` — visível ao cliente. Requer trava dos 70% (ALB-04).
- `entregue` — ADM marca explicitamente. Gatilho para NFS-e (§28) e Feedback (§12).
- `expirado` — `expira_em` atingido. Bloqueia visualização/download conforme config global.
- `reativado` — prorrogação paga aceita (volta para `entregue` com novo `expira_em`).
- `cancelado` — soft-delete. Só possível em `rascunho`.

### Transições e regras

| De | Para | Gatilho | Pré-condição |
|---|---|---|---|
| — | rascunho | Orçamento aceito (pré-geração) OU criação avulsa | — |
| rascunho | publicado | ADM clica "Publicar" | % pago ≥ 70% (trava ALB-04) |
| rascunho | cancelado | Orçamento cancelado OU ADM exclui | Nenhuma foto publicada |
| publicado | rascunho | ADM "Despublicar" | — |
| publicado | entregue | ADM marca "Entregue" | Pelo menos 1 galeria com foto |
| entregue | expirado | EventBridge Scheduler (`expira_em` atingido) | — |
| expirado | reativado→entregue | Pagamento de prorrogação confirmado | Faixa escolhida + pagamento OK |

### Pré-geração do orçamento
- Ao aceitar orçamento: Lambda `album-pre-generate` cria ALBUM com:
  - `titulo` = nome do evento (do orçamento)
  - `data_evento` = data do item escolhido
  - `cliente` = cliente do orçamento
  - `orcamento_id` = FK
  - `status` = `rascunho`
  - `expira_em` = `disponivel_em` + prazo padrão global

### Cancelamento
- Cancelar orçamento → se álbum vinculado está em `rascunho` → status = `cancelado`
- Se álbum já está `publicado` ou posterior → NÃO cancela (conflito, requer ação manual)

### Expiração (EventBridge Scheduler)
- Cron diário verifica `expira_em < now()` AND `status = entregue`
- Transiciona para `expirado`
- Dispara notificação (§23) nos canais configurados (dias de antecedência: 7/3/1)

### DynamoDB — atributos adicionados ao ALBUM
```
status_historico[]   — array de {status, timestamp, actor} para auditoria
entregue_em          — timestamp (gatilho NFS-e)
reativado_ate        — novo expira_em após prorrogação
```

### Lambda functions
- `album-pre-generate` — trigger: evento `orcamento.aceito`
- `album-status-transition` — valida pré-condições, persiste, emite evento
- `album-expiration-checker` — scheduled (EventBridge, 1x/dia)

### API Gateway (HTTP API)
- `PATCH /albums/{id}/status` — body: `{ "to": "publicado"|"entregue"|"cancelado" }`
- Validação no handler (não no API Gateway) — lógica de negócio não fica no gateway

### IAM
- Role `album-status-transition-role`: DynamoDB PutItem/UpdateItem apenas na tabela ALBUM, condição `tenant_id` = contexto
- Role `album-expiration-checker-role`: DynamoDB Query (GSI status+expira_em), UpdateItem

## FORA DE ESCOPO (NÃO TOCAR)
- ALB-04 (trava 70%) — apenas CONSOME o resultado; não reimplementa
- ALB-10/ALB-11 (expiração/prorrogação config) — esta spec usa as regras, não as define
- Serviço de mídia (ALB-03) — independente
- Upload (ALB-02) — independente
- Notificações (§23) — esta spec EMITE eventos; a entrega é de §23

## CRITÉRIOS DE ACEITE
1. Álbum criado automaticamente ao aceitar orçamento com `status=rascunho`
2. Publicar bloqueado se % pago < 70%
3. Cancelar orçamento com álbum `rascunho` → status vira `cancelado`
4. Cancelar orçamento com álbum `publicado` → erro com mensagem
5. `entregue_em` preenchido habilita botão NFS-e (§28)
6. Expiração automática 1x/dia funciona sem intervenção
7. Reativação por prorrogação paga reseta `expira_em`

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar a máquina de estados do álbum (spec ALB-16).

Criar/alterar SOMENTE:
- src/functions/album/pre-generate/handler.js (Lambda: ouve evento orcamento.aceito, cria ALBUM em rascunho)
- src/functions/album/status-transition/handler.js (Lambda: PATCH valida pré-condição e transiciona)
- src/functions/album/expiration-checker/handler.js (Lambda scheduled: query GSI, transiciona expirados)
- template.yaml (3 funções + roles IAM mínimas + EventBridge schedule + GSI status-expira)

Regras:
- Status: rascunho|publicado|entregue|expirado|cancelado
- Publicar exige % pago ≥ 70 (chamar GET /orcamentos/{id}/percentual-pago)
- Cancelar só funciona em rascunho
- Expiração: query GSI onde status=entregue AND expira_em < now()
- Cada transição emite evento no formato { source: "album", detail-type: "album.status.changed", detail: { album_id, from, to, timestamp } }
- IAM: uma role por função, sem '*', recurso exato
- Não refatorar, renomear ou mexer em mais nada
```
