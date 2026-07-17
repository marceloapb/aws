# WPP-12: Controle de Janela 24h (Abrir/Fechar/Expirar)

## Metadados
- **ID:** WPP-12
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** WPP-11

## Contexto
A janela de 24h é resetada toda vez que o cliente envia mensagem. O sistema precisa controlar: quando a janela abriu, quando expira, e informar o admin sobre o estado atual.

## Escopo
- `apps/backend/src/models/conversa.js` — NOVO
- DynamoDB: entidade CONVERSA_WPP
- Lógica de janela integrada ao sender (WPP-06)

## Fora de Escopo (NÃO TOCAR)
- Webhook (WPP-11 — chama abrir janela)
- Tela de conversas (WPP-13)
- Envio (WPP-06 — consulta janela)

## Spec Técnica

### Entidade CONVERSA_WPP
```json
{
  "PK": "TENANT#t123",
  "SK": "CONVERSA_WPP#cli_001",
  "cliente_id": "cli_001",
  "telefone": "+5511999998888",
  "janela_aberta": true,
  "janela_expira_em": "2026-07-18T10:00:00Z",
  "ultima_msg_cliente": "2026-07-17T10:00:00Z",
  "ultima_msg_sistema": "2026-07-17T09:00:00Z",
  "total_msgs_cliente": 5,
  "total_msgs_sistema": 12,
  "created_at": "2026-07-01T10:00:00Z",
  "updated_at": "2026-07-17T10:00:00Z"
}
```

### Lógica de Janela
```js
async function abrirJanela(tenantId, telefone, clienteId) {
  const expiracao = new Date(Date.now() + 24 * 60 * 60 * 1000) // +24h
  
  await upsertConversa(tenantId, clienteId, {
    telefone,
    janela_aberta: true,
    janela_expira_em: expiracao.toISOString(),
    ultima_msg_cliente: new Date().toISOString()
  })
}

function verificarJanela(conversa) {
  if (!conversa || !conversa.janela_aberta) return false
  return new Date(conversa.janela_expira_em) > new Date()
}
```

### API — GET /admin/whatsapp/janela/:clienteId
```json
{
  "cliente_id": "cli_001",
  "janela_aberta": true,
  "expira_em": "2026-07-18T10:00:00Z",
  "minutos_restantes": 272,
  "ultima_msg_cliente": "2026-07-17T10:00:00Z"
}
```

### Regras
- Janela reseta (novas 24h) a CADA mensagem do cliente
- Janela NÃO reseta com mensagem do sistema
- Se expirou: janela_aberta=false (lazy evaluation, sem job)
- Verificação é lazy: ao tentar enviar, checar se expirou

## Critérios de Aceite
- [ ] Janela aberta ao receber mensagem
- [ ] Expira em 24h
- [ ] Reseta a cada nova mensagem do cliente
- [ ] Verificação lazy (sem job)
- [ ] API retorna status da janela
- [ ] Minutos restantes calculados
- [ ] Integrado com WPP-06 (bloqueia texto livre se fechada)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec WPP-12: Controle de Janela 24h.

1. Crie models/conversa.js: CRUD CONVERSA_WPP.
2. Lógica: abrirJanela (24h), verificarJanela (lazy).
3. API: GET /admin/whatsapp/janela/{clienteId}.
4. Reseta a cada msg do cliente, não reseta com msg sistema.
5. Integrar com WPP-06 (bloqueia texto livre se fechada).

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
