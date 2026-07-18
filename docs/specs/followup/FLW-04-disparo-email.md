# FLW-04: Disparo por E-mail (SES Adapter)

## Metadados
- **ID:** FLW-04
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** FLW-03

## Contexto
Consumer da fila SQS que dispara email via Amazon SES quando o canal configurado é 'email'. Usa template pré-definido com variáveis do contexto (nome cliente, valor, link de ação). Registra resultado no DISPARO.

## Escopo
- `apps/backend/src/handlers/followup/disparoEmail.js` — NOVO
- `apps/backend/src/templates/followup/` — NOVOS templates HTML
- SQS consumer (trigger da fila)
- SES: envio com template

## Fora de Escopo (NÃO TOCAR)
- Motor de varredura (FLW-03 — já envia para fila)
- WhatsApp (FLW-05)
- Escalonamento (FLW-06)

## Spec Técnica

### SQS Consumer — disparoEmail.js
```js
async function handler(event) {
  for (const record of event.Records) {
    const msg = JSON.parse(record.body)
    
    if (msg.canal !== 'email') continue // Outro consumer trata
    
    try {
      // 1. Buscar dados do cliente
      const cliente = await getCliente(msg.tenantId, msg.cliente_id)
      if (!cliente?.email) {
        await registrarDisparo(msg, 'falha', 'email_nao_encontrado')
        return
      }
      
      // 2. Buscar template
      const template = await getTemplate(msg.template_id)
      
      // 3. Renderizar
      const html = renderTemplate(template, {
        nome: cliente.nome,
        dominio: msg.dominio,
        recurso_id: msg.recurso_id,
        tentativa: msg.tentativa,
        link_acao: gerarLinkAcao(msg)
      })
      
      // 4. Enviar via SES
      await ses.sendEmail({
        Source: getEmailRemetente(msg.tenantId),
        Destination: { ToAddresses: [cliente.email] },
        Message: {
          Subject: { Data: template.assunto },
          Body: { Html: { Data: html } }
        }
      }).promise()
      
      // 5. Registrar sucesso
      await registrarDisparo(msg, 'enviado', null)
      
    } catch (error) {
      await registrarDisparo(msg, 'falha', error.message)
      throw error // SQS retry
    }
  }
}
```

### Templates de Email
```
templates/followup/
├── orcamento-lembrete-1.html   → "Olá {{nome}}, seu orçamento está pronto!"
├── orcamento-lembrete-2.html   → "{{nome}}, ainda está interessado(a)?"
├── orcamento-lembrete-3.html   → "Última chance: orçamento expira em breve"
├── contrato-lembrete.html      → "{{nome}}, seu contrato aguarda assinatura"
├── pagamento-lembrete.html     → "{{nome}}, pagamento em aberto"
├── feedback-convite.html       → "Como foi sua experiência?"
└── album-pronto.html           → "Suas fotos estão prontas!"
```

### Variáveis dos Templates
| Variável | Descrição |
|---|---|
| {{nome}} | Nome do cliente |
| {{valor}} | Valor do orçamento/pagamento |
| {{link_acao}} | Link para ação (aceitar, pagar, etc.) |
| {{data_evento}} | Data do evento |
| {{fotografo_nome}} | Nome do fotógrafo |
| {{tentativa}} | Número da tentativa |

### Entidade DISPARO
```json
{
  "PK": "GATILHO#gat_001",
  "SK": "DISPARO#1#2026-07-17T09:00:00Z",
  "tentativa": 1,
  "canal": "email",
  "destino": "ana@email.com",
  "template_id": "tpl_orc_lembrete_1",
  "status": "enviado",
  "erro": null,
  "enviado_em": "2026-07-17T09:00:00Z"
}
```

### SAM — Trigger SQS
```yaml
DisparoEmailFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: handlers/followup/disparoEmail.handler
    Events:
      SQSTrigger:
        Type: SQS
        Properties:
          Queue: !GetAtt FollowupDispatchQueue.Arn
          BatchSize: 1
          FunctionResponseTypes:
            - ReportBatchItemFailures
```

### Regras
- Consumer filtra por canal='email'
- Se cliente sem email: registrar falha, não retentar
- Se SES falha: throw (SQS retenta até DLQ)
- Registrar DISPARO com status e timestamp
- Template renderizado com variáveis
- Email remetente: configurado no tenant
- Rate limit SES: respeitar quota da conta

## Critérios de Aceite
- [ ] Consumer processa mensagens canal='email'
- [ ] Template renderizado com variáveis
- [ ] Email enviado via SES
- [ ] DISPARO registrado (sucesso ou falha)
- [ ] Se sem email: falha registrada, sem retry
- [ ] Se SES falha: retry via SQS

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FLW-04: Disparo Email.

1. Crie handlers/followup/disparoEmail.js: SQS consumer.
2. Crie templates/followup/: 7 templates HTML.
3. Renderizar template com variáveis do contexto.
4. Enviar via SES.
5. Registrar DISPARO no DynamoDB.
6. Se sem email: falha sem retry. Se SES falha: throw.
7. SAM: SQS trigger, batch 1.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
