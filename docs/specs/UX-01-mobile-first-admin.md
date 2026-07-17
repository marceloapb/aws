# UX-01 — Mobile-First na Área Admin (P0)

| Campo | Valor |
|-------|-------|
| **ID** | UX-01 |
| **Tipo** | Correção UX |
| **Título** | Implementar experiência mobile-first na área administrativa |
| **Prioridade** | P0 |
| **Impacto** | Crítico — fotógrafo usa celular 70% do tempo |
| **Esforço** | Médio |

---

## Contexto

O fotógrafo profissional está entre eventos, reuniões e deslocamentos a maior parte do dia. Acessa o sistema pelo celular para consultar agenda, responder clientes e verificar pendências. Hoje, toda a área admin é pensada para desktop — campos pequenos, sidebar fixa ocupando espaço, tabelas que não cabem, nenhum gesto touch.

O resultado: fotógrafo não usa o sistema no dia-a-dia, só quando senta no computador (1-2x por semana). Perde oportunidades em tempo real.

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/components/BottomNav.jsx` — navegação inferior mobile
- `apps/frontend/src/components/SwipeCard.jsx` — card com swipe actions
- `apps/frontend/src/hooks/useResponsive.js` — hook de breakpoints
- `apps/frontend/src/hooks/useSwipe.js` — hook de gestos swipe

### Arquivos a ALTERAR
- `apps/frontend/src/components/Layout.jsx` — lógica de layout responsivo
- `apps/frontend/src/components/Sidebar.jsx` — transformar em drawer mobile
- `apps/frontend/src/index.css` ou equivalente — variáveis de touch targets

---

## Spec Técnica

### Bottom Navigation (BottomNav.jsx)
- Visível APENAS em telas < 768px
- 5 itens fixos: Dashboard (home), Agenda (calendar), Orçamentos (file-text), WhatsApp (message-circle), Mais (menu)
- "Mais" abre drawer com restante do menu
- Badge de contagem em itens com pendência
- Ativo = cor accent (laranja do sistema)
- Height: 64px (safe area respeitada para notch/barra iOS)

### Sidebar como Drawer (Sidebar.jsx)
- Desktop (>=1024px): sidebar fixa como hoje
- Tablet (768-1023px): sidebar colapsável (ícones only) com hover expand
- Mobile (<768px): sidebar some completamente, substituída por BottomNav + drawer
- Drawer: abre da esquerda com gesto swipe-right da borda ou tap em "Mais"
- Overlay escuro ao abrir (tap para fechar)
- Transição: slide-in 200ms ease-out

### Touch Targets
- Todos os botões/links: mínimo 48x48px de área clicável
- Inputs: height mínimo 48px, font-size 16px (evita zoom no iOS)
- Espaçamento entre itens tocáveis: mínimo 8px
- Cards: padding mínimo 16px

### Swipe Actions (SwipeCard.jsx)
- Swipe para direita: ação primária (confirmar, aprovar) — fundo verde
- Swipe para esquerda: ação secundária (adiar, rejeitar) — fundo vermelho
- Threshold: 30% da largura do card para confirmar
- Feedback háptico (navigator.vibrate) ao passar do threshold
- Spring animation no retorno

### Tabelas Responsivas
- < 768px: tabelas viram lista de cards
- Cada card mostra: informação principal (bold), 2-3 dados secundários, ação quick
- Scroll horizontal APENAS se absolutamente necessário (last resort)

### Layout (Layout.jsx)
- Detectar viewport via useResponsive hook
- Mobile: padding-bottom de 64px (espaço para BottomNav)
- Mobile: header fixo com título da página + botão de busca
- Desktop: manter layout atual

### useResponsive Hook
```javascript
// Retorna:
// { isMobile, isTablet, isDesktop, breakpoint }
// Breakpoints: mobile < 768, tablet 768-1023, desktop >= 1024
```

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/` — backend
- `template.yaml`, `infra/`
- Lógica de negócio das pages (apenas wrapper de layout)
- Conteúdo específico de cada tela (cada spec cuida de si)

---

## Critérios de Aceite
1. Em tela < 768px, BottomNav aparece e Sidebar some
2. Todos os inputs têm height >= 48px em mobile
3. Swipe funciona em cards de pendência
4. Tabelas viram cards em mobile
5. Drawer abre com gesto de borda
6. Badge de contagem funciona no BottomNav
7. Não há scroll horizontal indesejado em nenhuma tela mobile

---

## Prompt Pronto para o Kiro CLI

```
Implemente a UX-01 conforme docs/specs/UX-01-mobile-first-admin.md.

Crie experiência mobile-first para a área admin:
1. BottomNav.jsx com 5 itens + badge de contagem
2. Sidebar.jsx vira drawer em mobile
3. Layout.jsx detecta viewport e ajusta
4. SwipeCard.jsx para ações rápidas
5. useResponsive.js e useSwipe.js hooks
6. Touch targets de 48px mínimo em todos os inputs/botões
7. Tabelas viram cards em telas < 768px

Arquivos a criar:
- apps/frontend/src/components/BottomNav.jsx
- apps/frontend/src/components/SwipeCard.jsx
- apps/frontend/src/hooks/useResponsive.js
- apps/frontend/src/hooks/useSwipe.js

Arquivos a alterar:
- apps/frontend/src/components/Layout.jsx
- apps/frontend/src/components/Sidebar.jsx
- apps/frontend/src/index.css

NÃO TOQUE em nenhum arquivo fora dessa lista. Não altere lógica de negócio das pages.
```
