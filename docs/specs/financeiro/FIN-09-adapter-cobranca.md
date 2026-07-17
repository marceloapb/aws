# FIN-09: Lambda — Gerar Cobrança via Adapter (Plugável)

## Metadados
- **ID:** FIN-09
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Alto
- **Dependência:** FIN-08

## Contexto
Quando uma cobrança é gerada (FIN-02) ou o admin solicita, o sistema cria a cobrança no gateway externo (gera PIX, boleto, link de cartão). O padrão adapter garante que adicionar um novo provedor é apenas criar um novo arquivo de adapter.

## Escopo
- `apps/backend/src/handlers/financeiro/criarCobrancaGateway.js` — NOVO
- `apps/backend/src/adapters/` — NOVO (pasta de adapters)
- `apps/backend/src/adapters/mercadoPago.js` — NOVO
- `apps/backend/src/adapters/stripe.js` — NOVO
- `apps/backend/src/adapters/asaas.js` — NOVO
- `apps/backend/src/adapters/index.js` — NOVO (factory)
- API: POST /admin/financeiro/cobrancas/:id/gerar-gateway

## Fora de Escopo (NÃO TOCAR)
- Webhook (FIN-10)
- CRUD de gateways (FIN-08)
- Frontend (botão de gerar está em FIN-06)

## Spec Técnica

### Padrão Adapter
```js
// adapters/index.js (factory)
const adapters = {
  mercado_pago: require('./mercadoPago'),
  stripe: require('./stripe'),
  asaas: require('./asaas')
}

function getAdapter(provedor) {
  const adapter = adapters[provedor]
  if (!adapter) throw new Error(`Adapter não encontrado: ${provedor}`)
  return adapter
}
```

### Interface do Adapter
```js
// Cada adapter exporta:
module.exports = {
  criarCobranca: async (credenciais, cobranca, metodo) => {
    // Retorna: { gateway_cobranca_id, gateway_url, qr_code_base64, codigo_pix, vencimento_boleto }
  },
  consultarStatus: async (credenciais, gatewayCobrancaId) => {
    // Retorna: { status, valor_pago, data_pagamento }
  },
  cancelar: async (credenciais, gatewayCobrancaId) => {
    // Retorna: { sucesso: boolean }
  }
}
```

### Fluxo
```
1. Admin clica "Gerar Cobrança" em uma parcela
2. Lambda busca gateway padrão do tenant (ou o escolhido)
3. Lambda busca credenciais do SSM
4. Lambda chama adapter.criarCobranca(credenciais, cobranca, metodo)
5. Adapter faz POST na API do provedor
6. Retorna: gateway_cobranca_id + URL/QR Code
7. Lambda atualiza COBRANCA no DynamoDB com dados do gateway
8. Frontend exibe link/QR Code
```

### Mercado Pago — criarCobranca
```js
// PIX
const response = await fetch('https://api.mercadopago.com/v1/payments', {
  method: 'POST',
  headers: { Authorization: `Bearer ${credenciais.access_token}` },
  body: JSON.stringify({
    transaction_amount: cobranca.valor,
    payment_method_id: 'pix',
    payer: { email: cobranca.cliente_email },
    description: `Parcela ${cobranca.numero_parcela}/${cobranca.total_parcelas}`
  })
})

return {
  gateway_cobranca_id: response.id.toString(),
  gateway_url: response.point_of_interaction.transaction_data.ticket_url,
  qr_code_base64: response.point_of_interaction.transaction_data.qr_code_base64,
  codigo_pix: response.point_of_interaction.transaction_data.qr_code
}
```

### Atualização da COBRANCA
```json
{
  "gateway_id": "gw_001",
  "gateway_cobranca_id": "12345678",
  "gateway_url": "https://www.mercadopago.com.br/...",
  "gateway_metodo": "pix",
  "gateway_criado_em": "2026-07-17T10:00:00Z"
}
```

### Idempotência
- Se cobrança já tem gateway_cobranca_id: não criar nova, retornar existente
- Evita duplicação de cobrança no provedor

## Critérios de Aceite
- [ ] Factory retorna adapter correto pelo slug
- [ ] Adapter Mercado Pago gera PIX
- [ ] Adapter Mercado Pago gera boleto
- [ ] Credenciais buscadas do SSM
- [ ] COBRANCA atualizada com dados do gateway
- [ ] QR Code retornado para PIX
- [ ] URL retornada para boleto/cartão
- [ ] Idempotência: não duplica cobrança
- [ ] Erro tratado (provedor fora, credenciais inválidas)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-09: Adapter Plugável de Cobrança.

1. Crie pasta adapters/ com index.js (factory) + mercadoPago.js + stripe.js + asaas.js.
2. Interface: criarCobranca, consultarStatus, cancelar.
3. Crie handlers/financeiro/criarCobrancaGateway.js: buscar gateway, SSM, chamar adapter.
4. Atualizar COBRANCA com gateway_cobranca_id + URL.
5. Idempotência: não duplicar cobrança.
6. SAM: rota POST /admin/financeiro/cobrancas/{id}/gerar-gateway.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
