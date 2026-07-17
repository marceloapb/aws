# WPP-13: Tela de Conversas (Timeline por Cliente)

## Metadados
- **ID:** WPP-13
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** WPP-11, WPP-12

## Contexto
Tela estilo chat que mostra a timeline de mensagens trocadas com cada cliente via WhatsApp. Admin vê envios do sistema + respostas do cliente em uma conversa unificada.

## Escopo
- `apps/backend/src/handlers/whatsapp/conversas.js` — NOVO
- `apps/frontend/src/pages/admin/WhatsAppConversas.jsx` — NOVO
- API: GET /admin/whatsapp/conversas, GET /admin/whatsapp/conversas/:clienteId

## Fora de Escopo (NÃO TOCAR)
- Envio (WPP-06/07)
- Webhook (WPP-11)
- Bot/automação de respostas

## Spec Técnica

### Entidade MENSAGEM_WPP (para timeline)
```json
{
  "PK": "CONVERSA#t123#cli_001",
  "SK": "MSG#2026-07-17T10:00:00Z#msg_001",
  "id": "msg_001",
  "direcao": "enviada",
  "tipo": "template",
  "conteudo": "Olá Ana, seu orçamento para Casamento está pronto!",
  "template_nome": "orcamento_enviado",
  "meta_message_id": "wamid.xxx",
  "status": "lido",
  "created_at": "2026-07-17T10:00:00Z"
}
```

### API — GET /admin/whatsapp/conversas
```json
{
  "conversas": [
    {
      "cliente_id": "cli_001",
      "cliente_nome": "Ana Silva",
      "telefone": "+5511999998888",
      "ultima_mensagem": "Oi, quando fica pronto o álbum?",
      "ultima_data": "2026-07-17T10:00:00Z",
      "nao_lidas": 2,
      "janela_aberta": true
    }
  ]
}
```

### API — GET /admin/whatsapp/conversas/:clienteId
```json
{
  "cliente": { "id": "cli_001", "nome": "Ana Silva", "telefone": "+55..." },
  "janela": { "aberta": true, "expira_em": "2026-07-18T10:00:00Z" },
  "mensagens": [
    { "direcao": "enviada", "conteudo": "Orçamento pronto!", "status": "lido", "data": "..." },
    { "direcao": "recebida", "conteudo": "Obrigada! Vou analisar", "data": "..." }
  ]
}
```

### Frontend — WhatsAppConversas.jsx
- **Lista de conversas** (sidebar esquerda):
  - Ordenada por última mensagem
  - Badge de não lidas
  - Indicador de janela (🟢/🔴)
- **Timeline** (área principal):
  - Bolhas de chat (enviada à direita, recebida à esquerda)
  - Status de delivery nos enviados (✓ ✓✓ azul)
  - Horários
  - Templates exibidos formatados
- **Input de envio** (bottom):
  - Se janela aberta: input texto livre
  - Se janela fechada: select de template + variáveis
- **Header da conversa:**
  - Nome, telefone, janela (timer), link para ficha do cliente

## Critérios de Aceite
- [ ] Lista de conversas ordenada
- [ ] Badge não lidas
- [ ] Timeline estilo chat
- [ ] Bolhas enviada/recebida
- [ ] Status delivery (✓ ✓✓)
- [ ] Input texto livre (janela aberta)
- [ ] Select template (janela fechada)
- [ ] Indicador de janela

## Prompt Pronto para o Kiro CLI

```
Implemente a spec WPP-13: Tela de Conversas WhatsApp.

1. Crie handlers/whatsapp/conversas.js: listar conversas + mensagens por cliente.
2. Crie pages/admin/WhatsAppConversas.jsx: sidebar + timeline + input.
3. Bolhas chat, delivery status, badge não lidas.
4. Input: texto livre se janela aberta, template se fechada.
5. SAM: rotas /admin/whatsapp/conversas.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
