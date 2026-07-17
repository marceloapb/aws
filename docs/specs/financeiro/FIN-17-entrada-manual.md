# FIN-17: API — Entrada Manual (Receita por Fora)

## Metadados
- **ID:** FIN-17
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** FIN-13

## Contexto
O fotógrafo tem receitas que não vêm de orçamentos do sistema: workshops, venda de presets, aluguel de estúdio, freelance pontual. Essas entradas devem ser registradas para o fluxo de caixa ser completo.

## Escopo
- `apps/backend/src/handlers/financeiro/entradas.js` — NOVO
- `apps/frontend/src/components/financeiro/EntradaManual.jsx` — NOVO
- API: /admin/financeiro/entradas (CRUD)

## Fora de Escopo (NÃO TOCAR)
- Cobranças (receita do sistema — FIN-01+)
- Despesas (FIN-15)
- Fluxo de caixa (FIN-18)

## Spec Técnica

### API
| Método | Rota | Ação |
|---|---|---|
| GET | /admin/financeiro/entradas | Listar (filtro: mês) |
| POST | /admin/financeiro/entradas | Criar |
| PUT | /admin/financeiro/entradas/:id | Atualizar |
| DELETE | /admin/financeiro/entradas/:id | Excluir |

### Campos
| Campo | Tipo | Obrigatório |
|---|---|---|
| descricao | text | Sim |
| valor | number | Sim (> 0) |
| data | date | Sim |
| categoria | text | Não (livre) |
| observacao | textarea | Não |

### Frontend — EntradaManual.jsx
- Botão "+ Nova Entrada" na tela Financeiro
- Modal com formulário simples
- Lista de entradas do mês
- Total de entradas manuais no mês

## Critérios de Aceite
- [ ] CRUD completo funciona
- [ ] Filtro por mês
- [ ] Total do mês calculado
- [ ] Integra com fluxo de caixa (FIN-18)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-17: Entrada Manual.

1. Crie handlers/financeiro/entradas.js: CRUD.
2. Crie components/financeiro/EntradaManual.jsx: modal + lista.
3. SAM: rotas /admin/financeiro/entradas.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
