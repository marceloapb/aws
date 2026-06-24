# SPEC-01 — Eliminar PocketBase/SQLite → DynamoDB Single-Table

**ID:** 01  
**TIPO:** Readequação  
**PRIORIDADE:** P0  
**IMPACTO:** Crítico | **ESFORÇO:** Alto  

## CONTEXTO

Toda persistência depende de `config/pocketbase.js` que conecta a um PocketBase remoto (SQLite). Lambda tem filesystem efêmero — SQLite local é impossível. PocketBase remoto exige servidor always-on rodando em algum lugar, anulando o benefício serverless.

## ESCOPO

- `apps/api/src/config/pocketbase.js` → substituir por `config/dynamodb.js`
- Todas as rotas que fazem `pb.collection(...)` → refatorar para DynamoDB DocumentClient
- Criar tabela DynamoDB single-table no `template.yaml`
- `docs/dicionario-de-dados.md` → mapear entidades para PK/SK/GSIs

## FORA DE ESCOPO (NÃO TOCAR)

- Frontend (`apps/web/`)
- Adapters de pagamento (mantêm interface, só muda persistência)
- Scripts de deploy existentes

## SPEC TÉCNICA

- Tabela: `HorizonsTable` — BillingMode: PAY_PER_REQUEST
- PK: `PK` (String), SK: `SK` (String)
- GSI1: `GSI1PK` / `GSI1SK` — para queries por cliente, data, status
- GSI2: `GSI2PK` / `GSI2SK` — para queries por fotógrafo/agenda
- Entidades mapeadas: Fotografo, Cliente, Album, Foto, Contrato, Orcamento, Cobranca, Agenda, Equipamento, Configuracao, Pendencia
- Padrão de acesso:
  - Fotografo: `PK=TENANT#<tenantId>` `SK=FOTOGRAFO#<id>`
  - Cliente: `PK=TENANT#<tenantId>` `SK=CLIENTE#<id>`
  - Album: `PK=CLIENTE#<clienteId>` `SK=ALBUM#<id>`
  - Foto: `PK=ALBUM#<albumId>` `SK=FOTO#<id>`
  - Contrato: `PK=CLIENTE#<clienteId>` `SK=CONTRATO#<id>`
  - Orcamento: `PK=CLIENTE#<clienteId>` `SK=ORCAMENTO#<id>`
  - Cobranca: `PK=CONTRATO#<contratoId>` `SK=COBRANCA#<id>`
  - Agenda: `PK=TENANT#<tenantId>` `SK=AGENDA#<data>#<id>`
  - Equipamento: `PK=TENANT#<tenantId>` `SK=EQUIP#<id>`
  - Configuracao: `PK=TENANT#<tenantId>` `SK=CONFIG#<chave>`
  - Pendencia: `PK=TENANT#<tenantId>` `SK=PENDENCIA#<id>`

## CRITÉRIOS DE ACEITE

- Zero referências a PocketBase no código
- Todas as operações CRUD funcionando via DynamoDB
- Testes manuais passando para cada entidade

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente a migração de PocketBase para DynamoDB single-table design.

1. Crie `apps/api/src/config/dynamodb.js` — instancia DynamoDBDocumentClient com região via env var `AWS_REGION`.
2. Delete `apps/api/src/config/pocketbase.js`.
3. Em cada arquivo de rota (`apps/api/src/routes/*.js`) e service (`apps/api/src/services/*.js`), substitua todas as chamadas `pb.collection(...)` por operações DynamoDB (GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand).
4. Use single-table design com PK/SK conforme mapeamento:
   - Fotografo: PK=`TENANT#<tenantId>` SK=`FOTOGRAFO#<id>`
   - Cliente: PK=`TENANT#<tenantId>` SK=`CLIENTE#<id>`
   - Album: PK=`CLIENTE#<clienteId>` SK=`ALBUM#<id>`
   - Foto: PK=`ALBUM#<albumId>` SK=`FOTO#<id>`
   - Contrato: PK=`CLIENTE#<clienteId>` SK=`CONTRATO#<id>`
   - Orcamento: PK=`CLIENTE#<clienteId>` SK=`ORCAMENTO#<id>`
   - Cobranca: PK=`CONTRATO#<contratoId>` SK=`COBRANCA#<id>`
   - Agenda: PK=`TENANT#<tenantId>` SK=`AGENDA#<data>#<id>`
   - Equipamento: PK=`TENANT#<tenantId>` SK=`EQUIP#<id>`
   - Configuracao: PK=`TENANT#<tenantId>` SK=`CONFIG#<chave>`
   - Pendencia: PK=`TENANT#<tenantId>` SK=`PENDENCIA#<id>`
5. GSI1PK/GSI1SK para queries por status+data. GSI2PK/GSI2SK para queries por fotógrafo+data.
6. Nome da tabela via env var `DYNAMODB_TABLE_NAME`.
7. Remova `pocketbase` do `package.json`.

Altere SOMENTE: `apps/api/src/config/pocketbase.js` (deletar), `apps/api/src/config/dynamodb.js` (criar), `apps/api/src/routes/*.js`, `apps/api/src/services/contratoService.js`, `apps/api/package.json`. Não refatore, renomeie ou mexa em mais nada.
```
