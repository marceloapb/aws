# CLI-07: Indicadores/KPIs no Topo da Listagem

## Metadados
- **ID:** CLI-07
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** CLI-02

## Contexto
A listagem de clientes não mostra métricas resumidas. O admin precisa ver de relance: total de clientes, novos no mês, ativos, inadimplentes. Cards no topo (mesmo padrão da Agenda).

## Escopo
- `apps/frontend/src/pages/admin/Clientes.jsx` — cards KPI
- Backend: Lambda `getClientesStats` — contadores
- API: GET /admin/clientes/stats

## Fora de Escopo (NÃO TOCAR)
- Dashboard principal
- ClienteForm.jsx
- ClienteDetalhe.jsx

## Spec Técnica

### Cards KPI
| Card | Ícone | Valor | Descrição |
|---|---|---|---|
| Total | 👥 | count(*) | Todos os clientes |
| Novos este mês | 🆕 | count(created >= mês atual) | Cadastrados no mês |
| Ativos | ✅ | count(status=cliente) | Com status "cliente" |
| Inadimplentes | ⚠️ | count(pagamento_atrasado > 0) | Com pagamento pendente |

### Backend — getClientesStats
- Single query com GSI_STATUS + Count
- Response: `{ total, novos_mes, ativos, inadimplentes }`
- Cache: recalcular a cada request (dados leves)

### Frontend — Clientes.jsx
- 4 cards inline no topo (antes dos filtros)
- Mesmo design dos cards da Agenda (ícone, número grande, label)
- Click no card aplica filtro correspondente

## Critérios de Aceite
- [ ] 4 cards com ícones e valores corretos
- [ ] Valores carregam do backend
- [ ] Click no card filtra a listagem
- [ ] Design consistente com Agenda
- [ ] Loading skeleton enquanto carrega

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CLI-07: KPIs na Listagem de Clientes.

1. Em Clientes.jsx: 4 cards no topo (total, novos mês, ativos, inadimplentes).
2. Backend GET /admin/clientes/stats: query GSI_STATUS, retornar contadores.
3. Click no card aplica filtro correspondente.
4. Loading skeleton nos cards.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
