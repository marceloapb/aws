# Specs de Importação CSV (IMP-01 a IMP-05)

## Visão Geral
Especificações P1 para corrigir gaps na tela ImportCSV vs. SPEC-35 (Cargas CSV).

## Tabela Consolidada

| ID | Tipo | Título | Prioridade | Impacto | Esforço |
|---|---|---|---|---|---|
| IMP-01 | Melhoria | Seletor multi-entidade + templates CSV | P1 | Alto | Baixo |
| IMP-02 | Feature | Preview/Dry-run com validação visual | P1 | Alto | Médio |
| IMP-03 | Feature | Validação por coluna (tipo, formato, obrigatoriedade) | P1 | Alto | Médio |
| IMP-04 | Feature | Detecção de duplicatas (CPF/email) | P1 | Alto | Médio |
| IMP-05 | Feature | Relatório de erros (linha/coluna/motivo) | P1 | Alto | Baixo |

## Ordem de Execução
IMP-01 → IMP-02 → IMP-03 → IMP-05 → IMP-04

## Dependências
- IMP-02 depende de IMP-01 (precisa saber a entidade)
- IMP-03 depende de IMP-02 (valida no preview)
- IMP-05 depende de IMP-03 (reporta erros da validação)
- IMP-04 depende de IMP-03 (duplicata é um tipo de validação)
