# SPEC-22 — Central do Cliente (Portal)

| Campo | Valor |
|-------|-------|
| ID | GAP-10 / SPEC-22 |
| Tipo | Feature |
| Prioridade | P1 |
| Impacto | Alto |
| Esforço | Médio |

## CONTEXTO

§13 do MVP-1 define portal logado do cliente: lista de eventos, detalhes (proposta, contrato, pagamento, álbum), e "meus dados" com validações reais. É o front-end API do lado cliente consumindo as APIs dos módulos anteriores.

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/functions/portal/meus-eventos.js` — GET /client/eventos
- `src/functions/portal/evento-detalhe.js` — GET /client/eventos/:id
- `src/functions/portal/meus-dados-get.js` — GET /client/meus-dados
- `src/functions/portal/meus-dados-update.js` — PUT /client/meus-dados
- `template.yaml` — rotas + role

## FORA DE ESCOPO (NÃO TOCAR)

- Upload de foto de perfil (mídia)
- Aceite de contrato (já no módulo contrato SPEC-19)
- Aceite de orçamento (já no módulo orçamento SPEC-17)
- Feedback (módulo próprio futuro)
- Busca real de CEP (integração externa futura)
- Qualquer arquivo não listado

## SPEC TÉCNICA

### Modelo DynamoDB

Dados do cliente:
```
PK: TENANT#1
SK: CLIENTE#<cognito_sub>
```
Campos: nome, email, telefone, cpf_cnpj, endereco, created_at, updated_at

Consultas via GSI2:
```
GSI2PK: CLIENTE#<cognito_sub>
GSI2SK: ORC#<created_at>
```

### Handlers

**Meus eventos (GET /client/eventos):**
- Extrai cognito_sub do token
- Query GSI2: GSI2PK=CLIENTE#<sub>
- Retorna lista: [{id, titulo, data_evento, status_cliente, tipo_evento}]
- Status traduzido via `mapStatusCliente()`
- Query params: `?status=confirmado`, `?historico=true` (inclui expirado/recusado)

**Evento detalhe (GET /client/eventos/:id):**
- Valida que orçamento pertence ao cliente (cliente_id = sub)
- BatchGetItem: orçamento + contrato + cobranças + álbum
- Retorna objeto consolidado com status traduzidos
- Cobranças: não expõe campos internos, só { numero, valor, vencimento, status, meio }

**Meus dados GET:**
- Lê item CLIENTE#<sub>
- Retorna dados cadastrais

**Meus dados PUT:**
- Validações:
  - CPF: 11 dígitos + verificador (algoritmo mod 11)
  - CNPJ: 14 dígitos + verificador (incluir novo formato alfanumérico 2026)
  - Telefone: 10-11 dígitos
  - CEP: regex /^\d{5}-?\d{3}$/
- Atualiza DynamoDB (item CLIENTE)
- Atualiza Cognito custom attributes (name, phone_number)
- Retorna 200 + dados atualizados
- Erro de validação → 400 com campo + mensagem

### IAM

Role `PortalFunctionRole`:
- DynamoDB: GetItem, UpdateItem, Query, BatchGetItem — tabela principal + GSI2
- Cognito: AdminUpdateUserAttributes — apenas no User Pool específico

## CRITÉRIOS DE ACEITE

1. Cliente vê apenas seus próprios eventos (filtro por sub)
2. Status traduzido (nunca vê status interno)
3. Validação de CPF com dígito verificador funciona
4. CNPJ alfanumérico (formato 2026) aceito
5. Rota protegida por grupo `cliente`
6. Admin NÃO acessa rotas `/client/*`
7. Detalhe retorna dados consolidados sem expor campos internos

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar Central do Cliente conforme spec SPEC-22.
Handlers em src/functions/portal/, GSI2 para busca por cliente,
batch get de entidades relacionadas, validação de CPF/CNPJ com
dígito verificador (incluir formato alfanumérico 2026), mapeamento de status.

Alterar SOMENTE:
- template.yaml (rotas /client/* e role)
- src/functions/portal/*.js (4 handlers)

NÃO refatorar, renomear ou mexer em mais nada.
```
