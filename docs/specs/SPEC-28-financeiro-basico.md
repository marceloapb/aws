# SPEC-28 — Financeiro Básico

| Campo | Valor |
|-------|-------|
| ID | GAP-13 / SPEC-28 |
| Tipo | Feature |
| Prioridade | P2 |
| Impacto | Médio |
| Esforço | Médio |

## CONTEXTO

§22 do MVP-1 define módulo financeiro: despesas manuais, entradas (derivadas dos pagamentos), fluxo de caixa e margem por evento.

## ESCOPO (ARQUIVOS E RECURSOS)

- `src/functions/financeiro/criar-despesa.js` — POST /admin/despesas
- `src/functions/financeiro/listar-despesas.js` — GET /admin/despesas
- `src/functions/financeiro/fluxo-caixa.js` — GET /admin/financeiro/fluxo-caixa
- `src/functions/financeiro/margem-evento.js` — GET /admin/financeiro/margem/:orcamento_id
- `template.yaml` — rotas + role

## FORA DE ESCOPO (NÃO TOCAR)

- DRE/balanço contábil
- Integração bancária (OFX)
- Categorias de despesa configuráveis (futuro)
- Qualquer outro arquivo

## SPEC TÉCNICA

### Modelo DynamoDB

```
Despesa: PK=TENANT#1, SK=DESPESA#<ulid>
```

Campos: id, descricao, valor, data, categoria (enum: equipamento|transporte|alimentacao|terceiro|marketing|outros), orcamento_id (opcional — vincula a evento), created_at

### Fluxos

**Criar despesa:** CRUD padrão, validação de campos obrigatórios.

**Listar despesas:** Query com FilterExpression por período + categoria.

**Fluxo de caixa:**
- Input: periodo_inicio, periodo_fim
- Entradas: soma de cobranças pagas no período (query COBRANCA status=paga)
- Saídas: soma de despesas no período
- Retorna: { entradas, saidas, saldo, por_mes: [{mes, entradas, saidas, saldo}] }

**Margem por evento:**
- Receita: valor_final do orçamento
- Custos: soma despesas vinculadas ao orcamento_id
- Retorna: { receita, custos, margem_valor, margem_percentual }

### IAM

Role `FinanceiroFunctionRole`:
- DynamoDB: PutItem, Query (tabela principal)

## CRITÉRIOS DE ACEITE

1. CRUD de despesas funciona
2. Fluxo de caixa retorna totais corretos por período
3. Margem por evento calcula corretamente
4. Despesa pode ser vinculada a orçamento (opcional)
5. Rotas protegidas por grupo admin

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar módulo Financeiro básico conforme spec SPEC-28.
Handlers em src/functions/financeiro/, despesas manuais,
fluxo de caixa e margem por evento.

Alterar SOMENTE:
- template.yaml (rotas, role)
- src/functions/financeiro/*.js (4 handlers)

NÃO refatorar, renomear ou mexer em mais nada.
```
