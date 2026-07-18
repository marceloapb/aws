# PTF-05 — API Pública de Leitura (Categorias + Fotos)

**TIPO:** Feature  
**PRIORIDADE:** P1  
**IMPACTO:** Alto — alimenta o site público  
**ESFORÇO:** Baixo  

## CONTEXTO

O site público consome uma API sem autenticação para exibir o portfólio. Retorna apenas categorias marcadas como `visivel=true` e fotos com `status=pronta`, ordenadas. Sem dados internos, sem IDs sensíveis.

## ESCOPO

- `src/functions/portfolio/publico/listar-portfolio.js` — handler GET
- `template.yaml` — 1 Lambda, 1 rota pública (sem authorizer)

## FORA DE ESCOPO (NÃO TOCAR)

- Rotas admin (PTF-01 a 04)
- CloudFront (PTF-06)
- Qualquer outro módulo

## SPEC TÉCNICA

**Rota:** `GET /public/portfolio` — sem authorizer (público).

**Lógica:**
1. Query DynamoDB: PK=`TENANT#1`, SK begins_with `CATPORTFOLIO#`. Filtra `visivel=true`.
2. Para cada categoria, query fotos: SK begins_with `FOTOPORT#<catId>#`, filtra `status=pronta`.
3. Monta resposta:
```json
{
  "categorias": [
    {
      "id": "...",
      "nome": "Casamento",
      "texto": "Descrição...",
      "ordem": 0,
      "fotos": [
        { "url_web": "...", "url_thumb": "...", "ordem": 0 }
      ]
    }
  ]
}
```
4. URLs de foto: prefixo do CloudFront (env var `CDN_BASE_URL`) + path relativo.
5. Cache-Control: `public, max-age=300` (5 min).

**Performance:** se número de categorias pequeno (≤10), queries em paralelo (Promise.all). Se crescer, considerar materializar no futuro.

**IAM:** `dynamodb:Query` — tabela MbfTable, PK restrito.

**Resposta:** só dados públicos. Sem `id` interno das fotos (só URL). Sem `tenant_id`.

## CRITÉRIOS DE ACEITE

1. Retorna só categorias visíveis, ordenadas.
2. Retorna só fotos prontas (ignora processando/erro).
3. URLs com prefixo do CDN.
4. Sem autenticação necessária.
5. Categorias ocultas não aparecem.
6. Resposta em < 500ms para até 10 categorias × 50 fotos cada.

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente a API pública de leitura do portfólio conforme spec PTF-05. Crie src/functions/portfolio/publico/listar-portfolio.js. Rota GET /public/portfolio SEM authorizer. Lógica: Query categorias (visivel=true, ordenadas) → para cada, query fotos (status=pronta, ordenadas) → monta JSON com urls usando env CDN_BASE_URL como prefixo. Resposta sem IDs internos sensíveis. Header Cache-Control public max-age=300. No template.yaml: 1 Lambda arm64, rota pública, policy dynamodb:Query na MbfTable. ALTERE SOMENTE os arquivos listados; não refatore, renomeie ou mexa em mais nada.
```
