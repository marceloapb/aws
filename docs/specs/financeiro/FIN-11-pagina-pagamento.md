# FIN-11: Página Pública de Pagamento do Cliente

## Metadados
- **ID:** FIN-11
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** FIN-09

## Contexto
O cliente recebe um link único para pagar sua parcela. A página exibe valor, vencimento, QR code PIX ou redireciona para checkout do gateway. Sem login necessário — acesso via token no URL.

## Escopo
- `apps/frontend/src/pages/cliente/Pagamento.jsx` — NOVO
- `apps/backend/src/handlers/financeiro/paginaPagamento.js` — NOVO
- API: GET /p/:token (rota pública)

## Fora de Escopo (NÃO TOCAR)
- Webhook (FIN-10)
- Visão admin (FIN-06)
- Módulo Orçamentos

## Spec Técnica

### Token
- Formato: JWT ou hash único vinculado à cobrança
- Gerado ao criar cobrança (FIN-02) ou ao admin compartilhar
- Expira junto com a cobrança (ou nunca, para permitir pagamento atrasado)
- Não expõe IDs internos

### URL
- `https://app.dominio.com.br/p/{token}`
- Pública (sem Cognito)

### API — GET /p/:token
```json
{
  "cobranca": {
    "valor": 1500.00,
    "vencimento": "2026-08-01",
    "parcela": "1/3",
    "status": "em_aberto",
    "descricao": "Casamento Ana & João"
  },
  "fotografo": {
    "nome": "Studio MBF",
    "logo_url": "https://..."
  },
  "pagamento": {
    "metodos_disponiveis": ["pix", "cartao"],
    "pix": {
      "qr_code_base64": "...",
      "qr_code_text": "00020126...",
      "expiracao": "2026-07-17T10:30:00Z"
    },
    "cartao_url": "https://checkout.mercadopago.com/..."
  }
}
```

### Frontend — Pagamento.jsx
- Branding do fotógrafo (logo, nome, cores)
- Card com valor e detalhes da parcela
- Aba PIX:
  - QR Code grande (escaneável)
  - Código Copia e Cola (com botão copiar)
  - Timer de expiração
  - Polling de status: a cada 5s verifica se foi pago
  - Ao confirmar: tela de sucesso (confete)
- Aba Cartão:
  - Redirect para checkout do gateway
  - Ou embed do checkout (se suportado)
- Se já paga: mensagem "Pagamento confirmado ✅"
- Se expirada: mensagem + botão "Gerar novo QR Code"

### Polling de Status
```js
// GET /p/:token/status
// Retorna: { status: 'em_aberto' | 'paga' }
// Frontend faz polling a cada 5s enquanto página aberta
```

### Gerar QR Code sob Demanda
- Se PIX expirou: botão "Gerar novo QR Code"
- Chama FIN-09 internamente (cria nova cobrança no gateway)
- Atualiza página com novo QR

## Critérios de Aceite
- [ ] Página acessível via token (sem login)
- [ ] QR Code PIX exibido e escaneável
- [ ] Código copia e cola funciona
- [ ] Polling de status funciona (confirma em tempo real)
- [ ] Tela de sucesso após pagamento
- [ ] Redirect para cartão funciona
- [ ] Logo/nome do fotógrafo exibidos
- [ ] PIX expirado permite gerar novo
- [ ] Token inválido: página de erro

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-11: Página Pública de Pagamento.

1. Crie handlers/financeiro/paginaPagamento.js: GET /p/{token} retorna dados da cobrança + QR code.
2. Crie pages/cliente/Pagamento.jsx: QR code, copia e cola, polling status, aba cartão.
3. Polling: GET /p/{token}/status a cada 5s.
4. Token vinculado à cobrança (sem expor IDs).
5. Branding do fotógrafo (logo, nome).
6. SAM: rotas públicas /p/{token} e /p/{token}/status.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
