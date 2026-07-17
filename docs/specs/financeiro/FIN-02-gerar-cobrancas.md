# FIN-02: Lambda — Gerar Cobranças a Partir do Aceite

## Metadados
- **ID:** FIN-02
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** FIN-01

## Contexto
Quando um orçamento é aceito pelo cliente, o sistema deve gerar automaticamente as cobranças (parcelas) conforme condições de pagamento definidas. Isso conecta o módulo Orçamentos ao Financeiro.

## Escopo
- `apps/backend/src/handlers/financeiro/gerarCobrancas.js` — NOVO
- Trigger: evento de aceite do orçamento (EventBridge ou chamada direta)
- DynamoDB: criar N registros COBRANCA

## Fora de Escopo (NÃO TOCAR)
- Módulo Orçamentos (já existe)
- Gateway (FIN-09)
- Frontend financeiro (FIN-06)

## Spec Técnica

### Trigger
- Quando orçamento muda status para 'aceito'
- Payload: `{ orcamento_id, tenant_id, cliente_id, valor_total, condicoes_pagamento }`

### Condições de Pagamento (vem do orçamento)
```json
{
  "tipo": "parcelado",
  "parcelas": 3,
  "entrada": 1500.00,
  "vencimento_primeira": "2026-08-01",
  "intervalo_dias": 30,
  "metodo_sugerido": "pix"
}
```

### Lógica de Geração
```js
async function gerarCobrancas(orcamento) {
  const { valor_total, condicoes } = orcamento
  const cobrancas = []
  
  if (condicoes.tipo === 'a_vista') {
    // 1 cobrança com valor total
    cobrancas.push({
      numero_parcela: 1,
      total_parcelas: 1,
      valor: valor_total,
      vencimento: condicoes.vencimento_primeira
    })
  } else if (condicoes.tipo === 'parcelado') {
    const valorEntrada = condicoes.entrada || 0
    const valorRestante = valor_total - valorEntrada
    const valorParcela = valorRestante / condicoes.parcelas
    let parcela = 1
    
    // Entrada (se houver)
    if (valorEntrada > 0) {
      cobrancas.push({
        numero_parcela: parcela++,
        total_parcelas: condicoes.parcelas + 1,
        valor: valorEntrada,
        vencimento: condicoes.vencimento_primeira
      })
    }
    
    // Parcelas
    for (let i = 0; i < condicoes.parcelas; i++) {
      const vencimento = addDays(condicoes.vencimento_primeira, (i + 1) * condicoes.intervalo_dias)
      cobrancas.push({
        numero_parcela: parcela++,
        total_parcelas: condicoes.parcelas + (valorEntrada > 0 ? 1 : 0),
        valor: valorParcela,
        vencimento
      })
    }
  }
  
  // Batch write no DynamoDB
  await batchCreateCobrancas(cobrancas, orcamento)
}
```

### Idempotência
- Verificar se já existem cobranças para o orçamento antes de criar
- Se existem: não duplicar (retornar as existentes)
- Identificador de idempotência: orcamento_id

### Arredondamento
- Centavos excedentes vão na última parcela
- Ex: R$ 1000 / 3 = R$ 333,33 + R$ 333,33 + R$ 333,34

## Critérios de Aceite
- [ ] Cobranças geradas automaticamente no aceite
- [ ] Parcelas com valores corretos
- [ ] Vencimentos calculados com intervalo correto
- [ ] Entrada separada (se houver)
- [ ] Arredondamento correto (centavos na última)
- [ ] Idempotência: não duplica se já existe
- [ ] Funciona para à vista e parcelado

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-02: Gerar Cobranças a Partir do Aceite.

1. Crie handlers/financeiro/gerarCobrancas.js: triggered pelo aceite do orçamento.
2. Lógica: à vista (1 cobrança) ou parcelado (entrada + N parcelas).
3. Calcular vencimentos com intervalo em dias.
4. Arredondar centavos na última parcela.
5. Idempotência: não duplicar se cobranças já existem.
6. BatchWriteItem no DynamoDB.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
