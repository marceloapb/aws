# Módulo Produtos e Serviços (ex-Catálogo) — Specs

## Decisões de Design (§5)
- Renomeado de "Catálogo" para "Produtos e Serviços"
- 3 tipos de Item: servico_principal, produto, adicional
- Pacote NÃO tem preço próprio — desmonta nos itens + desconto
- Congelamento de valores é responsabilidade do módulo Orçamento
- Desativar ≠ excluir (preserva histórico)
- Tipo de Evento (Checklist §27) = Item com tipo 'servico_principal'

## Dependências entre specs:

- **Fase 1 (P0):** PRS-02 → PRS-03 → PRS-04 → PRS-10 (CRUD Item + cálculo)
- **Fase 2 (P1):** PRS-01 | PRS-05 | PRS-06 → PRS-07 → PRS-08 → PRS-12
- **Fase 3 (P2):** PRS-09, PRS-11 (independentes)

## Lista de Specs

| ID | Arquivo | Prioridade | Título |
|---|---|---|---|
| PRS-01 | [PRS-01-crud-categorias.md](./PRS-01-crud-categorias.md) | P1 | CRUD de Categorias |
| PRS-02 | [PRS-02-criar-item.md](./PRS-02-criar-item.md) | P0 | Criar Item (3 tipos) |
| PRS-03 | [PRS-03-listar-itens.md](./PRS-03-listar-itens.md) | P0 | Listar Itens com Filtros |
| PRS-04 | [PRS-04-editar-item.md](./PRS-04-editar-item.md) | P0 | Editar Item |
| PRS-05 | [PRS-05-desativar-item.md](./PRS-05-desativar-item.md) | P1 | Desativar/Reativar Item |
| PRS-06 | [PRS-06-criar-pacote.md](./PRS-06-criar-pacote.md) | P1 | Criar Pacote |
| PRS-07 | [PRS-07-listar-pacotes.md](./PRS-07-listar-pacotes.md) | P1 | Listar Pacotes |
| PRS-08 | [PRS-08-editar-pacote.md](./PRS-08-editar-pacote.md) | P1 | Editar Pacote |
| PRS-09 | [PRS-09-desativar-pacote.md](./PRS-09-desativar-pacote.md) | P2 | Desativar/Reativar Pacote |
| PRS-10 | [PRS-10-calculo-valor.md](./PRS-10-calculo-valor.md) | P0 | Cálculo de Valor |
| PRS-11 | [PRS-11-lista-precos-pdf.md](./PRS-11-lista-precos-pdf.md) | P2 | Gerar Lista de Preços (PDF) |
| PRS-12 | [PRS-12-obter-item-pacote.md](./PRS-12-obter-item-pacote.md) | P1 | Obter Item/Pacote por ID |
