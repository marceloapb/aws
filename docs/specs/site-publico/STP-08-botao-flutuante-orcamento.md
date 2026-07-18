# STP-08 — Botão Flutuante Orçamento

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | STP-08 |
| **Tipo** | Feature |
| **Prioridade** | P1 |
| **Impacto** | Alto — CTA global, sempre visível, converte visitante |
| **Esforço** | Baixo |

## Contexto
Botão flutuante fixo em todas as páginas do site público. "Solicitar Orçamento" → exige cadastro/login (Identidade §4) → fluxo de orçamento (§6). O lead quente nasce estruturado. Decisão consciente: login antes de orçar troca volume por qualidade.

## Escopo
- **Frontend:** componente `FloatingCTA.jsx` renderizado no SiteLayout (global)
- **Posição:** bottom-right, fixo, z-index alto
- **Comportamento:** sempre visível exceto na página Contato (onde os CTAs já são explícitos)
- **Ação:** click → verifica auth → se logado, vai para /orcamento/novo; se não, abre modal de login/cadastro
- **Animação:** pulse sutil no primeiro carregamento, para depois de 3s

## Fora de Escopo (NÃO TOCAR)
- Módulo Identidade (§4) — login/cadastro já existe
- Módulo Orçamento (§6) — fluxo já existe
- Navegação do site (STP-02)
- Página Contato (STP-07 tem seus próprios CTAs)

## Spec Técnica

### Componente FloatingCTA
```jsx
// Renderiza em SiteLayout, condicional à rota
// Oculto em /contato (já tem CTAs dedicados)
<FloatingCTA>
  - Posição: fixed, bottom: 24px, right: 24px
  - Botão: bg #EA580C, texto branco, ícone câmera, "Orçamento"
  - Hover: scale(1.05), shadow-lg
  - Pulse: animação CSS 3s no mount, depois para
  - Click: checkAuth() → logado ? navigate('/orcamento/novo') : openLoginModal()
  - Z-index: 50 (acima do conteúdo, abaixo de modais)
  - Mobile: mesma posição, tamanho ligeiramente menor
</FloatingCTA>
```

### Lógica de Auth
- Verifica token Cognito no localStorage/context
- Token válido → navega direto
- Sem token → abre modal/rota de login com redirect para /orcamento/novo após sucesso

## Critérios de Aceite
- Botão visível em Home, Portfólio, Novidades, Sobre
- Botão OCULTO na página Contato
- Click sem login → modal de login aparece
- Login com sucesso → redireciona para orçamento
- Já logado + click → vai direto para orçamento
- Responsivo: posição fixa funciona em mobile sem cobrir conteúdo crítico

## Prompt Pronto para o Kiro CLI
```
Implemente a spec STP-08 (Botão Flutuante de Orçamento).

Crie:
1. src/pages/public/FloatingCTA.jsx — botão fixo bottom-right, condicional à rota

Cor: #EA580C, texto branco, ícone câmera. Hover scale(1.05).
Oculto em /contato. Pulse animation nos primeiros 3s.
Auth: verifica Cognito → logado vai para /orcamento/novo; não logado abre login com redirect.
Z-index 50. Mobile: posição fixed mantida, tamanho menor.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
