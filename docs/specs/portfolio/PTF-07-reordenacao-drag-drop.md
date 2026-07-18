# PTF-07 — Reordenação Drag-and-Drop (Frontend → PATCH ordem)

**TIPO:** Melhoria  
**PRIORIDADE:** P2  
**IMPACTO:** Médio — UX do ADM  
**ESFORÇO:** Baixo  

## CONTEXTO

O endpoint PATCH de reordenação já existe (PTF-04). Esta spec cobre o frontend (tela admin de portfólio) que permite arrastar fotos e categorias para reordenar, chamando o PATCH ao soltar. Reusa o padrão visual de `portfolio-admin-prototipo.jsx`.

## ESCOPO

- `src/pages/admin/PortfolioAdmin.jsx` (ou equivalente no frontend)
- Dependência: biblioteca de drag-and-drop (ex.: `@dnd-kit/core` ou `react-beautiful-dnd`)

## FORA DE ESCOPO (NÃO TOCAR)

- Backend (endpoints já existem em PTF-01/04)
- Processamento de imagem
- Site público
- Qualquer outro módulo/página

## SPEC TÉCNICA

**UX:**
1. Tela lista categorias em cards. Dentro de cada card, grade de fotos (thumbnails).
2. Drag-and-drop em categorias: arrastar card → reordena → ao soltar, `PATCH /admin/portfolio/categorias/ordem` com nova sequência.
3. Drag-and-drop em fotos dentro de uma categoria: arrastar thumb → ao soltar, `PATCH /admin/portfolio/categorias/{catId}/fotos/ordem`.
4. Feedback visual: item arrastado com opacidade 50%, placeholder no destino.
5. Debounce: se o ADM arrasta rápido, espera 500ms de inatividade para disparar o PATCH (evita N chamadas).

**Integração:**
- API call usa `fetch` para os endpoints já criados.
- Erro na API: toast de erro, reverte a ordem no state local.
- Loading state: desabilita drag enquanto o PATCH está em voo.

**Padrão visual:** conforme `REFERENCIA-LAYOUT-PROTOTIPOS.md` — cards `rounded-xl border-stone-200 bg-white`, thumbs com gradientes mock (ou imagens reais se disponíveis), ACCENT `#EA580C` via style.

## CRITÉRIOS DE ACEITE

1. Arrastar e soltar categoria altera a ordem visualmente e persiste via API.
2. Arrastar e soltar foto dentro de categoria altera a ordem e persiste.
3. Erro de rede reverte a posição e mostra toast.
4. Funciona em mobile (touch drag).

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente a reordenação drag-and-drop do portfólio admin conforme spec PTF-07. No componente PortfolioAdmin (src/pages/admin/PortfolioAdmin.jsx), adicione drag-and-drop para cards de categoria e para thumbs de fotos dentro de cada categoria. Use @dnd-kit/core (ou equivalente já no projeto). Ao soltar, dispare PATCH para /admin/portfolio/categorias/ordem ou /admin/portfolio/categorias/{catId}/fotos/ordem com array [{id,ordem}]. Debounce 500ms. Reverte em caso de erro + toast. Padrão visual: ACCENT=#EA580C via style, cards rounded-xl border-stone-200 bg-white. ALTERE SOMENTE o arquivo da página de portfólio admin; não refatore, renomeie ou mexa em mais nada.
```
