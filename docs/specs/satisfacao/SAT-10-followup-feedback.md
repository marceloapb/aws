# SAT-10: Follow-up Lembrete de Feedback

## Metadados
- **ID:** SAT-10
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** SAT-02

## Contexto
Se o cliente não respondeu a pesquisa de satisfação em 5 dias, enviar um lembrete. Máximo 2 lembretes. Se não respondeu após 2 lembretes: marcar como expirado.

## Escopo
- `apps/backend/src/handlers/satisfacao/followupFeedback.js` — NOVO
- EventBridge: schedules de lembrete

## Fora de Escopo (NÃO TOCAR)
- Disparo inicial (SAT-02)
- Tela (SAT-03)
- Follow-up de contrato (CT-09)

## Spec Técnica

### Régua de Lembretes
| Dia | Canal | Mensagem |
|---|---|---|
| D+5 | Email | "Ainda não recebemos sua avaliação..." |
| D+10 | WhatsApp | "Oi {nome}, gostaríamos muito de saber sua opinião" |
| D+14 | — | Marcar como expirado (sem envio) |

### Fluxo
```js
async function agendarFollowupFeedback(tenantId, feedbackId) {
  const regua = [
    { dia: 5, canal: 'email', template: 'feedback_lembrete_1' },
    { dia: 10, canal: 'whatsapp', template: 'feedback_lembrete_2' },
    { dia: 14, canal: null, acao: 'expirar' }
  ]
  
  for (const etapa of regua) {
    await criarSchedule({
      nome: `fb-followup-${feedbackId}-d${etapa.dia}`,
      expression: `at(${calcularData(etapa.dia)})`,
      target: 'FeedbackFollowupFunction',
      input: { tenantId, feedbackId, etapa },
      deleteAfterCompletion: true
    })
  }
}
```

### Executar Follow-up
```js
async function executarFollowupFeedback(event) {
  const { tenantId, feedbackId, etapa } = event
  const feedback = await getFeedback(tenantId, feedbackId)
  
  // Se já respondido: cancelar régua restante
  if (feedback.status === 'respondido') {
    await cancelarFollowupsRestantes(feedbackId)
    return
  }
  
  if (etapa.acao === 'expirar') {
    await atualizarFeedback(tenantId, feedbackId, { status: 'expirado' })
    return
  }
  
  // Enviar lembrete
  await enviarLembrete(feedback, etapa)
}
```

### Regras
- Cancelar régua ao responder
- Máximo 2 lembretes (não ser invasivo)
- Se expirado: não enviar mais nada
- Tom amigável e não-insistente
- Respeitar opt-out

## Critérios de Aceite
- [ ] Lembretes agendados ao disparo
- [ ] D+5: email, D+10: WhatsApp
- [ ] Cancelar ao responder
- [ ] D+14: expirar sem envio
- [ ] Máximo 2 lembretes
- [ ] Respeitar opt-out

## Prompt Pronto para o Kiro CLI

```
Implemente a spec SAT-10: Follow-up Feedback.

1. Crie handlers/satisfacao/followupFeedback.js: agendar + executar.
2. Régua: D+5 email, D+10 WhatsApp, D+14 expirar.
3. Cancelar schedules ao responder.
4. Máximo 2 lembretes.
5. SAM: EventBridge schedules.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
