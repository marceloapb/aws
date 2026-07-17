# UX-06 — Busca Global + Atalhos de Teclado (P1)

| Campo | Valor |
|-------|-------|
| **ID** | UX-06 |
| **Tipo** | Melhoria UX |
| **Título** | Implementar busca global com atalhos rápidos |
| **Prioridade** | P1 |
| **Impacto** | Alto — acesso instantâneo a qualquer informação |
| **Esforço** | Médio |

---

## Contexto

O fotógrafo tem 50-200 clientes, dezenas de orçamentos e contratos. Para encontrar algo hoje, precisa navegar menu, tela, filtros, buscar. São 4+ cliques para chegar na informação.

Com busca global (estilo Spotlight/Cmd+K), qualquer dado está a 1 tecla + digitação de distância.

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/components/search/GlobalSearch.jsx` — modal de busca
- `apps/frontend/src/components/search/SearchResult.jsx` — item de resultado
- `apps/frontend/src/components/search/SearchCategories.jsx` — filtros por tipo
- `apps/frontend/src/hooks/useGlobalSearch.js` — hook de busca
- `apps/frontend/src/hooks/useKeyboardShortcuts.js` — hook de atalhos

### Arquivos a ALTERAR
- `apps/frontend/src/components/Layout.jsx` — adicionar trigger de busca no header
- `apps/frontend/src/App.js` — registrar atalhos globais

---

## Spec Técnica

### Modal de Busca (GlobalSearch.jsx)
- Ativação:
  - Desktop: Cmd+K (Mac) / Ctrl+K (Windows)
  - Mobile: ícone de busca no header (lupa)
  - Qualquer tela: funciona em overlay
- Layout:
  - Modal centralizado com backdrop blur
  - Input de busca grande (font-size 18px) com ícone lupa
  - Placeholder: "Buscar clientes, orçamentos, contratos..."
  - Resultados aparecem em tempo real (debounce 300ms)
  - ESC ou click fora fecha

### Resultados (SearchResult.jsx)
- Agrupados por tipo com header:
  - Clientes
  - Orçamentos
  - Contratos
  - Eventos
  - Álbuns
  - Cobranças
- Cada resultado:
  - Ícone do tipo + Título (bold match) + Subtítulo (contexto)
  - Ex: Maria Silva — Casamento 15/03 — Contrato assinado
  - Navegação com setas e Enter para abrir
  - Click abre o item na tela correspondente
- Máximo 3 resultados por tipo (link "Ver todos" se houver mais)
- Se nenhum resultado: "Nenhum resultado. Tente outro termo."

### Ações Rápidas (sem digitar)
Ao abrir o modal sem texto, mostra:
- Recentes (últimos 5 itens acessados)
- Ações rápidas:
  - "Novo orçamento" — navega
  - "Novo cliente" — navega
  - "Novo evento" — navega
  - "Abrir WhatsApp" — navega

### Atalhos de Teclado (useKeyboardShortcuts.js)
| Atalho | Ação |
|--------|------|
| Cmd/Ctrl + K | Abrir busca global |
| Cmd/Ctrl + N | Novo orçamento |
| Cmd/Ctrl + Shift + N | Novo cliente |
| Cmd/Ctrl + . | Abrir pendências |
| G + A | Go to Agenda |
| G + O | Go to Orçamentos |
| G + F | Go to Financeiro |
| G + C | Go to Clientes |
| ? | Mostrar ajuda de atalhos |

- Atalhos desativados quando input está focado
- Atalhos "G + X" funcionam com sequência rápida (<500ms entre teclas)
- Modal de ajuda (?) lista todos os atalhos disponíveis

### Busca (useGlobalSearch.js)
- Endpoint: `GET /api/admin/busca?q={{query}}&tipo={{tipo}}` (se existir)
- Se não existir endpoint dedicado: busca client-side nos dados em cache
- Estratégia: busca fuzzy (tolera typos) com scoring de relevância
- Prioridade: nome > email > telefone > descrição
- Cache: últimos 5 termos buscados para acesso instantâneo

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/` — backend (busca client-side inicialmente)
- `template.yaml`, `infra/`
- Outras pages

---

## Critérios de Aceite
1. Cmd+K abre modal de busca em qualquer tela
2. Resultados aparecem agrupados por tipo em tempo real
3. Navegação por teclado (setas + Enter) funciona
4. Click em resultado navega para item correto
5. Ações rápidas aparecem sem digitar
6. Atalhos G+A, G+O etc. navegam corretamente
7. ? mostra modal de ajuda
8. Mobile: ícone de lupa no header funciona

---

## Prompt Pronto para o Kiro CLI

```
Implemente a UX-06 conforme docs/specs/UX-06-busca-global.md.

Crie busca global estilo Cmd+K com resultados agrupados e atalhos de teclado.

Arquivos a criar:
- apps/frontend/src/components/search/GlobalSearch.jsx
- apps/frontend/src/components/search/SearchResult.jsx
- apps/frontend/src/components/search/SearchCategories.jsx
- apps/frontend/src/hooks/useGlobalSearch.js
- apps/frontend/src/hooks/useKeyboardShortcuts.js

Arquivos a alterar:
- apps/frontend/src/components/Layout.jsx
- apps/frontend/src/App.js

NÃO TOQUE em nenhum arquivo fora dessa lista.
```
