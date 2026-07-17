# WPP-14: Notificar Admin Quando Cliente Responde

## Metadados
- **ID:** WPP-14
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** WPP-11

## Contexto
Quando o cliente envia mensagem pelo WhatsApp, o admin recebe notificação imediata (push in-app + opcionalmente no WhatsApp pessoal via WPP-10). Janela acabou de abrir — momento ideal para responder.

## Escopo
- `apps/backend/src/handlers/whatsapp/webhook.js` — ALTERAR (adicionar notificação)
- `apps/frontend/src/components/Notifications.jsx` — ALTERAR (novo tipo)
- EventBridge: evento 'whatsapp.mensagem_recebida'

## Fora de Escopo (NÃO TOCAR)
- Webhook principal (WPP-11 — já existe, só adicionar trigger)
- Aviso no WhatsApp admin (WPP-10 consome o evento)
- Tela de conversas (WPP-13)

## Spec Técnica

### Fluxo
```
1. Webhook recebe mensagem (WPP-11)
2. Após processar: emitir evento 'whatsapp.mensagem_recebida'
3. Consumidores:
   a. Notificação in-app (bell icon) → toast "💬 Ana respondeu: {preview}"
   b. WPP-10 (se configurado): aviso no WhatsApp pessoal do admin
   c. Incrementar badge não-lidas
```

### Notificação In-App
```json
{
  "tipo": "whatsapp_mensagem",
  "titulo": "Nova mensagem WhatsApp",
  "corpo": "💬 Ana Silva: 'Oi, quando fica pronto o álbum?'",
  "link": "/admin/whatsapp/conversas/cli_001",
  "lida": false,
  "created_at": "2026-07-17T10:00:00Z"
}
```

### Entidade NOTIFICACAO_ADMIN
```json
{
  "PK": "TENANT#t123",
  "SK": "NOTIF#2026-07-17T10:00:00Z#notif_001",
  "id": "notif_001",
  "tipo": "whatsapp_mensagem",
  "titulo": "Nova mensagem WhatsApp",
  "corpo": "💬 Ana Silva: 'Oi, quando fica pronto o álbum?'",
  "link": "/admin/whatsapp/conversas/cli_001",
  "lida": false,
  "created_at": "2026-07-17T10:00:00Z"
}
```

### Regras
- Preview da mensagem: max 50 caracteres
- Se mensagem é mídia (foto/áudio): "📷 Enviou uma foto" / "🎵 Enviou um áudio"
- Toast desaparece em 5s
- Badge no ícone de sino (contador)
- Clicar na notificação → navega para conversa
- Marcar como lida ao abrir a conversa

### Frontend — Notifications.jsx
- Adicionar tipo 'whatsapp_mensagem'
- Toast com preview
- Badge contador
- Click → navigate('/admin/whatsapp/conversas/{clienteId}')

## Critérios de Aceite
- [ ] Notificação in-app ao receber mensagem
- [ ] Toast com preview (max 50 chars)
- [ ] Badge contador
- [ ] Click navega para conversa
- [ ] Marcar como lida
- [ ] Mídia: ícone + tipo
- [ ] EventBridge emite evento

## Prompt Pronto para o Kiro CLI

```
Implemente a spec WPP-14: Notificar Admin.

1. Em webhook.js: emitir evento EventBridge 'whatsapp.mensagem_recebida'.
2. Em Notifications.jsx: novo tipo 'whatsapp_mensagem', toast, badge.
3. Entidade NOTIFICACAO_ADMIN no DynamoDB.
4. Click navega para conversa.
5. Preview max 50 chars, mídia com ícone.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
