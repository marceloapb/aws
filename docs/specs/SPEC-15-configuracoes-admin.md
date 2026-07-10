# SPEC-15 — Configurações do ADM (CRUD)

| Campo | Valor |
|-------|-------|
| ID | GAP-06 / SPEC-15 |
| Tipo | Feature |
| Prioridade | P1 |
| Impacto | Médio |
| Esforço | Baixo |

## CONTEXTO

§9 do MVP-1 define dados da empresa, prazos e condições de pagamento como configuração editável pelo ADM. É pré-requisito de Catálogo, Orçamento e Contrato — sem config, não há valores para congelar no momento do envio do orçamento.

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/functions/config/get-config.js` — GET /admin/config
- `src/functions/config/update-config.js` — PUT /admin/config
- `template.yaml` — rotas HTTP API + role IAM
- DynamoDB: item único `PK=TENANT#1, SK=CONFIG`

## FORA DE ESCOPO (NÃO TOCAR)

- Upload de logo (depende do serviço de mídia)
- Dados bancários (§21 Gateway)
- Multi-tenant real (futuro)
- Qualquer outro arquivo não listado

## SPEC TÉCNICA

### Modelo DynamoDB

Item único por tenant:

```json
{
  "PK": "TENANT#1",
  "SK": "CONFIG",
  "dados_empresa": {
    "nome": "string (obrigatório)",
    "cnpj": "string (obrigatório)",
    "endereco": { "cep": "string (obrigatório)", "rua": "string", "numero": "string", "cidade": "string", "uf": "string" },
    "telefone": "string",
    "email": "string"
  },
  "prazos": {
    "reserva_temporaria_dias": 7,
    "contrato_expiracao_dias": 5,
    "album_expiracao_dias": 90
  },
  "condicoes_pagamento": {
    "desconto_avista_padrao": 10,
    "desconto_avista_max": 15,
    "max_parcelas_sem_juros": 6,
    "valor_min_parcela": 200,
    "taxa_juros_mensal": 2.5,
    "meios_aceitos": ["pix", "cartao", "transf", "boleto", "dinheiro"]
  },
  "updated_at": "ISO8601"
}
```

### Handlers

**GET /admin/config:**
- Lê item PK=TENANT#1, SK=CONFIG
- Retorna 200 + JSON
- Se não existe, retorna 200 + objeto com defaults

**PUT /admin/config:**
- Valida schema com ajv (campos obrigatórios: nome, cnpj, endereco.cep)
- Grava com UpdateExpression
- Retorna 200 + item atualizado
- Campo inválido → 400 com detalhes

### IAM

Role `ConfigFunctionRole`:
- `dynamodb:GetItem` — tabela principal, condition key `PK = TENANT#1`
- `dynamodb:UpdateItem` — tabela principal, condition key `PK = TENANT#1`

## CRITÉRIOS DE ACEITE

1. PUT salva dados corretamente
2. GET retorna os dados salvos
3. Campo obrigatório vazio → 400
4. Rota protegida por grupo `admin` (authorizer SPEC-14)
5. Cliente tentando acessar → 403

## PROMPT PRONTO PARA O KIRO CLI

```
Criar CRUD de Configurações do ADM conforme spec SPEC-15.
Handlers GET e PUT em src/functions/config/,
item DynamoDB PK=TENANT#1 SK=CONFIG, validação ajv, role mínima.

Alterar SOMENTE:
- template.yaml (rotas e role)
- src/functions/config/get-config.js
- src/functions/config/update-config.js

NÃO refatorar, renomear ou mexer em mais nada.
```
