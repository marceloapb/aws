# MID-07 — Lifecycle (Carência → Glacier → Exclusão)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | MID-07 |
| **Tipo** | Feature |
| **Prioridade** | P2 |
| **Impacto** | Médio — controle de custo a longo prazo |
| **Esforço** | Médio |

## Contexto
Fotos de álbum (privado) ocupam espaço e custam. Regra de negócio: após 90 dias da entrega, originais migram para Glacier (custo 80% menor). Após 1 ano, exclusão programada (configurável). Soft-deleted (MID-04) são excluídas após 30 dias.

## Escopo
- **S3 Lifecycle Rules:** transição Glacier + expiration
- **Lambda:** `applyLifecycleRules` — scheduled (EventBridge, 1x/dia) para processar mídias com soft-delete
- **DynamoDB:** atualiza status de mídia quando transiciona/exclui
- **Configurável:** dias de carência em ConfigSite (admin pode mudar)

## Fora de Escopo (NÃO TOCAR)
- Bucket público (portfólio/novidades ficam indefinidamente)
- Processamento (MID-03)
- Restauração de Glacier (feature futura manual)

## Spec Técnica

### S3 Lifecycle Rules (bucket privado)
```yaml
LifecycleConfiguration:
  Rules:
    - Id: originais-para-glacier
      Status: Enabled
      TagFilters:
        - Key: versao
          Value: original
      Transitions:
        - StorageClass: GLACIER_IR
          TransitionInDays: 90
    - Id: cleanup-deleted
      Status: Enabled
      TagFilters:
        - Key: status
          Value: deleted
      Expiration:
        Days: 30
    - Id: expiracao-final
      Status: Enabled
      Expiration:
        Days: 365
```

### Lambda applyLifecycleRules (diária)
- Trigger: EventBridge Schedule (rate: 1 day)
- Query DynamoDB: mídias com status=deleted e deleted_at < 30 dias atrás
- Para cada: aplica tag `status:deleted` no objeto S3 (trigger lifecycle rule)
- Atualiza DynamoDB: status = purged

### Tags S3
- `versao`: original | web | thumb
- `contexto`: album | portfolio | ...
- `status`: active | deleted

## Critérios de Aceite
- Originais do bucket privado migram para Glacier_IR após 90 dias
- Custo de storage reduz ~80% após transição
- Soft-deleted com tag aplicada são excluídos após 30 dias
- Mídias públicas NÃO são afetadas por lifecycle
- Lambda diária processa batch sem timeout (paginação)
- Admin pode consultar status (Glacier) via métricas (MID-08)

## Prompt Pronto para o Kiro CLI
```
Implemente a spec MID-07 (Lifecycle — Carência → Glacier → Exclusão).

Crie/modifique:
1. template.yaml — LifecycleConfiguration no MediaPrivateBucket (3 rules)
2. src/functions/media/applyLifecycleRules/index.mjs — scheduled, aplica tags S3 em soft-deleted
3. template.yaml — EventBridge Schedule (rate 1 day) trigger para applyLifecycleRules

Rules: originais→Glacier_IR 90d, deleted→expire 30d, tudo→expire 365d.
Tags S3: versao, contexto, status. Lambda diária com paginação.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
