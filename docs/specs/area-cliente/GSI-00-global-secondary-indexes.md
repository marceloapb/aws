# SPEC GSI-00 — Global Secondary Indexes (Fundação)

**ID:** GSI-00  
**TIPO:** Fundação / Infraestrutura  
**TÍTULO:** Definição canônica dos GSIs da single-table  
**PRIORIDADE:** P0 (bloqueante — todas as specs P0/P1 dependem)  
**IMPACTO:** Crítico — habilita todos os access patterns cross-entidade  
**ESFORÇO:** Baixo (somente IaC, zero código aplicativo)

---

## CONTEXTO

A tabela DynamoDB (`MbfTable`) usa single-table design (SPEC-23). A chave primária (PK/SK) resolve queries por tenant+entidade. Porém, as specs ARC-01→10, CLI-04→15 e FIN-01 exigem queries **inversas** (por clientId, por status, por data, por contrato). Sem GSIs, essas queries requerem Scan — inaceitável em custo e performance.

O SPEC-06 já referencia GSI1 no template SAM. O SPEC-01 define GSI2. Esta spec **consolida e documenta** ambos como fonte da verdade.

---

## DESIGN DOS GSIs

### Tabela Principal (já existe)
```
PK  (String) — Partition Key
SK  (String) — Sort Key
```

### GSI1 — "Status & Tipo" (queries por tenant filtrando status/tipo/data)
```
GSI1PK (String) — Partition Key
GSI1SK (String) — Sort Key
Projeção: ALL
```

### GSI2 — "Cross-Entity" (queries por clientId, contractId, galleryId)
```
GSI2PK (String) — Partition Key
GSI2SK (String) — Sort Key
Projeção: ALL
```

---

## MAPA DE ACCESS PATTERNS

| Módulo | Query | GSI | GSI PK | GSI SK (begins_with) |
|--------|-------|-----|--------|---------------------|
| Contratos — listar por status | GET /contracts?status= | GSI1 | `TENANT#<tenantId>` | `CONTRACT_STATUS#<status>#` |
| Contratos — do cliente | GET /clients/{id}/contracts | GSI2 | `CLIENT#<clientId>` | `CONTRACT#` |
| Orçamentos — listar por status | GET /quotes?status= | GSI1 | `TENANT#<tenantId>` | `QUOTE_STATUS#<status>#` |
| Orçamentos — do cliente | GET /clients/{id}/quotes | GSI2 | `CLIENT#<clientId>` | `QUOTE#` |
| Pagamentos — do contrato | GET /payments?contractId= | GSI1 | `CONTRACT#<contractId>` | `PAYMENT#` |
| Pagamentos — vencimentos por período | GET /payments?dueDateFrom= | GSI2 | `TENANT#<tenantId>` | `PAYMENT_DUE#<dueDate>` |
| Eventos — por data | GET /events?dateFrom= | GSI1 | `TENANT#<tenantId>` | `EVENT_DATE#<date>` |
| Eventos — do cliente | GET /clients/{id}/events | GSI2 | `CLIENT#<clientId>` | `EVENT#` |
| Álbuns — por status | listagem admin | GSI1 | `TENANT#<tenantId>` | `ALBUM#STATUS#<status>#` |
| Cobranças — por orçamento | parcelas vinculadas | GSI2 | `ORCAMENTO#<quoteId>` | `COBRANCA#` |
| Follow-up — regras ativas | scheduler diário | GSI1 | `TENANT#<tenantId>` | `FOLLOWUP_RULE#` |
| Seleção — por galeria | seleção de fotos | GSI2 | `GALLERY#<galleryId>` | `SELECTION#` |
| Aditivos — por contrato | listagem aditivos | GSI2 | `CONTRACT#<contractId>` | `ADDENDUM#` |
| Área Cliente — dashboard | ARC-03 | GSI2 | `CLIENT#<clientId>` | (multi-query) |

---

## ESCOPO (arquivos a alterar)

- `infra/cloudformation.yml` — adicionar/confirmar AttributeDefinitions + GSI1 + GSI2

---

## FORA DE ESCOPO (NÃO TOCAR)

- Código de Lambdas (nenhuma alteração)
- Dados existentes na tabela (GSIs em tabela on-demand indexam automaticamente)
- Criação de novos módulos
- Template SAM (se usar SAM em vez de CF, ajustar path — mesmo conteúdo)

---

## SPEC TÉCNICA — CloudFormation/SAM snippet

```yaml
Resources:
  MbfTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub "${AWS::StackName}-table"
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
        - AttributeName: GSI1PK
          AttributeType: S
        - AttributeName: GSI1SK
          AttributeType: S
        - AttributeName: GSI2PK
          AttributeType: S
        - AttributeName: GSI2SK
          AttributeType: S
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
      GlobalSecondaryIndexes:
        - IndexName: GSI1
          KeySchema:
            - AttributeName: GSI1PK
              KeyType: HASH
            - AttributeName: GSI1SK
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
        - IndexName: GSI2
          KeySchema:
            - AttributeName: GSI2PK
              KeyType: HASH
            - AttributeName: GSI2SK
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true
      Tags:
        - Key: Project
          Value: mbf-systems
```

---

## REGRAS DE USO (para todas as specs subsequentes)

1. **Toda entidade DEVE popular GSI1PK/GSI1SK** no PutItem — mesmo que hoje não tenha query, para não bloquear futuras.
2. **GSI2PK/GSI2SK são opcionais** — popular apenas quando a entidade precisa de lookup cross-entity (por clientId, contractId, galleryId, etc).
3. **Convenção de GSI1SK:** `<ENTITY_TYPE>#<FILTER>#<SORT_VALUE>` — ex: `CONTRACT_STATUS#accepted#2026-07-21`
4. **Convenção de GSI2SK:** `<ENTITY_TYPE>#<SORT_VALUE>` — ex: `CONTRACT#2026-07-21`
5. **Nunca usar Scan.** Se um access pattern não é coberto por PK/SK ou GSI1/GSI2, revise o modelo antes de implementar.

---

## CRITÉRIOS DE ACEITE

1. `sam deploy` ou `aws cloudformation deploy` cria tabela com 2 GSIs
2. GSI1 e GSI2 aparecem no console DynamoDB com status ACTIVE
3. Items existentes na tabela (clients, galleries, photos) continuam acessíveis
4. Custo adicional = zero (on-demand cobra por uso, GSI sem dados não cobra storage)

---

## PROMPT PRONTO PARA O KIRO CLI

```
Atualize infra/cloudformation.yml (ou template.yaml se usar SAM) para que a tabela DynamoDB MbfTable tenha:
- BillingMode PAY_PER_REQUEST
- AttributeDefinitions: PK (S), SK (S), GSI1PK (S), GSI1SK (S), GSI2PK (S), GSI2SK (S)
- KeySchema: PK (HASH), SK (RANGE)
- GlobalSecondaryIndexes:
  1. GSI1 — GSI1PK (HASH), GSI1SK (RANGE), Projection ALL
  2. GSI2 — GSI2PK (HASH), GSI2SK (RANGE), Projection ALL
- PointInTimeRecoveryEnabled: true
Se os GSIs já existem parcialmente, apenas complete o que falta. Altere SOMENTE infra/cloudformation.yml (ou template.yaml). Não toque em nenhum código Lambda, não renomeie recursos existentes, não altere nenhum outro arquivo.
```
