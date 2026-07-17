# UX-04 — Dashboard Admin com Ações Diretas (P1)

| Campo | Valor |
|-------|-------|
| **ID** | UX-04 |
| **Tipo** | Melhoria UX |
| **Título** | Adicionar ações diretas nos cards de pendência do Dashboard |
| **Prioridade** | P1 |
| **Impacto** | Alto — elimina cliques desnecessários |
| **Esforço** | Baixo |

---

## Contexto

O Dashboard atual mostra pendências e próximos eventos, mas para agir o fotógrafo precisa navegar para outro módulo. Cada clique extra no celular é atrito. O concorrente dele (planilha + WhatsApp) tem fricção zero — resolve ali mesmo.

O Dashboard deve ser um centro de comando: ver + agir no mesmo lugar.

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/components/dashboard/ActionCard.jsx` — card com CTAs inline
- `apps/frontend/src/components/dashboard/QuickActions.jsx` — ações rápidas globais
- `apps/frontend/src/components/dashboard/KPIRow.jsx` — linha de KPIs
- `apps/frontend/src/components/dashboard/TimeIndicator.jsx` — "há X dias parado"

### Arquivos a ALTERAR
- `apps/frontend/src/pages/admin/Dashboard.jsx` (ou equivalente) — refatorar

---

## Spec Técnica

### KPI Row (KPIRow.jsx)
4 cards compactos no topo:
- Receita do mês (R$ X.XXX)
- Orçamentos pendentes (X)
- Eventos esta semana (X)
- Cobranças atrasadas (X) — vermelho se > 0

Cada KPI é clicável e navega para módulo correspondente.

### Cards de Pendência com Ação (ActionCard.jsx)

Cada card exibe:
- Ícone + Tipo (Orçamento, Cobrança, Contrato, Álbum, Follow-up)
- Título ("Orçamento #45 — Maria Silva")
- Tempo parado: "há 5 dias sem resposta" (amarelo >3d, vermelho >7d)
- CTA primário (botão): ação contextual
- CTA secundário (link): ação alternativa

Ações por tipo de pendência:

| Tipo | CTA Primário | CTA Secundário |
|------|-------------|----------------|
| Orçamento não respondido | "Reenviar" | "Ver orçamento" |
| Orçamento aceito | "Gerar contrato" | "Ver detalhes" |
| Contrato pendente assinatura | "Enviar lembrete" | "Ver contrato" |
| Cobrança atrasada | "Cobrar via WhatsApp" | "Ver parcelas" |
| Álbum pronto | "Publicar" | "Revisar fotos" |
| Follow-up agendado | "Enviar mensagem" | "Adiar 3 dias" |
| Evento amanhã | "Ver checklist" | "Ligar para cliente" |

### Quick Actions (QuickActions.jsx)
Barra de ações rápidas (shortcuts):
- "+ Novo Orçamento" (modal ou navega)
- "+ Novo Evento" (modal)
- "Enviar mensagem" (abre WhatsApp)
- "Registrar pagamento" (modal rápido)

Positioning:
- Desktop: barra horizontal abaixo dos KPIs
- Mobile: FAB (Floating Action Button) com expand

### Time Indicator (TimeIndicator.jsx)
- Calcula tempo desde última ação
- Cores:
  - Verde: < 24h
  - Amarelo: 1-3 dias
  - Laranja: 4-7 dias
  - Vermelho: > 7 dias
  - Vermelho pulsante: > 14 dias
- Tooltip com data exata

### Ordenação dos Cards
1. Pendências vencidas/atrasadas (vermelho) — topo
2. Pendências de hoje (laranja)
3. Pendências da semana (amarelo)
4. Informativas (azul)

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/` — backend
- `template.yaml`, `infra/`
- Outras pages

---

## Critérios de Aceite
1. KPIs exibem dados reais da API
2. Cada card de pendência tem CTA funcional sem sair do dashboard
3. "Reenviar orçamento" envia direto (com confirm)
4. "Cobrar via WhatsApp" abre mensagem pré-preenchida
5. Time indicator com cores corretas
6. Cards ordenados por urgência
7. Quick actions funcionam em mobile (FAB)

---

## Prompt Pronto para o Kiro CLI

```
Implemente a UX-04 conforme docs/specs/UX-04-dashboard-acoes-diretas.md.

Refatore o Dashboard com:
1. KPI Row no topo (4 métricas clicáveis)
2. Cards de pendência com CTAs inline por tipo
3. Quick Actions (barra desktop / FAB mobile)
4. Time Indicator colorido por urgência
5. Ordenação por urgência (vencidos primeiro)

Arquivos a criar:
- apps/frontend/src/components/dashboard/ActionCard.jsx
- apps/frontend/src/components/dashboard/QuickActions.jsx
- apps/frontend/src/components/dashboard/KPIRow.jsx
- apps/frontend/src/components/dashboard/TimeIndicator.jsx

Arquivos a alterar:
- apps/frontend/src/pages/admin/Dashboard.jsx

NÃO TOQUE em nenhum arquivo fora dessa lista.
```
