# Módulo WhatsApp — Specs

## Decisões de Design (§24)
- Cloud API da Meta (não Twilio/broker)
- Credenciais em SSM Parameter Store
- Janela de 24h: texto livre dentro, só template fora
- Dois números: sistema (fala com cliente) + admin (recebe avisos)
- Retry com backoff + DLQ
- Webhook público com validação HMAC

## Dependências entre specs:

- **Fase 1 (P0):** WPP-01 → WPP-02 → WPP-03 → WPP-06 → WPP-11
- **Fase 2 (P1):** WPP-04, WPP-05 | WPP-07, WPP-08, WPP-09 | WPP-12, WPP-14
- **Fase 3 (P2):** WPP-10, WPP-13, WPP-15
- **Fase 4 (P3):** WPP-16

## Lista de Specs

| ID | Arquivo | Prioridade | Título |
|---|---|---|---|
| WPP-01 | [WPP-01-modelo-conta.md](./WPP-01-modelo-conta.md) | P0 | Modelo ContaWhatsApp + Credenciais |
| WPP-02 | [WPP-02-tela-conexao.md](./WPP-02-tela-conexao.md) | P0 | Tela de Conexão |
| WPP-03 | [WPP-03-crud-templates.md](./WPP-03-crud-templates.md) | P0 | CRUD de Templates |
| WPP-04 | [WPP-04-submeter-template.md](./WPP-04-submeter-template.md) | P1 | Submeter Template à Meta |
| WPP-05 | [WPP-05-sync-status.md](./WPP-05-sync-status.md) | P1 | Listar + Sync Status |
| WPP-06 | [WPP-06-adapter-envio.md](./WPP-06-adapter-envio.md) | P0 | Adapter de Envio |
| WPP-07 | [WPP-07-texto-livre.md](./WPP-07-texto-livre.md) | P1 | Texto Livre (janela) |
| WPP-08 | [WPP-08-log-envios.md](./WPP-08-log-envios.md) | P1 | Log de Envios |
| WPP-09 | [WPP-09-retry.md](./WPP-09-retry.md) | P1 | Retry Automático |
| WPP-10 | [WPP-10-avisar-admin.md](./WPP-10-avisar-admin.md) | P2 | Avisar Admin |
| WPP-11 | [WPP-11-webhook.md](./WPP-11-webhook.md) | P0 | Webhook Meta |
| WPP-12 | [WPP-12-janela-24h.md](./WPP-12-janela-24h.md) | P1 | Controle Janela 24h |
| WPP-13 | [WPP-13-conversas.md](./WPP-13-conversas.md) | P2 | Tela de Conversas |
| WPP-14 | [WPP-14-notificar-admin.md](./WPP-14-notificar-admin.md) | P1 | Notificar Admin (resposta) |
| WPP-15 | [WPP-15-fallback-wame.md](./WPP-15-fallback-wame.md) | P2 | Fallback wa.me link |
| WPP-16 | [WPP-16-dashboard-custos.md](./WPP-16-dashboard-custos.md) | P3 | Dashboard de Custos |
