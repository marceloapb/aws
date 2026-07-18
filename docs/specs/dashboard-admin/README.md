# Módulo Dashboard Admin — Specs

## Decisões de Design (§14)
- Shell: Sidebar + Topbar + Outlet (React Router)
- Dashboard = 2 blocos: Próximos Eventos + Pendências
- Notificações: sininho in-app (exclusivo admin)
- Busca global: topbar, cross-módulo
- Responsividade: drawer em mobile

## Fora de Escopo (confirmado)
- Dashboard do cliente (módulo Central do Cliente)
- BI/Analytics avançado (futuro)
- Multi-tenant switching

## Dependências entre specs:

- **Fase 1 (P0):** DSH-01 → DSH-02 → DSH-03
- **Fase 2 (P1):** DSH-04 | DSH-05 | DSH-06 (paralelas)
- **Fase 3 (P2):** DSH-07 | DSH-08
- **Fase 4 (P3):** DSH-09

## Lista de Specs

| ID | Arquivo | Prioridade | Título |
|---|---|---|---|
| DSH-01 | [DSH-01-shell-layout.md](./DSH-01-shell-layout.md) | P0 | Shell Layout |
| DSH-02 | [DSH-02-proximos-eventos.md](./DSH-02-proximos-eventos.md) | P0 | Widget Próximos Eventos |
| DSH-03 | [DSH-03-pendencias.md](./DSH-03-pendencias.md) | P0 | Widget Pendências |
| DSH-04 | [DSH-04-notificacoes.md](./DSH-04-notificacoes.md) | P1 | Notificações In-App |
| DSH-05 | [DSH-05-busca-global.md](./DSH-05-busca-global.md) | P1 | Busca Global |
| DSH-06 | [DSH-06-responsividade.md](./DSH-06-responsividade.md) | P1 | Responsividade Mobile |
| DSH-07 | [DSH-07-badges-menu.md](./DSH-07-badges-menu.md) | P2 | Badges no Menu |
| DSH-08 | [DSH-08-deep-links.md](./DSH-08-deep-links.md) | P2 | Deep Links |
| DSH-09 | [DSH-09-preferencias.md](./DSH-09-preferencias.md) | P3 | Preferências Dashboard |
