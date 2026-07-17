# Módulo Equipamentos — Specs

## Dependências entre specs:

- **Fase 1 (P0):** EQP-01 → EQP-02 → EQP-03 (fundação de dados e CRUD)
- **Fase 2 (P1):** EQP-04 | EQP-05 → EQP-06 → EQP-07 (painel + checklist)
- **Fase 3 (P2):** EQP-08, EQP-09 (independentes)
- **Fase 4 (P3):** EQP-10 (independente)

## Lista de Specs

| ID | Arquivo | Prioridade | Título |
|---|---|---|---|
| EQP-01 | [EQP-01-modelo-dados.md](./EQP-01-modelo-dados.md) | P0 | Modelo de dados DynamoDB |
| EQP-02 | [EQP-02-crud-categorias.md](./EQP-02-crud-categorias.md) | P0 | CRUD de Categorias |
| EQP-03 | [EQP-03-crud-equipamentos.md](./EQP-03-crud-equipamentos.md) | P0 | CRUD de Equipamentos |
| EQP-04 | [EQP-04-painel-inventario.md](./EQP-04-painel-inventario.md) | P1 | Painel do Inventário |
| EQP-05 | [EQP-05-flag-padrao.md](./EQP-05-flag-padrao.md) | P1 | Flag padrão + auto-inclusão |
| EQP-06 | [EQP-06-modelo-checklist.md](./EQP-06-modelo-checklist.md) | P1 | Modelo de Checklist por Tipo de Evento |
| EQP-07 | [EQP-07-conferencia.md](./EQP-07-conferencia.md) | P1 | Tela de Conferência |
| EQP-08 | [EQP-08-busca-filtros.md](./EQP-08-busca-filtros.md) | P2 | Busca e filtros avançados |
| EQP-09 | [EQP-09-importacao-csv.md](./EQP-09-importacao-csv.md) | P2 | Importação em lote (CSV) |
| EQP-10 | [EQP-10-badge-evento.md](./EQP-10-badge-evento.md) | P3 | Badge no evento |

## Decisões de Design (§27)
- SEM módulo de manutenção
- Equipamento é tabela de domínio (cadastrado uma vez, referenciado)
- Checklist NÃO redigita equipamento em texto livre
- Tipo de evento referencia ITEM do Catálogo (tipo='Serviço Principal')
- Flag 'padrão': equipamento entra automático em todo checklist
- Flag 'ativo': inativo some das seleções sem apagar histórico
- Conferência é efêmera (sem persistência de histórico)
