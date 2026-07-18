# STP-02 — Navegação + Layout Shell

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | STP-02 |
| **Tipo** | Feature |
| **Prioridade** | P0 |
| **Impacto** | Alto — casca visual que contém todas as páginas |
| **Esforço** | Médio |

## Contexto
O site público tem navegação de 5 páginas (Início, Portfólio, Novidades, Sobre, Contato) com menu fixo no topo e drawer mobile (direita, 50% da tela, overlay). Identidade cinematográfica: dark #0b0a09, laranja #EA580C, serif display + sans.

## Escopo
- **Frontend (S3 + CloudFront):** componente `SiteLayout` com header (logo + nav + CTA), footer (redes + créditos), drawer mobile
- **Header:** logo vindo de ConfigSite (STP-01), links das 5 páginas, botão hamburguer mobile
- **Footer:** ícones de redes sociais (vindos de ConfigSite), copyright dinâmico com nome
- **Drawer mobile:** desliza da direita, 50% width, overlay escuro, fecha ao clicar fora ou no X
- **Roteamento:** páginas separadas (não SPA scroll), transição suave
- **Responsividade:** breakpoints mobile/tablet/desktop

## Fora de Escopo (NÃO TOCAR)
- Conteúdo das páginas internas (STP-03 a STP-07)
- Botão flutuante de orçamento (STP-08)
- ConfigSite backend (STP-01)
- CMS (STP-09)

## Spec Técnica

### Estrutura de Componentes
```
src/pages/public/
├── SiteLayout.jsx        (header + footer + slot)
├── SiteHeader.jsx        (logo, nav, hamburguer)
├── SiteFooter.jsx        (redes, copyright)
├── SiteDrawer.jsx        (mobile, 50% right, overlay)
├── HomePage.jsx          (STP-03)
├── PortfolioPage.jsx     (STP-04)
├── NovidadesPage.jsx     (STP-05)
├── SobrePage.jsx         (STP-06)
├── ContatoPage.jsx       (STP-07)
```

### Identidade Visual
- Background: #0b0a09 (stone-950)
- Acento: #EA580C (laranja marca)
- Texto primário: #fafaf9 (stone-50)
- Texto secundário: #a8a29e (stone-400)
- Font display: serif (ex: Playfair Display)
- Font body: sans-serif do sistema
- Cards/seções: borda stone-800, bg stone-900/50

### Comportamento do Drawer
- Trigger: ícone hamburguer visível abaixo de 768px
- Animação: translateX(100%) → translateX(0), 300ms ease
- Overlay: bg-black/50, fecha ao clicar
- Links: ao clicar, fecha drawer + navega

## Critérios de Aceite
- Logo renderiza de ConfigSite; ausente → fallback texto com nome
- Menu desktop mostra 5 links; mobile mostra hamburguer
- Drawer abre/fecha com animação, fecha ao clicar fora
- Footer mostra apenas redes cadastradas (array vazio → sem ícones)
- Navegação funciona entre as 5 páginas sem reload completo

## Prompt Pronto para o Kiro CLI
```
Implemente a spec STP-02 (Navegação + Layout Shell do site público).

Crie:
1. src/pages/public/SiteLayout.jsx — shell com header, footer e children slot
2. src/pages/public/SiteHeader.jsx — logo de ConfigSite, nav 5 links, hamburguer mobile
3. src/pages/public/SiteFooter.jsx — redes sociais dinâmicas + copyright com nome
4. src/pages/public/SiteDrawer.jsx — drawer 50% direita, overlay, fecha ao clicar fora

Identidade visual: fundo #0b0a09, acento #EA580C, texto #fafaf9, font serif display.
Drawer: visível <768px, translateX animado 300ms, overlay bg-black/50.
Dados: consumir GET /public/config (STP-01) para logo e redes.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
