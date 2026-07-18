# STP-04 — Página Portfólio (reusa §15)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | STP-04 |
| **Tipo** | Feature |
| **Prioridade** | P1 |
| **Impacto** | Alto — vitrine do trabalho, principal prova de competência |
| **Esforço** | Baixo (consome endpoints já existentes do PTF) |

## Contexto
A página Portfólio do site público consome os mesmos dados do módulo Portfólio (§15, specs PTF). Exibe grade de fotos com filtro por categoria. Fonte única — não duplica dados.

## Escopo
- **Frontend:** `PortfolioPage.jsx` dentro do SiteLayout
- **Consome:** `GET /public/portfolio/categorias` e `GET /public/portfolio/categorias/:id/fotos` (já existem nas specs PTF)
- **Filtro por categoria:** tabs/botões no topo, troca sem reload
- **Grade de fotos:** thumbnails responsivas, lightbox ao clicar (amplia versão web)
- **Apenas categorias visíveis** (campo `visivel = true`)

## Fora de Escopo (NÃO TOCAR)
- Backend do Portfólio (specs PTF-01 a PTF-07) — já existe
- Upload de fotos
- Admin do portfólio
- Download de alta resolução (não existe no portfólio, só thumb+web)

## Spec Técnica

### Estrutura da Página
```
<PortfolioPage>
  <CategoryFilter>
    - Botões/tabs com nome das categorias visíveis
    - "Todas" como opção default
    - Ordenados pelo campo `ordem`
  </CategoryFilter>
  <PhotoGrid>
    - Thumbnails em grade responsiva (3 cols desktop, 2 tablet, 1 mobile)
    - Lazy loading (intersection observer)
    - Ao clicar: lightbox com versão web (url_web)
  </PhotoGrid>
  <Lightbox>
    - Overlay escuro, foto centralizada, setas prev/next, ESC fecha
  </Lightbox>
</PortfolioPage>
```

### Consumo de API
- `GET /public/portfolio/categorias` → lista categorias visíveis com ordem
- `GET /public/portfolio/categorias/:id/fotos` → fotos da categoria (url_web, url_thumb, ordem)
- Cache no frontend: categorias cacheia até refresh; fotos por categoria on-demand

## Critérios de Aceite
- Categorias ocultas (visivel=false) não aparecem
- Filtro troca fotos sem reload de página
- Lightbox abre/fecha com animação
- Lazy loading: fotos abaixo do fold carregam ao scroll
- Responsivo: grade adapta colunas por breakpoint

## Prompt Pronto para o Kiro CLI
```
Implemente a spec STP-04 (Página Portfólio do site público).

Crie:
1. src/pages/public/PortfolioPage.jsx — filtro por categoria + grade + lightbox

Consome APIs já existentes: GET /public/portfolio/categorias e GET /public/portfolio/categorias/:id/fotos.
Grade: 3 cols desktop, 2 tablet, 1 mobile. Thumbnails com lazy loading (IntersectionObserver).
Lightbox: overlay escuro, foto url_web centralizada, setas, ESC fecha.
Filtro: tabs por categoria visível, ordenadas pelo campo ordem.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
