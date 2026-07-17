# Módulo Orçamentos — Specs

## Dependências entre specs:

- **Fase 1 (P0):** ORC-01 → ORC-02 (fundação de dados e estados)
- **Fase 2 (P1):** ORC-07 → ORC-03 → ORC-04 → ORC-05 → ORC-06 (itens → opções → pagamento → agenda)
- **Fase 3 (P2):** ORC-08 → ORC-10 → ORC-09 → ORC-11
- **Fase 4 (P3):** ORC-12, ORC-13 (independentes)

## Lista de Specs

| ID | Arquivo | Prioridade | Título |
|---|---|---|---|
| ORC-01 | [ORC-01-congelamento-valores.md](./ORC-01-congelamento-valores.md) | P0 | Congelamento de valores do Catálogo |
| ORC-02 | [ORC-02-maquina-estados.md](./ORC-02-maquina-estados.md) | P0 | Máquina de estados duas camadas |
| ORC-03 | [ORC-03-sistema-n-opcoes.md](./ORC-03-sistema-n-opcoes.md) | P1 | Sistema de N opções por orçamento |
| ORC-04 | [ORC-04-condicoes-pagamento.md](./ORC-04-condicoes-pagamento.md) | P1 | Condições de pagamento por opção |
| ORC-05 | [ORC-05-integracao-agenda-conflito.md](./ORC-05-integracao-agenda-conflito.md) | P1 | Alerta de conflito com agenda |
| ORC-06 | [ORC-06-reserva-temporaria.md](./ORC-06-reserva-temporaria.md) | P1 | Reserva temporária de datas |
| ORC-07 | [ORC-07-itens-evento-por-opcao.md](./ORC-07-itens-evento-por-opcao.md) | P1 | Itens de evento por opção |
| ORC-08 | [ORC-08-valor-sugerido-automatico.md](./ORC-08-valor-sugerido-automatico.md) | P2 | Valor sugerido automático |
| ORC-09 | [ORC-09-expiracao-automatica.md](./ORC-09-expiracao-automatica.md) | P2 | Expiração automática do orçamento |
| ORC-10 | [ORC-10-proposta-client-facing.md](./ORC-10-proposta-client-facing.md) | P2 | Proposta client-facing |
| ORC-11 | [ORC-11-aceite-compromisso-firme.md](./ORC-11-aceite-compromisso-firme.md) | P2 | Aceite = compromisso firme |
| ORC-12 | [ORC-12-notificacao-adm.md](./ORC-12-notificacao-adm.md) | P3 | Notificação ao ADM |
| ORC-13 | [ORC-13-pdf-proposta.md](./ORC-13-pdf-proposta.md) | P3 | PDF da proposta |

## Arquivos existentes no frontend:
- `Orcamentos.jsx` (10.8 KB) — listagem
- `OrcamentoForm.jsx` (21.7 KB) — formulário
- `OrcamentoDetalhe.jsx` (9.2 KB) — detalhe
