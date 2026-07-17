# WPP-02: Tela de Conexão (Status, Modo, Verificação)

## Metadados
- **ID:** WPP-02
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Médio
- **Dependência:** WPP-01

## Contexto
Primeira tela que o admin vê ao entrar no módulo WhatsApp. Exibe status da conexão, permite configurar credenciais, alternar modo e iniciar verificação.

## Escopo
- `apps/backend/src/handlers/whatsapp/conexao.js` — NOVO
- `apps/frontend/src/pages/admin/WhatsAppConexao.jsx` — NOVO
- API: GET/PUT /admin/whatsapp/conexao, POST /admin/whatsapp/verificar

## Fora de Escopo (NÃO TOCAR)
- Templates (WPP-03)
- Envio (WPP-06)
- Webhook (WPP-11)

## Spec Técnica

### API
| Método | Rota | Ação |
|---|---|---|
| GET | /admin/whatsapp/conexao | Status atual (sem credenciais) |
| PUT | /admin/whatsapp/conexao | Configurar/atualizar |
| POST | /admin/whatsapp/conexao/testar | Testar conexão com a Meta |
| POST | /admin/whatsapp/verificar | Iniciar pedido de verificação |

### GET Response
```json
{
  "configurado": true,
  "ativo": true,
  "modo": "producao",
  "status_verificacao": "verificado",
  "display_phone": "+55 11 99999-9999",
  "nome_exibicao": "Studio MBF",
  "numero_admin": "+5511988887777",
  "limite_conversas_24h": 1000,
  "webhook_url": "https://api.app.com/webhooks/whatsapp",
  "teste_conexao": { "ultimo": "2026-07-17T10:00:00Z", "resultado": "ok" }
}
```

### PUT — Configurar
```json
{
  "token": "EAABx...",
  "phone_number_id": "123456789",
  "waba_id": "2163797757810981",
  "nome_exibicao": "Studio MBF",
  "numero_admin": "+5511988887777",
  "modo": "producao"
}
```

### Testar Conexão
- Chamar GET https://graph.facebook.com/v21.0/{phone_number_id} com token
- Se 200: "Conectado ✅"
- Se 401: "Token inválido ou expirado"
- Se 400: "Phone Number ID inválido"

### Frontend — WhatsAppConexao.jsx
- **Card Status:**
  - 🟢 Conectado / 🔴 Desconectado / 🟡 Modo Teste
  - Número exibido
  - Limite de conversas/24h
- **Formulário de Configuração:**
  - Token (password input, mascarado)
  - Phone Number ID
  - WABA ID
  - Nome de exibição
  - Número admin
  - Toggle modo (teste/produção)
- **Botão Testar Conexão** → badge resultado
- **Seção Verificação:**
  - Status atual (badge)
  - Botão "Solicitar Verificação" (abre link Meta Business)
  - Instruções passo a passo
- **Webhook URL:** exibir URL readonly para colar na Meta

## Critérios de Aceite
- [ ] Configurar credenciais funciona
- [ ] Credenciais salvas em SSM
- [ ] Testar conexão funciona (chama API Meta)
- [ ] Status exibido corretamente
- [ ] Modo teste/produção
- [ ] Webhook URL exibida
- [ ] Número admin configurável
- [ ] Mascarar token na exibição

## Prompt Pronto para o Kiro CLI

```
Implemente a spec WPP-02: Tela de Conexão WhatsApp.

1. Crie handlers/whatsapp/conexao.js: GET/PUT conexão, POST testar.
2. Crie pages/admin/WhatsAppConexao.jsx: card status, formulário, testar.
3. Credenciais em SSM via PUT.
4. Testar: chamar API Meta com token.
5. Webhook URL readonly.
6. SAM: rotas /admin/whatsapp/conexao.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
