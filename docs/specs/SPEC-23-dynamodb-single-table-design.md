# SPEC-23 — DynamoDB Single-Table Design (Fundação)

| Campo | Valor |
|-------|-------|
| ID | GAP-01 / SPEC-23 |
| Tipo | Readequação |
| Prioridade | P0 |
| Impacto | Crítico — sem isso nada roda |
| Esforço | Médio |

## CONTEXTO

O MODELO-DE-DADOS.md do sistema-mbf define ~40 entidades modeladas para relacional. A decisão de migrar para DynamoDB (SPEC-01) requer um design de single-table com access patterns definidos. Todas as specs P1 (SPEC-14 a SPEC-22) dependem desta fundação.

## ESCOPO (ARQUIVOS E RECURSOS)

- `docs/dynamodb-design.md` — documento de referência com tabela de PK/SK/GSIs
- `template.yaml` — recurso DynamoDB Table com GSIs
- `src/lib/db.js` — util de acesso ao DynamoDB (DocumentClient wrapper)
- `src/lib/keys.js` — funções helper para montar PK/SK

## FORA DE ESCOPO (NÃO TOCAR)

- Migração de dados existentes (se houver)
- Scripts de seed
- Qualquer handler de negócio
- Qualquer outro arquivo não listado

## SPEC TÉCNICA

### Tabela Principal

```yaml
TableName: mbf-main
BillingMode: PAY_PER_REQUEST
KeySchema:
  - AttributeName: PK (String)
  - AttributeName: SK (String)
```

### GSIs

```yaml
GSI1:
  PK: GSI1PK (String)
  SK: GSI1SK (String)
  Projeção: ALL
  Uso: Catálogo por tipo, listar entidades transversais

GSI2:
  PK: GSI2PK (String)
  SK: GSI2SK (String)
  Projeção: ALL
  Uso: Busca por cliente (Central do Cliente)
```

### Mapa de Entidades (PK/SK)

| Entidade | PK | SK | GSI1PK | GSI1SK | GSI2PK | GSI2SK |
|----------|----|----|--------|--------|--------|--------|
| Config | TENANT#<id> | CONFIG | — | — | — | — |
| Cliente | TENANT#<id> | CLIENTE#<sub> | — | — | — | — |
| Item Catálogo | TENANT#<id> | ITEM#<ulid> | TENANT#<id>|CATALOGO | TIPO#<tipo>#<nome> | — | — |
| Pacote | TENANT#<id> | PACOTE#<ulid> | TENANT#<id>|CATALOGO | PACOTE#<nome> | — | — |
| Categoria | TENANT#<id> | CAT#<ulid> | — | — | — | — |
| Orçamento | TENANT#<id> | ORC#<ulid> | TENANT#<id>|ORC | STATUS#<status>#<created> | CLIENTE#<sub> | ORC#<created> |
| Opção | TENANT#<id> | ORC#<orc_id>#OPT#<n> | — | — | — | — |
| Item Opção | TENANT#<id> | ORC#<orc_id>#OPT#<n>#ITEM#<m> | — | — | — | — |
| Agenda | TENANT#<id> | AGENDA#<data_iso>#<ulid> | — | — | — | — |
| Contrato | TENANT#<id> | CONTRATO#<ulid> | — | — | — | — |
| Modelo Contrato | TENANT#<id> | MODELO_CONTRATO#<ulid> | — | — | — | — |
| Cobrança | TENANT#<id> | COBRANCA#<orc_id>#<numero> | — | — | — | — |
| Álbum | TENANT#<id> | ALBUM#<ulid> | — | — | CLIENTE#<sub> | ALBUM#<created> |
| Galeria | TENANT#<id> | GALERIA#<album_id>#<ordem> | — | — | — | — |
| Foto | TENANT#<id> | FOTO#<galeria_id>#<ordem> | — | — | — | — |
| Feedback | TENANT#<id> | FEEDBACK#<ulid> | — | — | — | — |
| Follow-up Régua | TENANT#<id> | REGUA#<ulid> | — | — | — | — |
| Follow-up Disparo | TENANT#<id> | DISPARO#<regua_id>#<seq> | — | — | — | — |
| Webhook Event | TENANT#<id> | WEBHOOK#<ulid> | — | — | — | — |
| Despesa | TENANT#<id> | DESPESA#<ulid> | — | — | — | — |
| Notificação | TENANT#<id> | NOTIF#<ulid> | — | — | CLIENTE#<sub> | NOTIF#<created> |
| Sync Log | TENANT#<id> | SYNCLOG#<timestamp>#<id> | — | — | — | — |
| Inventário | TENANT#<id> | EQUIP#<ulid> | — | — | — | — |
| Checklist | TENANT#<id> | CHECKLIST#<ulid> | — | — | — | — |
| NF | TENANT#<id> | NF#<ulid> | — | — | — | — |

### src/lib/keys.js

```javascript
const TENANT = (id = '1') => `TENANT#${id}`;
const CONFIG = () => 'CONFIG';
const ITEM = (id) => `ITEM#${id}`;
const PACOTE = (id) => `PACOTE#${id}`;
const CAT = (id) => `CAT#${id}`;
const ORC = (id) => `ORC#${id}`;
const AGENDA = (data, id) => `AGENDA#${data}#${id}`;
const CONTRATO = (id) => `CONTRATO#${id}`;
const COBRANCA = (orcId, num) => `COBRANCA#${orcId}#${num}`;
const ALBUM = (id) => `ALBUM#${id}`;
// ... etc
module.exports = { TENANT, CONFIG, ITEM, PACOTE, CAT, ORC, AGENDA, CONTRATO, COBRANCA, ALBUM };
```

### src/lib/db.js

```javascript
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, DeleteCommand, BatchGetCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
const TABLE = process.env.TABLE_NAME || 'mbf-main';

module.exports = { ddb, TABLE, GetCommand, PutCommand, UpdateCommand, QueryCommand, DeleteCommand, BatchGetCommand, BatchWriteCommand };
```

## CRITÉRIOS DE ACEITE

1. template.yaml declara tabela mbf-main com 2 GSIs
2. src/lib/keys.js exporta funções para todas as entidades do mapa
3. src/lib/db.js exporta client configurado
4. docs/dynamodb-design.md documenta todos os access patterns
5. Nenhum handler de negócio é criado nesta spec

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar fundação DynamoDB single-table conforme spec SPEC-23.
Criar tabela mbf-main com 2 GSIs no template.yaml,
utilitários src/lib/keys.js e src/lib/db.js,
e documentação docs/dynamodb-design.md.

Alterar SOMENTE:
- template.yaml (recurso DynamoDB Table + GSIs)
- src/lib/keys.js
- src/lib/db.js
- docs/dynamodb-design.md

NÃO criar handlers. NÃO refatorar, renomear ou mexer em mais nada.
```
