# Módulo Pesquisa de Satisfação — Specs

## Decisões de Design (§12)
- Pesquisa enviada automaticamente após entrega do álbum
- Avaliação: 1-5 estrelas + comentário texto livre
- Dupla trava para depoimento público: cliente autoriza + admin marca
- Pesquisa de recusa: disparada quando orçamento é recusado
- Motivos pré-definidos + campo aberto
- LGPD: consentimento explícito para exibição pública

## Fora de Escopo (confirmado)
- NPS (Net Promoter Score) — futuro
- Pesquisa por SMS
- Integração Google Reviews

## Dependências entre specs:

- **Fase 1 (P0):** SAT-01
- **Fase 2 (P1 — Feedback):** SAT-02 → SAT-03 → SAT-04 → SAT-05
- **Fase 3 (P1 — Recusa):** SAT-06 → SAT-07
- **Fase 4 (P2):** SAT-08 | SAT-09 | SAT-10 (paralelas)
- **Fase 5 (P3):** SAT-11

## Lista de Specs

| ID | Arquivo | Prioridade | Título |
|---|---|---|---|
| SAT-01 | [SAT-01-modelo-dados.md](./SAT-01-modelo-dados.md) | P0 | Modelo de Dados |
| SAT-02 | [SAT-02-disparo-automatico.md](./SAT-02-disparo-automatico.md) | P1 | Disparo Automático Pós-Entrega |
| SAT-03 | [SAT-03-tela-avaliacao.md](./SAT-03-tela-avaliacao.md) | P1 | Tela Pública de Avaliação |
| SAT-04 | [SAT-04-painel-admin.md](./SAT-04-painel-admin.md) | P1 | Painel Admin |
| SAT-05 | [SAT-05-curadoria-depoimentos.md](./SAT-05-curadoria-depoimentos.md) | P1 | Curadoria de Depoimentos |
| SAT-06 | [SAT-06-disparo-recusa.md](./SAT-06-disparo-recusa.md) | P1 | Pesquisa de Recusa — Disparo |
| SAT-07 | [SAT-07-tela-recusa.md](./SAT-07-tela-recusa.md) | P1 | Pesquisa de Recusa — Tela |
| SAT-08 | [SAT-08-dashboard-recusa.md](./SAT-08-dashboard-recusa.md) | P2 | Dashboard Motivos de Recusa |
| SAT-09 | [SAT-09-exibicao-publica.md](./SAT-09-exibicao-publica.md) | P2 | Exibição Pública Depoimentos |
| SAT-10 | [SAT-10-followup-feedback.md](./SAT-10-followup-feedback.md) | P2 | Follow-up Lembrete |
| SAT-11 | [SAT-11-exportar-csv.md](./SAT-11-exportar-csv.md) | P3 | Exportar CSV |
