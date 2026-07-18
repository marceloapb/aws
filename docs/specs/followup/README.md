# Módulo Follow-up / Lembretes — Specs

## Decisões de Design (§20 + §5.8)
- Motor central único: observa inércia, dispara por régua configurável
- Inversão de dependência: motor NÃO conhece regras de domínio
- Canais agnósticos: email (SES) + WhatsApp (Cloud API)
- Escalonamento por tentativa (email → WhatsApp)
- Teto: 1 msg/cliente/dia com prioridade
- Cron diário via EventBridge + SQS para despacho

## Entidades DynamoDB
- REGUA_FOLLOWUP (PK: TENANT#t, SK: REGUA#id)
- GATILHO_INERCIA (PK: TENANT#t, SK: GATILHO#id, GSI1: CLIENTE#c)
- DISPARO (PK: GATILHO#id, SK: DISPARO#tentativa)

## Fora de Escopo (confirmado)
- Chatbot automático (futuro)
- IA para personalização (futuro)
- Push notification mobile

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
| FLW-07 | [FLW-07-teto-diario.md](./FLW-07-teto-diario.md) | P1 | Teto 1/dia |
| FLW-08 | [FLW-08-painel-governanca.md](./FLW-08-painel-governanca.md) | P2 | Painel Governança |
| FLW-09 | [FLW-09-config-reguas-frontend.md](./FLW-09-config-reguas-frontend.md) | P2 | Config Réguas UI |
| FLW-10 | [FLW-10-resolucao-automatica.md](./FLW-10-resolucao-automatica.md) | P2 | Resolução Automática |
| FLW-11 | [FLW-11-cancelamento-silenciar.md](./FLW-11-cancelamento-silenciar.md) | P2 | Cancelar/Silenciar |
| FLW-12 | [FLW-12-log-disparos.md](./FLW-12-log-disparos.md) | P2 | Log de Disparos |
| FLW-13 | [FLW-13-metricas-eficacia.md](./FLW-13-metricas-eficacia.md) | P3 | Métricas Eficácia |
