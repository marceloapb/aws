# SPEC-40 — Expandir Tela Financeiro (P0)

| Campo | Valor |
|-------|-------|
| **ID** | SPEC-40 |
| **Tipo** | Feature |
| **Título** | Expandir Financeiro.jsx com controle de caixa completo |
| **Prioridade** | P0 |
| **Impacto** | Crítico — controle financeiro é vital |
| **Esforço** | Alto (ref: 33.5KB protótipo) |

---

## Contexto

Financeiro.jsx tem 4.4KB (13.3% do protótipo). Exibe apenas listagem básica. Falta: dashboard com indicadores, fluxo de caixa, contas a receber/pagar, conciliação e relatórios.

Backend: `apps/api/src/routes/admin-financeiro.js` (6.9KB) — endpoints completos.
Protótipo ref: `docs/prototipos/financeiro-caixa-prototipo.jsx` (33.5KB).

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/pages/admin/FinanceiroDashboard.jsx` — indicadores e gráficos
- `apps/frontend/src/pages/admin/FinanceiroLancamentos.jsx` — lançamentos detalhados
- `apps/frontend/src/components/financeiro/KPICards.jsx` — cards de KPI
- `apps/frontend/src/components/financeiro/FluxoCaixaChart.jsx` — gráfico fluxo
- `apps/frontend/src/components/financeiro/LancamentoForm.jsx` — formulário de lançamento

### Arquivos a ALTERAR
- `apps/frontend/src/pages/admin/Financeiro.jsx` — refatorar como container com tabs
- `apps/frontend/src/App.js` — sub-rotas se necessário

---

## Spec Técnica

### Dashboard (FinanceiroDashboard.jsx)
KPI Cards:
- Receita do mês (R$)
- Despesas do mês (R$)
- Lucro líquido (R$)
- A receber (vencido + a vencer)
- A pagar (vencido + a vencer)

Gráficos:
- Fluxo de caixa mensal (barras: entrada vs saída, últimos 6 meses)
- Receita por tipo de serviço (pizza)

### Lançamentos (FinanceiroLancamentos.jsx)
- Tabela: Data, Descrição, Categoria, Tipo (entrada/saída), Valor, Status (pago/pendente/atrasado), Contrato vinculado
- Filtros: período, tipo, status, categoria
- Botão "+ Novo lançamento" (manual)
- Lançamentos automáticos vindos de contratos/cobranças aparecem com badge "auto"
- Ação: Marcar como pago, Editar, Excluir (só manuais)

### Formulário (LancamentoForm.jsx)
- Tipo: Entrada / Saída
- Descrição (text)
- Valor (R$)
- Data de vencimento (date)
- Data de pagamento (date, opcional)
- Categoria (select: Ensaio, Casamento, Equipamento, Aluguel, Marketing, Outros)
- Contrato vinculado (select opcional)
- Recorrente (toggle + periodicidade)

### API Endpoints (já existentes)
- `GET /api/admin/financeiro` — listar com filtros
- `GET /api/admin/financeiro/resumo` — KPIs
- `POST /api/admin/financeiro` — criar lançamento
- `PUT /api/admin/financeiro/:id` — editar
- `PATCH /api/admin/financeiro/:id/pagar` — marcar pago
- `DELETE /api/admin/financeiro/:id` — excluir

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/`, `template.yaml`, `infra/`
- Outras pages não listadas

---

## Critérios de Aceite
1. Dashboard exibe 5 KPIs com valores reais da API
2. Gráfico de fluxo de caixa renderiza últimos 6 meses
3. Lançamentos listam com filtros funcionais
4. Criar lançamento manual funciona
5. Marcar como pago atualiza status e recalcula KPIs
6. Lançamentos automáticos (de contratos) aparecem com badge

---

## Prompt Pronto para o Kiro CLI

```
Implemente a SPEC-40 conforme docs/specs/SPEC-40-financeiro-frontend-completo.md.

Refatore Financeiro.jsx como container com tabs e crie FinanceiroDashboard.jsx e FinanceiroLancamentos.jsx seguindo docs/prototipos/financeiro-caixa-prototipo.jsx.
Para gráficos, use Recharts (já no package.json) ou equivalente leve.

Arquivos a criar:
- apps/frontend/src/pages/admin/FinanceiroDashboard.jsx
- apps/frontend/src/pages/admin/FinanceiroLancamentos.jsx
- apps/frontend/src/components/financeiro/KPICards.jsx
- apps/frontend/src/components/financeiro/FluxoCaixaChart.jsx
- apps/frontend/src/components/financeiro/LancamentoForm.jsx

Arquivos a alterar:
- apps/frontend/src/pages/admin/Financeiro.jsx
- apps/frontend/src/App.js

NÃO TOQUE em nenhum arquivo fora dessa lista.
```
