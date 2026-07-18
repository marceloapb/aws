# ARC-02 — Shell / Navegação / Middleware Auth

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | ARC-02 |
| **Tipo** | Feature |
| **Prioridade** | P0 |
| **Impacto** | Alto — casca protegida para todas as telas |
| **Esforço** | Baixo |

## Contexto
Layout shell da área do cliente: sidebar (desktop) / bottom-nav (mobile) com 5 itens (Painel, Meus Eventos, Meus Dados, Notificações, Sair). Middleware frontend verifica token; expirado → redirect login. Visual: dark theme continuando o site público.

## Escopo
- **Frontend:** `ClienteLayout.jsx` com sidebar/bottom-nav + slot de conteúdo
- **AuthGuard:** HOC/wrapper que verifica token Cognito; ausente/expirado → /login
- **Navegação:** Painel, Meus Eventos, Meus Dados, Notificações (badge), Sair
- **Responsivo:** sidebar colapsável desktop, bottom-nav 5 ícones mobile
- **Token refresh:** silent refresh antes de expirar (Cognito refresh_token)

## Fora de Escopo (NÃO TOCAR)
- Cognito backend (ARC-01)
- Conteúdo das páginas internas (ARC-03 a ARC-10)
- Site público (STP-*)
- Layout admin

## Spec Técnica

### Estrutura de Componentes
```
src/pages/cliente/
├── ClienteLayout.jsx      (sidebar + slot + AuthGuard)
├── ClienteSidebar.jsx     (desktop: sidebar fixa 240px)
├── ClienteBottomNav.jsx   (mobile: bottom 5 ícones)
├── AuthGuard.jsx          (verifica token, redirect)
├── PainelPage.jsx         (ARC-03)
├── MeusEventosPage.jsx   (ARC-04)
├── EventoDetalhePage.jsx  (ARC-05/06/07/08/09)
├── MeusDadosPage.jsx     (ARC-10)
├── NotificacoesPage.jsx  (futuro)
```

### AuthGuard
```jsx
// Executa em todo mount de rota /cliente/*
// 1. Verifica se existe access_token no storage
// 2. Decodifica e checa exp (margem 60s)
// 3. Se válido → renderiza children
// 4. Se expirado → tenta refresh_token silently
// 5. Se falha → redirect para /login?redirect=/cliente/...
```

### Navegação
| Item | Ícone | Rota | Badge |
|------|-------|------|-------|
| Painel | home | /cliente | — |
| Meus Eventos | calendar | /cliente/eventos | count pendências |
| Meus Dados | user | /cliente/dados | — |
| Notificações | bell | /cliente/notificacoes | count não-lidas |
| Sair | logout | (action) | — |

### Visual
- Background: #0b0a09 (continuidade do site)
- Sidebar: bg stone-900, borda direita stone-800
- Item ativo: borda-left laranja #EA580C, text stone-50
- Item inativo: text stone-400
- Bottom-nav mobile: bg stone-900, ícones 24px, labels 10px

## Critérios de Aceite
- Rotas /cliente/* só acessíveis com token válido
- Token expirado → redirect para login com retorno
- Sidebar visível ≥1024px; bottom-nav < 1024px
- Badge de notificações mostra count (ou nada se zero)
- "Sair" limpa tokens + redirect para /login
- Transição suave entre páginas (sem flash branco)

## Prompt Pronto para o Kiro CLI
```
Implemente a spec ARC-02 (Shell / Navegação / Middleware Auth da área do cliente).

Crie:
1. src/pages/cliente/ClienteLayout.jsx — layout com sidebar + slot + AuthGuard
2. src/pages/cliente/ClienteSidebar.jsx — sidebar desktop 240px com 5 itens
3. src/pages/cliente/ClienteBottomNav.jsx — bottom-nav mobile com 5 ícones
4. src/pages/cliente/AuthGuard.jsx — verifica token Cognito, refresh silencioso, redirect

Visual: dark theme (#0b0a09), item ativo com borda laranja #EA580C.
Sidebar ≥1024px, bottom-nav <1024px. Badge de notificações.
Sair: limpa localStorage + redirect /login.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
