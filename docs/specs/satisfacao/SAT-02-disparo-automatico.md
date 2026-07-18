# SAT-02: Disparo Automático Pós-Entrega

## Metadados
- **ID:** SAT-02
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** SAT-01, ALB-08

## Contexto
Quando o álbum é entregue (evento 'album.entregue'), o sistema agenda o envio da pesquisa de satisfação. Delay configurável (default 3 dias) para dar tempo do cliente ver as fotos.

## Escopo
- `apps/backend/src/handlers/satisfacao/dispararFeedback.js` — NOVO
- EventBridge: consumir 'album.entregue' + schedule de delay

## Fora de Escopo (NÃO TOCAR)
- Tela do cliente (SAT-03)
- Módulo Álbum (ALB-*)
- Follow-up (SAT-10)

## Spec Técnica

### Trigger
```
Evento: 'album.entregue'
Payload: { tenant_id, album_id, cliente_id, orcamento_id }
→ Agendar envio em D+3
```

### Fluxo
```js
async function agendarFeedback(evento) {
  const { tenant_id, album_id, cliente_id, orcamento_id } = evento
  const config = await getConfig(tenant_id)
  const delayDias = config.feedback_delay_dias || 3
  
  // Criar registro FEEDBACK com status='pendente'
  const feedback = await criarFeedback(tenant_id, {
    album_id,
    cliente_id,
    orcamento_id,
    status: 'pendente',
    link_token: gerarToken()
  })
  
  // Agendar envio
  const enviarEm = new Date(Date.now() + delayDias * 24 * 60 * 60 * 1000)
  await criarSchedule({
    nome: `feedback-${feedback.id}`,
    expression: `at(${enviarEm.toISOString().replace('.000Z', '')})`,
    target: 'EnviarFeedbackFunction',
    input: { tenant_id, feedback_id: feedback.id },
    deleteAfterCompletion: true
  })
}
```

### Enviar Pesquisa
```js
async function enviarPesquisa(evento) {
  const { tenant_id, feedback_id } = evento
  const feedback = await getFeedback(tenant_id, feedback_id)
  const cliente = await getCliente(tenant_id, feedback.cliente_id)
  
  const link = `https://app.mbfotos.com.br/feedback/${feedback.id}?token=${feedback.link_token}`
  
  // Email
  await enviarEmail({
    para: cliente.email,
    assunto: 'Como foi sua experiência? ⭐',
    template: 'feedback-convite',
    dados: { nome: cliente.nome, link }
  })
  
  // WhatsApp (se configurado)
  await enviarWhatsApp(tenant_id, cliente.telefone, 'feedback_convite', {
    nome: cliente.nome, link
  })
}
```

### Configuração
| Param | Default | Onde |
|---|---|---|
| feedback_delay_dias | 3 | CONFIG TENANT |
| feedback_expira_dias | 30 | CONFIG TENANT |
| feedback_canal | email+whatsapp | CONFIG TENANT |

### Regras
- Não enviar se cliente já tem feedback respondido para o mesmo álbum
- Não enviar se álbum foi cancelado
- Delay configurável (1-14 dias)
- Se email+WhatsApp falham: log + retry

## Critérios de Aceite
- [ ] Pesquisa agendada ao evento 'album.entregue'
- [ ] Delay configurável
- [ ] Email enviado com link
- [ ] WhatsApp enviado (se configurado)
- [ ] Não duplica pesquisa
- [ ] Schedule deletado após envio

## Prompt Pronto para o Kiro CLI

```
Implemente a spec SAT-02: Disparo Automático de Feedback.

1. Crie handlers/satisfacao/dispararFeedback.js: consumir 'album.entregue'.
2. Criar FEEDBACK com status='pendente'.
3. Agendar envio com delay configurável (default 3 dias).
4. Enviar email + WhatsApp com link.
5. Não duplicar se já existe feedback para o álbum.
6. SAM: trigger EventBridge + schedule.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
