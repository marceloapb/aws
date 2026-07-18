# PTF-08 — Toggle de Visibilidade de Categoria

**TIPO:** Feature  
**PRIORIDADE:** P1  
**IMPACTO:** Alto — controla o que o público vê  
**ESFORÇO:** Baixo  

## CONTEXTO

O ADM precisa ocultar/mostrar categorias do portfólio público sem excluí-las. O campo `visivel` (bool) já existe na entidade (PTF-01). Esta spec garante que o toggle funciona ponta a ponta: botão no frontend → PUT no backend → API pública filtra.

## ESCOPO

- Ajuste em `src/functions/portfolio/categorias/atualizar.js` (já aceita `visivel` — confirmar)
- Frontend: botão toggle no card da categoria em `PortfolioAdmin.jsx`
- Confirmar que `listar-portfolio.js` (PTF-05) filtra `visivel=true`

## FORA DE ESCOPO (NÃO TOCAR)

- Lógica de fotos
- CloudFront
- Qualquer outro módulo

## SPEC TÉCNICA

**Backend (confirmação):**
- O PUT de `/admin/portfolio/categorias/{id}` já aceita `{ visivel: false }` (spec PTF-01). Se não implementado corretamente, ajustar para aceitar campo booleano isolado (partial update).
- Query na API pública (PTF-05) já filtra `visivel=true` no FilterExpression. Confirmar.

**Frontend:**
- No card de cada categoria, ícone de olho (`Eye` / `EyeOff` do lucide-react).
- Click → `PUT /admin/portfolio/categorias/{id}` com `{ visivel: !atual }`.
- Badge visual: categoria oculta fica com opacidade 50% e badge "Oculta" (`bg-stone-100 text-stone-500`).
- Otimistic update: muda no state imediatamente, reverte em erro.

**Regra de negócio:**
- Ocultar categoria não exclui fotos. Fotos permanecem.
- Categoria oculta com fotos: o ADM vê normalmente no admin, mas o público não vê nada dela.

## CRITÉRIOS DE ACEITE

1. Toggle muda `visivel` no banco via PUT.
2. Categoria com `visivel=false` não aparece na API pública.
3. Categoria oculta aparece no admin com indicador visual.
4. Fotos da categoria oculta não são afetadas.
5. Toggle é otimístico com rollback em erro.

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente o toggle de visibilidade de categorias do portfólio conforme spec PTF-08. Confirme que PUT /admin/portfolio/categorias/{id} aceita { visivel: boolean } como partial update. No frontend PortfolioAdmin.jsx, adicione botão Eye/EyeOff (lucide-react) em cada card de categoria. Click faz PUT toggle. Categoria oculta fica opacity-50 com badge "Oculta" (bg-stone-100 text-stone-500). Optimistic update com rollback em erro. Confirme que GET /public/portfolio filtra visivel=true. ALTERE SOMENTE atualizar.js (se necessário) e PortfolioAdmin.jsx; não refatore, renomeie ou mexa em mais nada.
```
