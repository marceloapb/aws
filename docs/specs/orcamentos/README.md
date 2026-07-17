# Specs de Orçamentos (ORC-01 a ORC-13)

## Visão Geral
Especificações para completar o módulo Orçamentos conforme spec §6.

## Tabela Consolidada

| ID | Tipo | Título | Prioridade | Impacto | Esforço |
|---|---|---|---|---|---|
| ORC-01 | Correção | Congelamento de valores do Catálogo | P0 | Alto | Médio |
| ORC-02 | Correção | Máquina de estados duas camadas | P0 | Alto | Médio |
| ORC-03 | Feature | Sistema de N Opções por orçamento | P1 | Crítico | Alto |
| ORC-04 | Feature | Condições de pagamento calculadas | P1 | Alto | Alto |
| ORC-05 | Feature | Integração Agenda — alerta conflito | P1 | Alto | Médio |
| ORC-06 | Feature | Reserva temporária de datas | P1 | Alto | Alto |
| ORC-07 | Feature | Itens de evento por opção | P1 | Alto | Alto |
| ORC-08 | Melhoria | Valor sugerido automático | P2 | Médio | Médio |
| ORC-09 | Melhoria | Expiração automática | P2 | Médio | Médio |
| ORC-10 | Feature | Proposta client-facing | P2 | Médio | Médio |
| ORC-11 | Melhoria | Aceite = compromisso firme | P2 | Médio | Médio |
| ORC-12 | Feature | Notificação ao ADM em nova solicitação | P3 | Baixo | Baixo |
| ORC-13 | Feature | PDF da proposta | P3 | Baixo | Baixo |

## Ordem de Execução
- **Fase 1 (P0):** ORC-01 → ORC-02
- **Fase 2 (P1):** ORC-07 → ORC-03 → ORC-04 → ORC-05 → ORC-06
- **Fase 3 (P2):** ORC-08 → ORC-10 → ORC-09 → ORC-11
- **Fase 4 (P3):** ORC-12, ORC-13
