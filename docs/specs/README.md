# Specs do Projeto MBFoto

Especificações técnicas para implementação via Kiro CLI.

## Índice

| ID | Título | Prioridade | Status |
|----|--------|------------|--------|
| SPEC-CAT-001 | Campos de Fornecedor e Precificação por Custo+Margem para Produtos | P1 | Pendente |

## Ordem de Execução

### Fase 1 — Backend
1. **SPEC-CAT-001** (backend) — criar `catalogoPrecificacaoService.js` + alterar `admin-catalogo.js`
   - Sem dependências externas.

### Fase 2 — Frontend
2. **SPEC-CAT-001** (frontend) — tela de cadastro de Item + Categoria
   - Depende de: Fase 1 concluída.
