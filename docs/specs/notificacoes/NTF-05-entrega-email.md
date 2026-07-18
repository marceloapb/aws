# NTF-05: Entrega por E-mail (Adapter SES + Template)

## Metadados
- **ID:** NTF-05
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto — canal externo primário
- **Esforço:** Baixo
- **Dependência:** NTF-03

## Contexto
Adapter que recebe payload do Dispatcher e envia email via Amazon SES. Usa template_ref da regra para buscar template HTML, interpola variáveis do evento, e envia. Registra resultado.

## Escopo
- `apps/backend/src/adapters/notificacoes/emailAdapter.js` — NOVO
- `apps/backend/src/templates/notificacoes/` — templates HTML
- SES: envio via SendEmail API

## Fora de Escopo (NÃO TOCAR)
- Dispatcher (NTF-03 — chama este adapter)
- In-App (NTF-04)
- WhatsApp (NTF-06)
- Templates de Follow-up (FLW-04 — separados)

## Spec Técnica

### Adapter — emailAdapter.js
```js
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses')
const ses = new SESClient({})

async function enviarNotificacaoEmail({ tenantId, destinatarioId, regra, evento, tipoEvento }) {
  // 1. Resolver email do destinatário
  let email
  if (regra.destinatario === 'admin') {
    const config = await getConfigTenant(tenantId)
    email = config.email_admin
  } else {
    const cliente = await getCliente(tenantId, evento.cliente_id)
    email = cliente?.email
  }
  
  if (!email) {
    throw new Error('email_nao_encontrado')
  }
  
  // 2. Buscar e renderizar template
  const template = await getTemplate(regra.template_email)
  const html = interpolar(template.html, {
    nome: evento.cliente_nome,
    titulo_evento: evento.dados?.titulo,
    valor: evento.dados?.valor,
    link: gerarLinkPublico(tipoEvento, evento),
    fotografo_nome: (await getConfigTenant(tenantId)).nome_estudio
  })
  const assunto = interpolar(template.assunto, evento)
  
  // 3. Enviar via SES
  const remetente = await getEmailRemetente(tenantId)
  
  await ses.send(new SendEmailCommand({
    Source: remetente,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: assunto, Charset: 'UTF-8' },
      Body: { Html: { Data: html, Charset: 'UTF-8' } }
    }
  }))
  
  return { canal: 'email', destino: email, status: 'enviado' }
}

module.exports = { enviarNotificacaoEmail }
```

### Templates
```
templates/notificacoes/
├── orcamento-aceito-admin.html
├── contrato-assinado-admin.html
├── pagamento-confirmado-admin.html
├── album-publicado-cliente.html
├── contrato-enviado-cliente.html
├── orcamento-enviado-cliente.html
├── evento-confirmado-cliente.html
└── base-layout.html (wrapper)
```

### Variáveis Disponíveis nos Templates
| Variável | Descrição |
|---|---|
| {{nome}} | Nome do cliente |
| {{titulo_evento}} | Título do orçamento/evento |
| {{valor}} | Valor formatado |
| {{link}} | Link para ação (portal público) |
| {{fotografo_nome}} | Nome do estúdio |
| {{data}} | Data do evento |

### Regras
- Se email não encontrado: registrar falha, não retentar
- Template renderizado com variáveis do evento
- Remetente: email verificado no SES do tenant
- Charset UTF-8 sempre
- Não usar SES Bulk (volumes baixos)
- Respeitar sandbox SES (em dev: emails verificados)

## Critérios de Aceite
- [ ] Adapter envia email via SES
- [ ] Template renderizado com variáveis
- [ ] Admin recebe no email configurado
- [ ] Cliente recebe no email cadastrado
- [ ] Se sem email: erro registrado
- [ ] 7 templates HTML criados

## Prompt Pronto para o Kiro CLI

```
Implemente a spec NTF-05: Entrega Email.

1. Crie adapters/notificacoes/emailAdapter.js.
2. Crie templates/notificacoes/: 7 templates + base-layout.
3. Interpolar variáveis (nome, valor, link, etc.).
4. Enviar via SES SendEmailCommand.
5. Se sem email: throw erro descritivo.
6. Remetente: buscar do config do tenant.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
