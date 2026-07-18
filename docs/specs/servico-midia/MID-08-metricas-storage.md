# MID-08 — Métricas de Storage (por álbum/tenant)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | MID-08 |
| **Tipo** | Feature |
| **Prioridade** | P2 |
| **Impacto** | Médio — visibilidade de consumo e custo |
| **Esforço** | Baixo |

## Contexto
Admin precisa saber: quanto cada álbum/evento ocupa, quanto o tenant total ocupa, quantas fotos, e projeção de custo. Calculado a partir dos metadados no DynamoDB (não precisa listar S3).

## Escopo
- **Lambda:** `getStorageMetrics` — agrega métricas do DynamoDB
- **API Gateway:** `GET /admin/metrics/storage?scope=tenant` e `GET /admin/metrics/storage?scope=album&id=ev123`
- **Métricas:** total de fotos, tamanho total (original+web+thumb), por contexto, por evento

## Fora de Escopo (NÃO TOCAR)
- Custo real AWS (vem do Cost Explorer, não daqui)
- Métricas de bandwidth/CDN
- Dashboard visual (frontend consome e mostra)

## Spec Técnica

### Lambda getStorageMetrics
- Auth: JWT admin
- Scopes:
  - `tenant`: total geral do tenant
  - `album`: por evento/álbum específico
  - `contexto`: breakdown por tipo (álbum, portfólio, novidades, perfil)

### Response (scope=tenant)
```json
{
  "tenant_id": "1",
  "total_fotos": 12500,
  "total_size_bytes": 185000000000,
  "total_size_human": "185 GB",
  "breakdown_contexto": [
    { "contexto": "album", "fotos": 11800, "size_bytes": 170000000000 },
    { "contexto": "portfolio", "fotos": 450, "size_bytes": 12000000000 },
    { "contexto": "novidades", "fotos": 200, "size_bytes": 2500000000 },
    { "contexto": "perfil", "fotos": 50, "size_bytes": 500000000 }
  ],
  "storage_class": {
    "standard": "120 GB",
    "glacier": "65 GB"
  }
}
```

### Response (scope=album&id=ev123)
```json
{
  "evento_id": "ev123",
  "total_fotos": 487,
  "total_size_bytes": 7500000000,
  "total_size_human": "7.5 GB",
  "versoes": {
    "original": "6.2 GB",
    "web": "1.1 GB",
    "thumb": "0.2 GB"
  }
}
```

### Query
- Usa aggregation no DynamoDB: query GSI-MEDIA-CONTEXTO + SUM nos atributos de size
- Cache: resultado cacheia 5min (CloudFront ou in-memory)

## Critérios de Aceite
- Métricas retornam em <3s (mesmo com 12k+ fotos)
- Breakdown por contexto correto
- Size humano formatado (GB, MB)
- Scope album retorna apenas fotos do evento solicitado
- Admin-only (403 se cliente tentar)

## Prompt Pronto para o Kiro CLI
```
Implemente a spec MID-08 (Métricas de Storage por álbum/tenant).

Crie:
1. src/functions/media/getStorageMetrics/index.mjs — agrega DynamoDB, retorna métricas
2. Rota GET /admin/metrics/storage no template.yaml (query params: scope, id)

Scopes: tenant (total geral), album (por evento), contexto (breakdown).
Aggregation: SUM dos campos de size no DynamoDB. Cache 5min.
Formata size humano (GB/MB).

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
