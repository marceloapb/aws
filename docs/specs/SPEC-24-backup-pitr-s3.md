# SPEC-24 — Backup: DynamoDB PITR + S3 Lifecycle

| Campo | Valor |
|-------|-------|
| ID | GAP-20 / SPEC-24 |
| Tipo | Melhoria |
| Prioridade | P2 |
| Impacto | Alto |
| Esforço | Baixo |

## CONTEXTO

§29 do MVP-1 define backup de dados e mídias. DynamoDB tem PITR (Point-In-Time Recovery) nativo. S3 precisa de lifecycle rules para transição para Glacier e alerta de falha.

## ESCOPO (ARQUIVOS E RECURSOS)

- `template.yaml` — habilitar PITR na tabela + S3 lifecycle rules
- `src/functions/backup/verificar-status.js` — GET /admin/backup/status

## FORA DE ESCOPO (NÃO TOCAR)

- Export para outro account/region (DR completo)
- Backup de código (Git já faz)
- Qualquer outro arquivo

## SPEC TÉCNICA

### DynamoDB PITR

```yaml
PointInTimeRecoverySpecification:
  PointInTimeRecoveryEnabled: true
```

Permite restore para qualquer ponto nos últimos 35 dias.

### S3 Lifecycle Rules

```yaml
LifecycleConfiguration:
  Rules:
    - Id: TransitionToGlacier
      Status: Enabled
      Prefix: processed/
      Transitions:
        - TransitionInDays: 180
          StorageClass: GLACIER_IR
    - Id: DeleteExpiredUploads
      Status: Enabled
      Prefix: uploads/
      AbortIncompleteMultipartUpload:
        DaysAfterInitiation: 7
      Expiration:
        Days: 30
```

### Handler verificar-status

- Chama `DescribeTable` + `DescribeContinuousBackups` para verificar PITR ativo
- Retorna: `{ pitr_enabled, pitr_earliest_restore, s3_lifecycle_rules_count, last_verified }`

### IAM

Role `BackupStatusRole`:
- `dynamodb:DescribeTable`, `dynamodb:DescribeContinuousBackups`
- `s3:GetLifecycleConfiguration`

## CRITÉRIOS DE ACEITE

1. PITR habilitado na tabela principal
2. S3 lifecycle transiciona para Glacier IR após 180 dias
3. Uploads incompletos limpos após 7 dias
4. Handler retorna status correto

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar backup conforme spec SPEC-24.
Habilitar PITR no DynamoDB, adicionar lifecycle rules no S3,
criar handler de verificação de status.

Alterar SOMENTE:
- template.yaml (PITR + lifecycle)
- src/functions/backup/verificar-status.js

NÃO refatorar, renomear ou mexer em mais nada.
```
