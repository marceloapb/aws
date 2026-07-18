# Módulo Follow-up / Lembretes — Specs

## Decisões de Design (§20 + §5.8)
- Motor central único: observa inércia, dispara régua
- Inversão de dependência: motor NÃO conhece regra de domínio
- Canais agnósticos: SES (email) + WhatsApp Cloud API
- Escalonamento por tentativa: email → WhatsApp
- Teto: 1 msg/cliente/dia, prioridade entre pendências
- Resolução event-driven (domínio emite evento → gatilho fecha)

## Fora de Escopo (confirmado)
- SMS (futuro)
- Push notifications (futuro)
- IA para melhor horário de envio

## Dependências entre specs:

- **Fase 1 (P0):** FLW-01 → FLW-02
- **Fase 2 (P1):** FLW-03 → FLW-04 | FLW-05 → FLW-06 → FLW-07
- **Fase 3 (P2):** FLW-08 | FLW-09 | FLW-10 | FLW-11 | FLW-12 (paralelas)
- **Fase 4 (P3):** FLW-13

## Lista de Specs

| ID | Arquivo | Prioridade | Título |
|---|---|---|---|
| FLW-01 | [FLW-01-crud-reguas.md](./FLW-01-crud-reguas.md) | P0 | CRUD Réguas |
| FLW-02 | [FLW-02-gatilhos-inercia.md](./FLW-02-gatilhos-inercia.md) | P0 | Gatilhos de Inércia |
| FLW-03 | [FLW-03-motor-varredura.md](./FLW-03-motor-varredura.md) | P1 | Motor de Varredura |
| FLW-04 | [FLW-04-disparo-email.md](./FLW-04-disparo-email.md) | P1 | Disparo Email |
| FLW-05 | [FLW-05-disparo-whatsapp.md](./FLW-05-disparo-whatsapp.md) | P1 | Disparo WhatsApp |
| FLW-06 | [FLW-06-escalonamento.md](./FLW-06-escalonamento.md) | P1 | Escalonamento Canal |
| FLW-07 | [FLW-07-teto-prioridade.md](./FLW-07-teto-prioridade.md) | P1 | Teto + Prioridade |
| FLW-08 | [FLW-08-painel-governanca.md](./FLW-08-painel-governanca.md) | P2 | Painel Governança |
| FLW-09 | [FLW-09-tela-reguas.md](./FLW-09-tela-reguas.md) | P2 | Tela Config Réguas |
| FLW-10 | [FLW-10-resolucao-auto.md](./FLW-10-resolucao-auto.md) | P2 | Resolução Automática |
| FLW-11 | [FLW-11-cancelar-silenciar.md](./FLW-11-cancelar-silenciar.md) | P2 | Cancelar/Silenciar |
| FLW-12 | [FLW-12-log-disparos.md](./FLW-12-log-disparos.md) | P2 | Log de Disparos |
| FLW-13 | [FLW-13-metricas.md](./FLW-13-metricas.md) | P3 | Métricas Eficácia |
