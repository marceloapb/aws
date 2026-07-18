# IND-10 — GSIs para Queries Admin

**ID:** IND-10  
**TIPO:** Melhoria  
**PRIORIDADE:** P1  
**IMPACTO:** Médio | **ESFORÇO:** Baixo  

---

## Contexto

O admin precisa de queries eficientes: indicações com suspeita, pendentes, ranking de indicadores. Sem GSI adequado, são Scans na table inteira.

---

## Escopo

- `src/handlers/indicacoes/listIndicacoes.mjs`
- Documentação na §31

## Fora de Escopo (NÃO TOCAR)

- Dados existentes na table.
- GSIs de outros módulos.
- template.yaml (GSI1 já existe).

---

## Spec Técnica

### Análise

O projeto já usa GSI1 (GSI1PK + GSI1SK) pra queries multi-tenant. O §31 reutiliza:

```
GSI1PK: TENANT#<tid>
GSI1SK: IND#<status>#<data_cadastro>#<id>
```

### Queries admin resolvidas com GSI1

| Query | GSI1SK begins_with |
|---|---|
| Todas indicações | `IND#` |
| Só pendentes | `IND#pendente#` |
| Só confirmadas | `IND#confirmada#` |
| Só invalidadas | `IND#invalidada#` |

### Para suspeitas

Usar FilterExpression `flag_suspeita = true` sobre a query por status. Aceitável no volume esperado (<1000 indicações por fotógrafo).

### Para ranking

Não precisa de GSI separado. O handler `listIndicacoes` retorna contagem agrupada por indicador (aggregation em memória — volume baixo).

**Decisão:** usar FilterExpression (sem criar novo GSI). Volume é baixo, custo irrelevante.

---

## Critérios de Aceite

1. Query admin de indicações usa GSI1 com begins_with por status.
2. Filtro de suspeita via FilterExpression (sem GSI adicional).
3. Paginação funciona (LastEvaluatedKey propagado).
4. Nenhum Scan na table principal.

---

## Prompt para o Kiro

```
No handler `src/handlers/indicacoes/listIndicacoes.mjs`, implemente Query no GSI1 com
PK=TENANT#<tid> e SK begins_with conforme filtro de status recebido via querystring.
Aplique FilterExpression para flag_suspeita quando filtro `suspeita=true` for passado.
Retorne items com paginação (LastEvaluatedKey → nextToken).
Altere SOMENTE este arquivo.
```
