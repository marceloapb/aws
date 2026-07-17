# SPEC-51 — Criar Tela de Pendências (P3)

| Campo | Valor |
|-------|-------|
| **ID** | SPEC-51 |
| **Tipo** | Feature |
| **Título** | Criar Pendencias.jsx — central de tarefas e alertas |
| **Prioridade** | P3 |
| **Impacto** | Desejável — consolida tudo que precisa de atenção |
| **Esforço** | Baixo-Médio |

---

## Contexto

Não existe tela de Pendências no frontend. O backend `admin-pendencias.js` (3.2KB) agrega alertas e tarefas pendentes de todos os módulos em um único endpoint. Funciona como um "dashboard de ação" — o fotógrafo abre e vê tudo que precisa resolver.

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/pages/admin/Pendencias.jsx` — tela principal
- `apps/frontend/src/components/pendencia/PendenciaCard.jsx` — card de pendência
- `apps/frontend/src/components/pendencia/PendenciaFilters.jsx` — filtros

### Arquivos a ALTERAR
- `apps/frontend/src/App.js` — rota
- `apps/frontend/src/components/Sidebar.jsx` — item no menu (com badge de contagem)

---

## Spec Técnica

### Layout (Pendencias.jsx)
- KPIs no topo: Total pendências, Urgentes (vencidas), Hoje, Esta semana
- Lista de cards agrupados por categoria
- Filtros laterais ou topo

### Tipos de Pendência (agregados pelo backend)
| Tipo | Origem | Exemplo |
|------|--------|---------|
| Orçamento expirando | admin-orcamentos | "Orçamento #45 expira em 2 dias" |
| Cobrança atrasada | admin-cobrancas | "Parcela 3/6 de Maria — venceu há 5 dias" |
| Contrato pendente assinatura | admin-contratos | "Contrato #12 enviado há 7 dias sem retorno" |
| Álbum expirando | admin-albuns | "Álbum Casamento João expira em 3 dias" |
| Feedback pendente | admin-feedback | "Job entregue há 14 dias — solicitar feedback?" |
| Follow-up agendado | followUpJob | "Follow-up com Carlos — hoje às 10h" |
| Backup atrasado | backupJob | "Último backup há 3 dias (config: diário)" |
| Manutenção equipamento | admin-equipamentos | "Canon 5D — manutenção preventiva vencida" |

### Card (PendenciaCard.jsx)
- Ícone por tipo (cor: vermelho urgente, amarelo atenção, azul info)
- Título da pendência
- Descrição curta
- Tempo: "há X dias" ou "em X dias"
- Ação rápida (botão): Resolver / Ver / Ignorar
  - Resolver: navega para a tela correspondente
  - Ver: abre detalhe inline
  - Ignorar: oculta por X dias (snooze)

### Filtros (PendenciaFilters.jsx)
- Por tipo (checkboxes)
- Por urgência: Todas / Vencidas / Hoje / Semana
- Por módulo: Orçamento / Cobrança / Contrato / Álbum / Outros
- Busca por texto

### Badge no Sidebar
- O item "Pendências" no Sidebar exibe badge numérico vermelho com total de pendências urgentes
- Atualiza via polling a cada 60s ou no mount

### API Endpoints (já existentes)
- `GET /api/admin/pendencias` — listar todas (com filtros por query params)
- `GET /api/admin/pendencias/contagem` — contagem por tipo (para badge)
- `PATCH /api/admin/pendencias/:id/snooze` — adiar/ocultar
- `PATCH /api/admin/pendencias/:id/resolver` — marcar resolvida

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/`, `template.yaml`, `infra/`
- Outras pages
- Notificações push (futuro)

---

## Critérios de Aceite
1. Tela lista pendências agrupadas com cards visuais
2. Filtros por tipo e urgência funcionam
3. Ação "Resolver" navega para tela correta
4. Snooze oculta pendência temporariamente
5. Badge no Sidebar exibe contagem em tempo real
6. KPIs calculam corretamente

---

## Prompt Pronto para o Kiro CLI

```
Implemente a SPEC-51 conforme docs/specs/SPEC-51-pendencias-frontend.md.

Crie Pendencias.jsx como central de tarefas/alertas agregados.
Adicione badge de contagem no Sidebar.
Conecte às rotas de admin-pendencias.js.

Arquivos a criar:
- apps/frontend/src/pages/admin/Pendencias.jsx
- apps/frontend/src/components/pendencia/PendenciaCard.jsx
- apps/frontend/src/components/pendencia/PendenciaFilters.jsx

Arquivos a alterar:
- apps/frontend/src/App.js
- apps/frontend/src/components/Sidebar.jsx

NÃO TOQUE em nenhum arquivo fora dessa lista.
```
