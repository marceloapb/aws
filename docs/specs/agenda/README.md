# Specs da Agenda (AGD-01 a AGD-10)

## Visão Geral
Especificações para corrigir gaps identificados na tela de Agenda vs. Spec §7.

## Tabela Consolidada

| ID | Tipo | Título | Prioridade | Impacto | Esforço |
|---|---|---|---|---|---|
| AGD-01 | Feature | Modal/Drawer de Detalhe do Evento | P0 | Alto | Médio |
| AGD-02 | Melhoria | Cores por status no calendário e lista | P1 | Alto | Baixo |
| AGD-03 | Feature | Badge "expira em Xd" para reservas temporárias | P1 | Alto | Baixo |
| AGD-04 | Feature | Filtro por status (Confirmada/Pendente/Bloqueada) | P1 | Alto | Baixo |
| AGD-05 | Feature | Filtro por tipo de sessão | P2 | Médio | Baixo |
| AGD-06 | Melhoria | Indicador de datas bloqueadas no calendário | P1 | Alto | Baixo |
| AGD-07 | Feature | Distância/tempo até o local | P3 | Baixo | Médio |
| AGD-08 | Feature | Link "Ver mapa" / embed no drawer | P2 | Médio | Baixo |
| AGD-09 | Melhoria | Clique no dia vazio → criar sessão direto | P2 | Médio | Baixo |
| AGD-10 | Melhoria | Status de sincronização Google Calendar | P2 | Médio | Baixo |

## Ordem de Execução

### Fase 1 — Crítico
- AGD-01 (Drawer detalhe) — sem isso a agenda é read-only
- AGD-02 (Cores por status)
- AGD-06 (Bloqueios no calendário)

### Fase 2 — Alto valor
- AGD-03 (Badge expira)
- AGD-04 (Filtro status)
- AGD-09 (Clique dia vazio)

### Fase 3 — Complementos
- AGD-05 (Filtro tipo)
- AGD-08 (Link mapa)
- AGD-10 (Sync Google)
- AGD-07 (Distância)
