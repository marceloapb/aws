# FIN-13: DynamoDB — Modelagem Despesa + DespesaFixa + EntradaManual

## Metadados
- **ID:** FIN-13
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** Nenhuma

## Contexto
O módulo Financeiro completo inclui não só receitas (cobranças) mas também despesas (custos operacionais). O fotógrafo precisa registrar: despesas avulsas, despesas fixas/recorrentes, e entradas manuais (receita fora do sistema).

## Escopo
- `apps/backend/src/models/despesa.js` — NOVO
- DynamoDB: entidades DESPESA, DESPESA_FIXA, ENTRADA_MANUAL, CATEGORIA_DESPESA
- SAM: GSIs

## Fora de Escopo (NÃO TOCAR)
- Cobranças/pagamentos (FIN-01 a FIN-10)
- Frontend
- Rentabilidade (FIN-19)

## Spec Técnica

### Entidade DESPESA
```json
{
  "PK": "TENANT#t123",
  "SK": "DESPESA#dsp_001",
  "GSI1PK": "TENANT#t123",
  "GSI1SK": "DESPESA#2026-07#cat_001",
  "id": "dsp_001",
  "descricao": "Aluguel estúdio",
  "categoria_id": "cat_001",
  "valor": 2500.00,
  "data": "2026-07-01",
  "evento_id": null,
  "recorrente": false,
  "despesa_fixa_id": null,
  "comprovante_s3_key": null,
  "observacao": null,
  "created_at": "2026-07-01T10:00:00Z"
}
```

### Entidade DESPESA_FIXA
```json
{
  "PK": "TENANT#t123",
  "SK": "DESPESA_FIXA#df_001",
  "id": "df_001",
  "descricao": "Aluguel estúdio",
  "categoria_id": "cat_001",
  "valor": 2500.00,
  "dia_vencimento": 1,
  "ativa": true,
  "created_at": "2026-01-01T10:00:00Z"
}
```

### Entidade ENTRADA_MANUAL
```json
{
  "PK": "TENANT#t123",
  "SK": "ENTRADA#ent_001",
  "GSI1PK": "TENANT#t123",
  "GSI1SK": "ENTRADA#2026-07",
  "id": "ent_001",
  "descricao": "Workshop fotografia",
  "valor": 800.00,
  "data": "2026-07-10",
  "categoria": "workshop",
  "observacao": "Curso ministrado sábado",
  "created_at": "2026-07-10T10:00:00Z"
}
```

### Entidade CATEGORIA_DESPESA
```json
{
  "PK": "TENANT#t123",
  "SK": "CAT_DESPESA#cat_001",
  "id": "cat_001",
  "nome": "Aluguel",
  "tipo": "fixa",
  "ativa": true
}
```

### Categorias Sugeridas (seed)
| Nome | Tipo |
|---|---|
| Aluguel | fixa |
| Internet/Telecom | fixa |
| Software/Assinaturas | fixa |
| Transporte/Combustível | variável |
| Alimentação | variável |
| Equipamentos | variável |
| Marketing | variável |
| Impostos | fixa |
| Assistente/Freelancer | variável |
| Outros | variável |

### GSIs
| GSI | PK | SK | Uso |
|---|---|---|---|
| GSI1 | TENANT#id | DESPESA#YYYY-MM#cat_id | Despesas por mês + categoria |
| GSI1 | TENANT#id | ENTRADA#YYYY-MM | Entradas por mês |

## Critérios de Aceite
- [ ] Entidades DESPESA, DESPESA_FIXA, ENTRADA_MANUAL no DynamoDB
- [ ] CATEGORIA_DESPESA com seed
- [ ] GSI1 para query por mês
- [ ] Vínculo opcional com evento_id
- [ ] Flag recorrente na despesa avulsa
- [ ] Model helpers criados

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-13: Modelagem Despesa no DynamoDB.

1. Crie models/despesa.js com helpers CRUD para DESPESA, DESPESA_FIXA, ENTRADA_MANUAL, CATEGORIA_DESPESA.
2. GSI1 para queries por mês.
3. Seed de categorias sugeridas.
4. Vínculo opcional com evento_id.
5. SAM: declarar GSIs.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
