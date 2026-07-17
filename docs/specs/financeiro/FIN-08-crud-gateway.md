# FIN-08: API — CRUD de Gateways (Provedores + Credenciais)

## Metadados
- **ID:** FIN-08
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** FIN-07

## Contexto
O admin configura seus gateways de pagamento: escolhe provedor, insere credenciais (access token, webhook secret), define qual é o padrão. Tela em Configurações → Pagamentos (CFG-07).

## Escopo
- `apps/backend/src/handlers/financeiro/gateways.js` — NOVO
- `apps/frontend/src/components/config/GatewayConfig.jsx` — NOVO (ou integrar em CFG-07)
- API: /admin/financeiro/gateways (CRUD)
- SSM: gravar credenciais

## Fora de Escopo (NÃO TOCAR)
- Adapter de cobrança (FIN-09)
- Webhook (FIN-10)
- Página de pagamento do cliente (FIN-11)

## Spec Técnica

### API
| Método | Rota | Ação |
|---|---|---|
| GET | /admin/financeiro/gateways | Listar gateways do tenant |
| POST | /admin/financeiro/gateways | Criar/configurar gateway |
| PUT | /admin/financeiro/gateways/:id | Atualizar (nome, config, padrao) |
| DELETE | /admin/financeiro/gateways/:id | Desativar |
| POST | /admin/financeiro/gateways/:id/testar | Testar conexão |

### Criar Gateway — Payload
```json
{
  "provedor": "mercadopago",
  "nome_exibicao": "Mercado Pago Principal",
  "credenciais": {
    "access_token": "APP_USR-...",
    "public_key": "APP_USR-...",
    "webhook_secret": "whsec_..."
  },
  "config": {
    "sandbox": true,
    "pix_expiracao_minutos": 30
  },
  "padrao": true
}
```

### Fluxo ao Criar
1. Validar provedor (enum válido)
2. Gravar credenciais no SSM (SecureString)
3. Gravar GATEWAY no DynamoDB (sem credenciais! só o ssm_path)
4. Se `padrao=true`: desmarcar padrão anterior
5. Gerar webhook_url única: `https://api.app.com/webhooks/{gateway_id}`

### Testar Conexão
- Chamar API do provedor com as credenciais (ex: GET /v1/payment_methods no MP)
- Retornar: `{ sucesso: true, provedor: 'mercadopago', modo: 'sandbox' }` ou erro

### Frontend — GatewayConfig.jsx
- Cards por provedor configurado (logo + nome + status)
- Modal de configuração:
  - Select provedor (com logo)
  - Campos de credenciais (password inputs)
  - Toggle sandbox/produção
  - Config específica por provedor
  - Botão "Testar Conexão"
  - Botão "Definir como padrão"
- Badge: "Ativo" / "Sandbox" / "Erro"

### Segurança
- Credenciais NUNCA retornadas na API GET (mostrar apenas ***)
- Credenciais gravadas APENAS no SSM
- Lambda: IAM permite ssm:PutParameter e ssm:GetParameter no path específico

## Critérios de Aceite
- [ ] CRUD de gateways funciona
- [ ] Credenciais gravadas no SSM (nunca no DynamoDB)
- [ ] API GET não retorna credenciais (mascaradas)
- [ ] Testar conexão funciona
- [ ] Flag padrão (apenas 1 por tenant)
- [ ] Webhook URL gerada automaticamente
- [ ] Toggle sandbox/produção
- [ ] Cards com logo do provedor

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-08: CRUD de Gateways.

1. Crie handlers/financeiro/gateways.js: CRUD + testar conexão.
2. Crie components/config/GatewayConfig.jsx: cards, modal config, testar.
3. Credenciais em SSM (ssm:PutParameter SecureString).
4. API GET mascara credenciais (****).
5. Flag padrao: apenas 1 por tenant.
6. SAM: rotas /admin/financeiro/gateways, IAM para SSM.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
