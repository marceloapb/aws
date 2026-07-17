# WPP-06: Adapter de Envio (Template + Janela 24h)

## Metadados
- **ID:** WPP-06
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Alto
- **Dependência:** WPP-03, WPP-01

## Contexto
O coração do módulo: Lambda que decide SE pode enviar e COMO enviar. Respeita a regra de janela de 24h da Meta: dentro = texto livre; fora = só template aprovado. Registra log de envio com custo estimado.

## Escopo
- `apps/backend/src/handlers/whatsapp/enviar.js` — NOVO
- `apps/backend/src/services/whatsappSender.js` — NOVO
- API: POST /admin/whatsapp/enviar
- DynamoDB: entidade LOG_WPP

## Fora de Escopo (NÃO TOCAR)
- Webhook inbound (WPP-11)
- Tela de conversas (WPP-13)
- Retry (WPP-09)

## Spec Técnica

### API — POST /admin/whatsapp/enviar
```json
// Via template
{
  "destinatario": "+5511999998888",
  "template_id": "tpl_001",
  "variaveis": { "1": "Ana", "2": "Casamento", "3": "https://link.com" }
}

// Texto livre (só dentro da janela)
{
  "destinatario": "+5511999998888",
  "texto": "Oi Ana, alguma dúvida sobre o orçamento?"
}
```

### Lógica de Decisão
```js
async function enviar(payload) {
  const { destinatario, template_id, texto, variaveis } = payload
  
  // 1. Verificar janela 24h
  const conversa = await getConversa(tenantId, destinatario)
  const dentroJanela = conversa && new Date(conversa.janela_expira_em) > new Date()
  
  // 2. Decidir tipo de envio
  if (texto && !template_id) {
    if (!dentroJanela) {
      throw new Error('FORA_DA_JANELA: Use um template aprovado')
    }
    return await enviarTextoLivre(destinatario, texto)
  }
  
  if (template_id) {
    const template = await getTemplate(template_id)
    if (template.status !== 'aprovado') {
      throw new Error('TEMPLATE_NAO_APROVADO')
    }
    return await enviarTemplate(destinatario, template, variaveis)
  }
}
```

### Enviar Template (Cloud API)
```js
async function enviarTemplate(destinatario, template, variaveis) {
  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: destinatario,
      type: 'template',
      template: {
        name: template.nome,
        language: { code: template.idioma },
        components: montarComponents(template, variaveis)
      }
    })
  })
  return { message_id: response.messages[0].id }
}
```

### Entidade LOG_WPP
```json
{
  "PK": "TENANT#t123",
  "SK": "LOG_WPP#2026-07-17T10:00:00Z#log_001",
  "id": "log_001",
  "destinatario": "+5511999998888",
  "cliente_id": "cli_001",
  "tipo": "template",
  "template_id": "tpl_001",
  "template_nome": "orcamento_enviado",
  "categoria": "utility",
  "dentro_janela": false,
  "custo_estimado": 0.0308,
  "meta_message_id": "wamid.xxx",
  "status": "enviado",
  "tentativas": 1,
  "erro": null,
  "created_at": "2026-07-17T10:00:00Z"
}
```

### Custo Estimado (Brasil, jul/2026)
| Categoria | Dentro Janela | Fora Janela |
|---|---|---|
| utility | Grátis | ~R$ 0,03 |
| marketing | ~R$ 0,05 | ~R$ 0,08 |
| service (texto livre) | Grátis | N/A (bloqueado) |

## Critérios de Aceite
- [ ] Envio via template funciona (Cloud API)
- [ ] Texto livre só dentro da janela
- [ ] Erro claro se fora da janela sem template
- [ ] Erro se template não aprovado
- [ ] LOG_WPP registrado
- [ ] Custo estimado calculado
- [ ] meta_message_id salvo
- [ ] Credenciais do SSM

## Prompt Pronto para o Kiro CLI

```
Implemente a spec WPP-06: Adapter de Envio WhatsApp.

1. Crie services/whatsappSender.js: lógica de janela + envio template/texto.
2. Crie handlers/whatsapp/enviar.js: API endpoint.
3. Verificar janela 24h antes de texto livre.
4. Chamar Cloud API v21.0 para envio.
5. Registrar LOG_WPP com custo estimado.
6. SAM: rota POST /admin/whatsapp/enviar.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
