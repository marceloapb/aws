# CLI-12: Score/Classificação de Cliente

## Metadados
- **ID:** CLI-12
- **Tipo:** Feature
- **Prioridade:** P3
- **Impacto:** Baixo
- **Esforço:** Alto
- **Dependência:** CLI-04

## Contexto
Um score permite ao admin identificar rapidamente clientes de alto valor (VIP), clientes com risco de churn, e priorizar atendimento. Calculado automaticamente com base no histórico.

## Escopo
- `apps/frontend/src/pages/admin/ClienteDetalhe.jsx` — badge score
- `apps/frontend/src/pages/admin/Clientes.jsx` — coluna score, ordenação
- Backend: Lambda `calcularScore` (EventBridge scheduled)
- DynamoDB: campo `score` e `classificacao` no CLIENTE

## Fora de Escopo (NÃO TOCAR)
- Machine Learning (usar regras simples)
- ClienteForm.jsx
- Notificações baseadas em score

## Spec Técnica

### Fórmula do Score (0-100)
```js
function calcularScore(cliente) {
  let score = 0
  
  // Recência (último serviço) — max 30 pts
  const diasUltimoServico = diffDays(now, cliente.ultimo_servico)
  if (diasUltimoServico <= 90) score += 30
  else if (diasUltimoServico <= 180) score += 20
  else if (diasUltimoServico <= 365) score += 10
  
  // Frequência (qtd serviços) — max 30 pts
  if (cliente.total_servicos >= 5) score += 30
  else if (cliente.total_servicos >= 3) score += 20
  else if (cliente.total_servicos >= 1) score += 10
  
  // Valor monetário (total gasto) — max 30 pts
  if (cliente.total_gasto >= 20000) score += 30
  else if (cliente.total_gasto >= 10000) score += 20
  else if (cliente.total_gasto >= 5000) score += 10
  
  // Indicações — max 10 pts
  score += Math.min(cliente.indicacoes * 5, 10)
  
  return score
}
```

### Classificações
| Score | Classificação | Cor | Emoji |
|---|---|---|---|
| 80-100 | VIP | Dourado | ⭐ |
| 60-79 | Premium | Roxo | 💎 |
| 40-59 | Regular | Azul | 👤 |
| 20-39 | Ocasional | Cinza | 🔹 |
| 0-19 | Inativo | Vermelho | ⚪ |

### Recalculação
- EventBridge: schedule diário (02:00 UTC)
- Lambda: scan todos os clientes, recalcular score
- Atualizar campo `score` e `classificacao` no DynamoDB
- Também recalcular on-demand após: novo serviço, pagamento, indicação

### Frontend
- ClienteDetalhe: badge com classificação + score numérico
- Clientes.jsx: coluna "Score" sortable, badge classificação
- Filtro por classificação

## Critérios de Aceite
- [ ] Score calculado corretamente (0-100)
- [ ] Classificação baseada no score
- [ ] Badge colorido no detalhe e listagem
- [ ] Ordenar por score na listagem
- [ ] Filtro por classificação funciona
- [ ] Recálculo diário via EventBridge
- [ ] Recálculo on-demand após evento relevante
- [ ] Score atualiza em tempo real no detalhe

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CLI-12: Score/Classificação de Cliente.

1. Em ClienteDetalhe.jsx: badge classificação + score.
2. Em Clientes.jsx: coluna score, ordenação, filtro por classificação.
3. Backend Lambda calcularScore: fórmula RFM simplificada.
4. EventBridge: schedule diário para recálculo batch.
5. DynamoDB: campos score e classificacao no CLIENTE.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
