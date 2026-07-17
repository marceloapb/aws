# FIN-09: Lambda — Gerar Cobrança via Adapter (Plugável)

## Metadados
- **ID:** FIN-09
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Alto
- **Dependência:** FIN-08

## Contexto
Quando o admin (ou o sistema) decide cobrar via gateway, a Lambda usa um adapter pattern: interface única → implementação por provedor. O adapter cria a cobrança no provedor externo e retorna URL/QR code para o cliente pagar.

## Escopo
- `apps/backend/src/handlers/financeiro/criarCobrancaGateway.js` — NOVO
- `apps/backend/src/adapters/gateway/index.js` — NOVO (factory)
- `apps/backend/src/adapters/gateway/mercadopago.js` — NOVO
- `apps/backend/src/adapters/gateway/stripe.js` — NOVO (stub)
- API: POST /admin/financeiro/cobrancas/:id/cobrar

## Fora de Escopo (NÃO TOCAR)
- Webhook (FIN-10)
- Página de pagamento (FIN-11)
- CRUD de gateways (FIN-08 — já feito)

## Spec Técnica

### Interface do Adapter
```js
// adapters/gateway/index.js
class GatewayAdapter {
  async criarCobranca(cobranca, config) {
    // Retorna: { gateway_cobranca_id, url_pagamento, qr_code, expiracao }
    throw new Error('Not implemented')
  }
  
  async consultarStatus(gateway_cobranca_id) {
    // Retorna: { status, data_pagamento, valor_pago }
    throw new Error('Not implemented')
  }
  
  async cancelarCobranca(gateway_cobranca_id) {
    throw new Error('Not implemented')
  }
}

function getAdapter(provedor) {
  switch(provedor) {
    case 'mercadopago': return new MercadoPagoAdapter()
    case 'stripe': return new StripeAdapter()
    default: throw new Error(`Provedor ${provedor} não suportado`)
  }
}
```

### Mercado Pago Adapter
```js
// adapters/gateway/mercadopago.js
class MercadoPagoAdapter extends GatewayAdapter {
  async criarCobranca(cobranca, config) {
    const credentials = await getSSMCredentials(config.credenciais_ssm_path)
    
    // POST https://api.mercadopago.com/v1/payments
    const payment = await mpApi.post('/v1/payments', {
      transaction_amount: cobranca.valor,
      description: `Parcela ${cobranca.numero_parcela}/${cobranca.total_parcelas}`,
      payment_method_id: 'pix',
      payer: { email: cobranca.cliente_email },
      date_of_expiration: addMinutes(now(), config.pix_expiracao_minutos)
    })
    
    return {
      gateway_cobranca_id: payment.id.toString(),
      url_pagamento: payment.point_of_interaction?.transaction_data?.ticket_url,
      qr_code: payment.point_of_interaction?.transaction_data?.qr_code_base64,
      qr_code_text: payment.point_of_interaction?.transaction_data?.qr_code,
      expiracao: payment.date_of_expiration
    }
  }
}
```

### API — POST /admin/financeiro/cobrancas/:id/cobrar
```json
// Input (opcional — usa gateway padrão se omitido)
{ "gateway_id": "gw_001", "metodo": "pix" }

// Output
{
  "sucesso": true,
  "url_pagamento": "https://...",
  "qr_code_base64": "data:image/png;base64,...",
  "qr_code_text": "00020126...",
  "expiracao": "2026-07-17T10:30:00Z"
}
```

### Fluxo
```
1. Receber request com cobranca_id
2. Buscar cobrança no DynamoDB
3. Buscar gateway (padrão ou especificado)
4. Buscar credenciais no SSM
5. Instanciar adapter do provedor
6. Chamar adapter.criarCobranca()
7. Atualizar COBRANCA: gateway_id, gateway_cobranca_id, gateway_url
8. Retornar URL/QR code
```

### Idempotência
- Se cobrança já tem gateway_cobranca_id: não criar nova, retornar existente
- Se expirada: criar nova (e invalidar anterior)

## Critérios de Aceite
- [ ] Adapter pattern implementado
- [ ] Mercado Pago funcional (PIX)
- [ ] Stripe stub criado
- [ ] Credenciais do SSM (nunca hardcoded)
- [ ] Cobrança criada no provedor
- [ ] URL/QR code retornados
- [ ] COBRANCA atualizada com gateway_cobranca_id
- [ ] Idempotência: não duplica cobrança
- [ ] Timeout e error handling

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-09: Adapter de Cobrança Plugável.

1. Crie adapters/gateway/index.js: interface + factory (getAdapter).
2. Crie adapters/gateway/mercadopago.js: implementação PIX via API v1.
3. Crie adapters/gateway/stripe.js: stub (throw 'not implemented yet').
4. Crie handlers/financeiro/criarCobrancaGateway.js: orquestra o fluxo.
5. Credenciais via SSM. Idempotência por gateway_cobranca_id.
6. SAM: rota POST /admin/financeiro/cobrancas/{id}/cobrar.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
