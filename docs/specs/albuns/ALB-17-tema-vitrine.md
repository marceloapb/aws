# ALB-17 — Tema e Personalização da Vitrine

## META
| Campo | Valor |
|---|---|
| ID | ALB-17 |
| Tipo | Feature |
| Prioridade | P1 |
| Impacto | Alto — diferencial visual do produto |
| Esforço | Médio |
| Fonte | §11 + protótipo `album-tema-vitrine-prototipo.jsx` |

## CONTEXTO
O protótipo `album-tema-vitrine-prototipo.jsx` está validado: editor de tema com capa, cores, layouts de galeria, fontes, animações e prévia ao vivo. Personalização por álbum com logo sempre presente (posição configurável). Nenhuma spec ALB-* cobre a implementação backend/frontend disso.

## ESCOPO

### Entidade TEMA_ALBUM (nova, vinculada 1:1 ao ALBUM)
```
TEMA_ALBUM
  album_id        PK (mesmo do ALBUM — single-table, SK = TEMA#)
  layout          enum: grid | masonry | slideshow | filmstrip
  cor_primaria    hex (ex: #EA580C)
  cor_fundo       hex (ex: #0b0a09)
  cor_texto       hex (ex: #FFFFFF)
  fonte_titulo    enum: serif | sans | display | handwritten
  fonte_corpo     enum: sans | serif
  animacao_foto   enum: none | fade | slide | zoom
  logo_posicao    enum: top-left | top-center | top-right | hidden
  capa_tipo       enum: foto | cor_solida | gradiente
  capa_foto_id    FK → FOTO (nullable, se capa_tipo = foto)
  capa_cor        hex (se capa_tipo = cor_solida)
  capa_gradiente  string (se capa_tipo = gradiente, formato CSS)
  titulo_capa     string (override do titulo do album, opcional)
  subtitulo_capa  string (opcional)
```

### Comportamento
- Ao criar álbum: TEMA_ALBUM criado com **defaults do tenant** (se configurados) ou defaults do sistema
- ADM edita via editor visual (protótipo já validado)
- Prévia ao vivo: frontend-only (SSR da vitrine com dados do tema em tempo real)
- Logo vem de Configurações (§9, `ConfigSite.logo_url`) — tema só define a POSIÇÃO
- Tema aplicado na vitrine do cliente (`album-vitrine-cliente-prototipo.jsx`)

### Lambda functions
- `album-tema-get` — GET /albums/{id}/tema → retorna TEMA_ALBUM
- `album-tema-update` — PUT /albums/{id}/tema → valida enum, persiste

### API Gateway (HTTP API)
- `GET /albums/{id}/tema` — público (cliente acessa para renderizar vitrine)
- `PUT /albums/{id}/tema` — autenticado ADM

### DynamoDB
- Single-table: PK = `ALBUM#{album_id}`, SK = `TEMA#`
- Sem GSI adicional (sempre acesso por album_id)

### IAM
- `album-tema-get-role`: DynamoDB GetItem na tabela principal, condição PK
- `album-tema-update-role`: DynamoDB PutItem na tabela principal, condição PK + auth context

### SAM (template.yaml)
- 2 funções Lambda
- 2 rotas HTTP API
- 2 roles IAM

## FORA DE ESCOPO (NÃO TOCAR)
- Upload de logo (vive em §9 Configurações)
- Layout da vitrine completa (ALB-12 lightbox + grid) — tema só injeta CSS vars
- Geração de thumbnail da capa (ALB-03 serviço de mídia)
- Editor de tema no frontend (protótipo existe, implementação frontend é task separada)

## CRITÉRIOS DE ACEITE
1. Criar álbum gera TEMA_ALBUM com defaults
2. PUT atualiza apenas campos válidos (enum validation)
3. GET público retorna tema para renderização da vitrine
4. Logo position = hidden não renderiza logo na vitrine
5. Cores aplicadas como CSS custom properties no frontend
6. Mudança de tema reflete imediatamente na vitrine (sem cache longo no GET público)

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar backend do tema da vitrine do álbum (spec ALB-17).

Criar/alterar SOMENTE:
- src/functions/album/tema-get/handler.js (Lambda: GET público, retorna TEMA_ALBUM)
- src/functions/album/tema-update/handler.js (Lambda: PUT autenticado, valida enums, persiste)
- template.yaml (2 funções + 2 rotas HTTP API + 2 roles IAM)

Regras:
- Single-table design: PK = ALBUM#{album_id}, SK = TEMA#
- Enums validados no handler: layout(grid|masonry|slideshow|filmstrip), fonte_titulo(serif|sans|display|handwritten), animacao_foto(none|fade|slide|zoom), logo_posicao(top-left|top-center|top-right|hidden), capa_tipo(foto|cor_solida|gradiente)
- GET é público (sem auth) — vitrine do cliente precisa acessar
- PUT exige token Cognito com role ADM
- Cache-Control no GET: max-age=60 (curto, tema muda com frequência durante edição)
- IAM: uma role por função, privilégio mínimo, recurso exato (ARN da tabela)
- Ao criar álbum (função album-pre-generate de ALB-16): adicionar PutItem para TEMA# com defaults
- Não refatorar, renomear ou mexer em mais nada
```
