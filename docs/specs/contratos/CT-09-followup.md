# CT-09: Follow-up Contrato Não Assinado

## Metadados
- **ID:** CT-09
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** CT-05, §20 (Follow-up)

## Contexto
Se o cliente não assina o contrato dentro do prazo, o sistema envia lembretes automáticos (régua). Usa a mesma infraestrutura de follow-up do módulo §20.

## Escopo
- `apps/backend/src/handlers/contratos/followup.js` — NOVO
- EventBridge: schedules de lembrete

## Fora de Escopo (NÃO TOCAR)
- Expiração (CT-07)
- Notificações (CT-08)
- Follow-up de orçamento (módulo ORC)

## Spec Técnica

### Régua de Lembretes (default)
| Dia | Canal | Mensagem |
|---|---|---|
| D+2 | Email | "Lembrete: seu contrato está aguardando assinatura" |
| D+4 | WhatsApp | "Oi {nome}, vi que ainda não assinou o contrato..." |
| D+6 | Email + WhatsApp | "Último lembrete: contrato expira amanhã!" |

### Fluxo
```js
async function agendarFollowupContrato(tenantId, contratoId, prazoDias) {
  const regua = [
    { dia: 2, canal: 'email', template: 'contrato_lembrete_1' },
    { dia: 4, canal: 'whatsapp', template: 'contrato_lembrete_2' },
    { dia: Math.max(prazoDias - 1, 5), canal: 'ambos', template: 'contrato_ultimo_lembrete' }
  ]
  
  for (const etapa of regua) {
    await criarSchedule({
      nome: `ct-followup-${contratoId}-d${etapa.dia}`,
      expression: `at(${calcularData(etapa.dia)})`,
      target: 'ContratoFollowupFunction',
      input: { tenantId, contratoId, etapa },
      deleteAfterCompletion: true
    })
  }
}
```

### Executar Follow-up
```js
async function executarFollowupContrato(event) {
  const { tenantId, contratoId, etapa } = event
  const contrato = await getContrato(tenantId, contratoId)
  
  // Se já assinado: cancelar régua restante
  if (contrato.status !== 'pendente') {
    await cancelarFollowupsRestantes(contratoId)
    return
  }
  
  // Enviar lembrete
  await enviarLembrete(contrato, etapa)
}
```

### Cancelar ao Assinar
```
Evento: 'contrato.assinado'
→ Deletar todos os schedules de followup do contrato
```

### Regras
- Se contrato já assinado: não enviar (verificar antes)
- Se contrato expirado: não enviar
- Cancelar régua ao assinar/expirar/cancelar
- Régua configurável pelo admin (futuro)
- Responder "Não tenho interesse": cancelar régua + notificar admin

## Critérios de Aceite
- [ ] Schedules criados ao gerar contrato
- [ ] Lembretes enviados nos dias corretos
- [ ] Cancelar régua ao assinar
- [ ] Não enviar se já assinado/expirado
- [ ] Email + WhatsApp conforme régua

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CT-09: Follow-up Contrato.

1. Crie handlers/contratos/followup.js: agendar + executar lembretes.
2. Régua: D+2 email, D+4 WhatsApp, D+(prazo-1) ambos.
3. Cancelar schedules ao assinar/expirar.
4. Verificar status antes de enviar.
5. SAM: EventBridge schedules + trigger 'contrato.assinado'.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
