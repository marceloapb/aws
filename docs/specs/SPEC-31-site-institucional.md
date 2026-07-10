# SPEC-31 — Site Institucional / Portfólio Público

| Campo | Valor |
|-------|-------|
| ID | GAP-16 / SPEC-31 |
| Tipo | Feature |
| Prioridade | P3 |
| Impacto | Médio |
| Esforço | Médio |

## CONTEXTO

§25 e §15 do MVP-1 definem site institucional com portfólio público, páginas de serviço e SEO básico.

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/functions/site/get-portfolio.js` — GET /public/portfolio
- `src/functions/site/get-servicos.js` — GET /public/servicos
- `src/functions/site/get-sobre.js` — GET /public/sobre
- `src/functions/site/get-depoimentos.js` — GET /public/depoimentos (reutiliza feedbacks aprovados)
- `template.yaml` — rotas públicas + role

## FORA DE ESCOPO (NÃO TOCAR)

- SSR/SSG do frontend (decisão de framework)
- CMS completo
- Blog
- Qualquer outro arquivo

## SPEC TÉCNICA

### Modelo DynamoDB

```
Portfólio: PK=TENANT#1, SK=PORTFOLIO#<ulid>
```
Campos: id, titulo, descricao, categoria, imagens[{s3_key, ordem}], destaque (bool), created_at

### Handlers

Todos públicos (sem auth), retornam dados para o frontend renderizar:
- Portfolio: query items com destaque=true, ordenado por created_at DESC
- Serviços: query itens do catálogo com exibir_ao_cliente=true
- Sobre: lê config.dados_empresa
- Depoimentos: reutiliza query de feedbacks públicos

### IAM

Role `SiteFunctionRole`:
- DynamoDB: Query, GetItem (read-only)

## CRITÉRIOS DE ACEITE

1. Endpoints públicos sem auth
2. Portfolio retorna apenas itens destaque
3. Serviços retorna catálogo público
4. Depoimentos retorna feedbacks aprovados
5. Sobre retorna dados da empresa

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar APIs do Site Institucional conforme spec SPEC-31.
Handlers em src/functions/site/, endpoints públicos read-only.

Alterar SOMENTE:
- template.yaml (rotas públicas, role)
- src/functions/site/*.js (4 handlers)

NÃO refatorar, renomear ou mexer em mais nada.
```
