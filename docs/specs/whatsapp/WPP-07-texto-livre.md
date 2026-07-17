# WPP-07: Envio Texto Livre (Dentro da Janela)

## Metadados
- **ID:** WPP-07
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** WPP-06

## Contexto
Quando o cliente respondeu nas últimas 24h (janela aberta), o admin pode enviar texto livre sem custo adicional. Funciona como chat rápido para tirar dúvidas.

## Escopo
- `apps/backend/src/services/whatsappSender.js` — ALTERAR (adicionar enviarTextoLivre)
- `apps/frontend/src/components/whatsapp/EnvioRapido.jsx` — NOVO

## Fora de Escopo (NÃO TOCAR)
- Template (WPP-06 já cobre)
- Tela de conversas (WPP-13)
- Webhook (WPP-11)

## Spec Técnica

### Enviar Texto Livre (Cloud API)
```js
async function enviarTextoLivre(destinatario, texto) {
  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: destinatario,
      type: 'text',
      text: { body: texto }
    })
  })
  return { message_id: response.messages[0].id }
}
```

### Frontend — EnvioRapido.jsx
- Input de texto + botão enviar
- Indicador de janela: "🟢 Janela aberta (expira em 4h32min)" ou "🔴 Janela fechada — use template"
- Se janela fechada: input desabilitado + sugestão de template
- Max 4096 caracteres
- Suporte a emojis

### Regras
- Verificar janela ANTES de enviar
- Se janela expirou entre abrir tela e clicar enviar: erro amigável
- Registrar LOG_WPP com tipo='texto_livre', custo=0

## Critérios de Aceite
- [ ] Enviar texto livre funciona (dentro da janela)
- [ ] Erro se janela fechada
- [ ] Indicador visual de janela
- [ ] Max 4096 caracteres
- [ ] Log registrado com custo=0
- [ ] Timer de expiração da janela

## Prompt Pronto para o Kiro CLI

```
Implemente a spec WPP-07: Envio Texto Livre.

1. Em services/whatsappSender.js: adicionar enviarTextoLivre (type: text).
2. Crie components/whatsapp/EnvioRapido.jsx: input + indicador janela.
3. Verificar janela antes de enviar.
4. Log com tipo='texto_livre', custo=0.
5. Max 4096 chars, suporte emojis.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
