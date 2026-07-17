# PRS-10: Cálculo de Valor (Hora Adicional)

## Metadados
- **ID:** PRS-10
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Médio
- **Dependência:** PRS-02

## Contexto
A fórmula de cálculo de valor é consumida pelo módulo Orçamentos ao montar proposta. Para itens do tipo 'servico_principal', o valor depende da duração contratada vs duração base. Para demais tipos, valor é fixo.

## Escopo
- `apps/backend/src/utils/calculoValor.js` — NOVO
- Consumido por: handlers de orçamento ao calcular subtotal
- Testes unitários

## Fora de Escopo (NÃO TOCAR)
- Frontend (cálculo é backend)
- Orçamentos (consumidor)
- Gateway/pagamentos

## Spec Técnica

### Fórmula
```js
/**
 * Calcula o valor de um item com base na duração contratada.
 * 
 * @param {Object} item - Item do catálogo
 * @param {number} horasContratadas - Horas que o cliente contratou (só para servico_principal)
 * @param {number} quantidade - Quantidade do item (default: 1)
 * @returns {Object} { valor_unitario, valor_total, horas_extras, valor_horas_extras }
 */
function calcularValorItem(item, horasContratadas = null, quantidade = 1) {
  let valor_unitario = item.valor_base
  let horas_extras = 0
  let valor_horas_extras = 0
  
  if (item.tipo === 'servico_principal' && horasContratadas) {
    horas_extras = Math.max(0, horasContratadas - item.duracao_base)
    valor_horas_extras = horas_extras * item.valor_hora_adicional
    valor_unitario = item.valor_base + valor_horas_extras
  }
  
  return {
    valor_unitario,
    valor_total: valor_unitario * quantidade,
    horas_extras,
    valor_horas_extras,
    detalhamento: {
      valor_base: item.valor_base,
      duracao_base: item.duracao_base || null,
      horas_contratadas: horasContratadas,
      valor_hora_adicional: item.valor_hora_adicional || null
    }
  }
}
```

### Cálculo do Pacote
```js
/**
 * Calcula o valor de um pacote (soma itens - desconto).
 */
function calcularValorPacote(pacote, horasPorServico = {}) {
  let valor_bruto = 0
  const itens_calculados = []
  
  for (const itemPacote of pacote.itens) {
    const horas = horasPorServico[itemPacote.item_id] || null
    const calculo = calcularValorItem(
      { ...itemPacote, valor_base: itemPacote.valor_unitario },
      horas,
      itemPacote.qtd
    )
    valor_bruto += calculo.valor_total
    itens_calculados.push({ ...itemPacote, ...calculo })
  }
  
  let valor_desconto = 0
  if (pacote.desconto_tipo === 'percentual') {
    valor_desconto = valor_bruto * (pacote.desconto_valor / 100)
  } else if (pacote.desconto_tipo === 'fixo') {
    valor_desconto = pacote.desconto_valor
  }
  
  return {
    valor_bruto,
    valor_desconto,
    valor_final: valor_bruto - valor_desconto,
    itens: itens_calculados
  }
}
```

### Exemplos
| Item | Valor Base | Duração Base | Hora Extra | Contratado | Resultado |
|---|---|---|---|---|---|
| Cobertura Casamento | R$ 3500 | 8h | R$ 250 | 8h | R$ 3.500 |
| Cobertura Casamento | R$ 3500 | 8h | R$ 250 | 10h | R$ 4.000 |
| Cobertura Casamento | R$ 3500 | 8h | R$ 250 | 12h | R$ 4.500 |
| Álbum 30x30 | R$ 1200 | — | — | — | R$ 1.200 |
| Hora Extra Avulsa | R$ 250 | — | — | qtd: 2 | R$ 500 |

### Arredondamento
- Usar 2 casas decimais (centavos)
- Math.round(valor * 100) / 100

## Critérios de Aceite
- [ ] Cálculo correto para servico_principal com horas extras
- [ ] Cálculo correto para servico_principal sem horas extras
- [ ] Cálculo correto para produto/adicional (valor fixo)
- [ ] Cálculo de pacote com desconto percentual
- [ ] Cálculo de pacote com desconto fixo
- [ ] Arredondamento 2 casas
- [ ] Testes unitários cobrindo todos os cenários
- [ ] Função exportada e reutilizável

## Prompt Pronto para o Kiro CLI

```
Implemente a spec PRS-10: Cálculo de Valor.

1. Crie apps/backend/src/utils/calculoValor.js: calcularValorItem + calcularValorPacote.
2. Fórmula: valor_base + max(0, horas_contratadas - duracao_base) × valor_hora_adicional.
3. Pacote: soma itens - desconto (% ou fixo).
4. Arredondamento 2 casas decimais.
5. Testes unitários em __tests__/calculoValor.test.js.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
