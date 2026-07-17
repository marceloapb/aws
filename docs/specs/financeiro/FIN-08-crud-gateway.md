# FIN-08: API — CRUD de Gateways (Provedores + Credenciais)

## Metadados
- **ID:** FIN-08
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** FIN-07

## Contexto
O admin configura seus gateways de pagamento: escolhe provedor, insere credenciais (access token, webhook secret), define métodos habilitados e taxas. Corresponde à aba "Gateway" das Configurações (CFG-07/08).

## Escopo
- `apps/backend/src/handlers/financeiro/gateways.js` — NOVO
- `apps/frontend/src/pages/admin/configuracoes/GatewayConfig.jsx` — NOVO
- API: /admin/configuracoes/gateways
- SSM: salvar credenciais

## Fora de Escopo (NÃO TOCAR)
- Adapter de cobrança (FIN-09)
- Webhook (FIN-10)
- Outros módulos

## Spec Técnica

### API
| Método | Rota | Ação |
|---|---|---|
| GET | /admin/configuracoes/gateways | Listar gateways do tenant |
| POST | /admin/configuracoes/gateways | Criar gateway |
| GET | /admin/configuracoes/gateways/:id | Detalhe (sem credenciais em texto) |
| PUT | /admin/configuracoes/gateways/:id | Atualizar |
| DELETE | /admin/configuracoes/gateways/:id | Desativar |
| POST | /admin/configuracoes/gateways/:id/testar | Testar conexão |

### Fluxo de Configuração
```
1. Admin seleciona provedor (Mercado Pago, Stripe, etc.)
2. Sistema exibe campos específicos do provedor:
   - Mercado Pago: access_token, public_key
   - Stripe: secret_key, publishable_key
   - Asaas: api_key
3. Admin preenche credenciais
4. Sistema salva credenciais no SSM (SecureString)
5. Sistema salva config no DynamoDB (sem credenciais)
6. Admin clica "Testar Conexão" → Lambda chama API do provedor
7. Se ok: badge verde "Conectado"
8. Admin define métodos habilitados e taxas
```

### Credenciais no SSM
```
/mbf/{tenant_id}/gateways/{gateway_id}/access_token
/mbf/{tenant_id}/gateways/{gateway_id}/webhook_secret
/mbf/{tenant_id}/gateways/{gateway_id}/public_key
```
- Tipo: SecureString (KMS default)
- IAM: Lambda tem ssm:GetParameter + ssm:PutParameter apenas no path do tenant

### Frontend — GatewayConfig.jsx
- Lista de gateways configurados (cards)
- Botão "+ Novo Gateway"
- Formulário:
  - Select de provedor
  - Campos dinâmicos por provedor
  - Toggle métodos habilitados (PIX, Cartão, Boleto)
  - Campos de taxas
  - Toggle padrao
  - Botão "Testar Conexão"
- Badge: 🟢 Ativo / 🔴 Inativo / 🟡 Não testado
- Credenciais mascaradas na exibição (●●●●●●abc123)

### Testar Conexão
- Lambda chama endpoint de health/me do provedor
- Mercado Pago: GET /v1/payment_methods
- Stripe: GET /v1/balance
- Se 200: "Conexão OK"
- Se erro: exibir mensagem do provedor

## Critérios de Aceite
- [ ] CRUD de gateways funciona
- [ ] Credenciais salvas no SSM (nunca no DynamoDB)
- [ ] Credenciais mascaradas no frontend
- [ ] Testar conexão funciona
- [ ] Campos dinâmicos por provedor
- [ ] Toggle de métodos habilitados
- [ ] Flag padrão funciona
- [ ] Desativar gateway funciona

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FIN-08: CRUD de Gateways.

1. Crie handlers/financeiro/gateways.js: CRUD + testar conexão.
2. Crie pages/admin/configuracoes/GatewayConfig.jsx: formulário dinâmico por provedor.
3. Credenciais em SSM Parameter Store (SecureString).
4. Testar conexão: chamar API do provedor.
5. Mascarar credenciais no frontend.
6. SAM: rotas /admin/configuracoes/gateways.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
