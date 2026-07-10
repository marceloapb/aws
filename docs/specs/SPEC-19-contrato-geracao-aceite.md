# SPEC-19 — Contrato: Geração + Aceite Eletrônico

| Campo | Valor |
|-------|-------|
| ID | GAP-05 / SPEC-19 |
| Tipo | Feature |
| Prioridade | P1 |
| Impacto | Alto |
| Esforço | Médio |

## CONTEXTO

§8 do MVP-1 define contrato como preenchimento automático de modelo (template) + aceite eletrônico do cliente. Um contrato por orçamento. Imutável após assinatura.

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/functions/contrato/gerar.js` — POST /admin/contratos
- `src/functions/contrato/get.js` — GET /admin/contratos/:id (e /client/contratos/:id)
- `src/functions/contrato/aceitar.js` — POST /client/contratos/:id/aceitar
- `src/functions/contrato/listar-modelos.js` — GET /admin/modelos-contrato
- `src/functions/contrato/criar-modelo.js` — POST /admin/modelos-contrato
- `src/functions/contrato/update-modelo.js` — PUT /admin/modelos-contrato/:id
- `template.yaml` — rotas + roles

## FORA DE ESCOPO (NÃO TOCAR)

- Aditivos (§26 Renegociação)
- Certificado digital externo
- Testemunhas
- Multi-contrato por orçamento
- Qualquer arquivo não listado

## SPEC TÉCNICA

### Modelo DynamoDB

```
Contrato:       PK=TENANT#1, SK=CONTRATO#<ulid>
Modelo:         PK=TENANT#1, SK=MODELO_CONTRATO#<ulid>
```

Campos Contrato: id, orcamento_id, modelo_id, conteudo_html, status (gerado|assinado|expirado), gerado_em, expira_em, aceite_em, aceite_cliente_id, aceite_ip, pdf_s3_key, imutavel, created_at

Campos Modelo: id, nome, tipo_evento (casamento|aniversario|ensaio|corporativo|geral), corpo_template (HTML com {{variaveis}}), campos_manuais[], ativo, created_at, updated_at

### Fluxos

**Gerar (admin):**
- Input: orcamento_id + modelo_id (ou auto-detect por tipo_evento)
- Busca orçamento confirmado + dados do cliente + config
- Substitui variáveis: `{{nome_cliente}}`, `{{cpf}}`, `{{valor_total}}`, `{{forma_pagamento}}`, `{{data_evento}}`, `{{local}}`, `{{itens_descricao}}`
- Cria CONTRATO status=`gerado`, expira_em = now + config.prazos.contrato_expiracao_dias
- Gera PDF via html → pdf (usando @sparticuz/chromium Lambda layer)
- Salva PDF em S3: `contratos/{tenant}/{contrato_id}.pdf`

**Aceitar (cliente):**
- Valida: status=`gerado` AND expira_em > now
- Registra: aceite_em, aceite_cliente_id (do token), aceite_ip (x-forwarded-for)
- Status → `assinado`
- Marca `imutavel = true`
- Conditional write: `status = :gerado AND imutavel <> :true`

**Expiração:**
- Mesma rule EventBridge do orçamento
- Query: status=`gerado` AND expira_em < now → status=`expirado`

### IAM

Role `ContratoFunctionRole`:
- DynamoDB: PutItem, GetItem, UpdateItem, Query
- S3: PutObject em `contratos/*`
- S3: GetObject em `contratos/*` (para gerar URL assinada)

## CRITÉRIOS DE ACEITE

1. Contrato gerado com variáveis preenchidas corretamente
2. PDF gerado e acessível via presigned URL
3. Aceite registra IP + timestamp
4. Contrato assinado não pode ser editado (conditional write impede)
5. Expiração automática funciona
6. Modelo CRUD funciona (criar, editar, listar, desativar)

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar módulo Contrato conforme spec SPEC-19.
Handlers em src/functions/contrato/, substituição de variáveis em template HTML,
aceite eletrônico com IP, geração PDF com @sparticuz/chromium Lambda layer,
DynamoDB com flag imutavel + conditional write.

Alterar SOMENTE:
- template.yaml (rotas, roles, layer reference)
- src/functions/contrato/*.js (6 handlers)

NÃO refatorar, renomear ou mexer em mais nada.
```
