# STP-05 — Página Novidades (reusa blog)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | STP-05 |
| **Tipo** | Feature |
| **Prioridade** | P1 |
| **Impacto** | Médio — conteúdo fresco, bom para SEO |
| **Esforço** | Baixo (consome endpoints já existentes do NVD) |

## Contexto
A página Novidades exibe posts do blog (módulo Novidades, specs NVD). Lista paginada dos posts publicados com capa, título, resumo e data. Ao clicar, abre o post completo.

## Escopo
- **Frontend:** `NovidadesPage.jsx` (lista) + `NovidadeDetalhe.jsx` (post completo)
- **Consome:** `GET /public/novidades` e `GET /public/novidades/:slug`
- **Lista:** cards com imagem de capa, título, resumo (primeiros 150 chars), data
- **Detalhe:** renderiza HTML/rich text do corpo completo
- **Paginação:** load more ou infinite scroll

## Fora de Escopo (NÃO TOCAR)
- Backend de Novidades (specs NVD-01 a NVD-07) — já existe
- Admin de novidades (editor rico)
- Posts com status != publicado

## Spec Técnica

### Estrutura
```
<NovidadesPage>
  <PostList>
    - Cards: imagem_capa + titulo + resumo (150 chars) + data_publicacao
    - Ordenados por data desc (mais recente primeiro)
    - Paginação: botão "Carregar mais" (cursor-based)
  </PostList>
</NovidadesPage>

<NovidadeDetalhe>
  - Breadcrumb: Novidades > Título
  - Imagem de capa full-width
  - Título + data
  - Corpo (HTML sanitizado do rich text)
  - Botão "Voltar para Novidades"
</NovidadeDetalhe>
```

### Consumo de API
- `GET /public/novidades?limit=9&cursor=<last_id>` → lista paginada (só publicados)
- `GET /public/novidades/:slug` → post completo

## Critérios de Aceite
- Só posts com status "publicado" aparecem
- Lista ordenada por data (mais recente primeiro)
- "Carregar mais" traz próxima página sem perder scroll
- Detalhe renderiza rich text (negrito, itálico, imagens inline)
- Post sem imagem de capa → placeholder genérico
- Responsivo: cards empilham em mobile

## Prompt Pronto para o Kiro CLI
```
Implemente a spec STP-05 (Página Novidades do site público).

Crie:
1. src/pages/public/NovidadesPage.jsx — lista de posts com paginação cursor
2. src/pages/public/NovidadeDetalhe.jsx — post completo com rich text

Consome APIs já existentes: GET /public/novidades e GET /public/novidades/:slug.
Lista: cards com capa, título, resumo 150 chars, data. Paginação com "Carregar mais".
Detalhe: capa full-width, corpo HTML sanitizado, botão voltar.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
