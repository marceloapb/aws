# GCL-05: Espelhar Reserva Temporária "[Reserva]"

## Metadados
- **ID:** GCL-05
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** GCL-02

## Contexto
Quando o fotógrafo bloqueia uma data (reserva temporária antes de confirmação), espelhar no Google Calendar com título "[Reserva] Nome do Evento". Quando confirmada, atualizar título removendo "[Reserva]". Se cancelada, deletar do Google.

## Escopo
- `apps/backend/src/handlers/google-calendar/syncReserva.js` — NOVO
- EventBridge: consumir 'agenda.reserva_criada', 'agenda.reserva_confirmada', 'agenda.reserva_cancelada'

## Fora de Escopo (NÃO TOCAR)
- Sync de eventos confirmados (GCL-02 — já trata)
- OAuth (GCL-01)
- Agenda interna (AGD-*)

## Spec Técnica

### Eventos Consumidos
| Evento | Ação no Google |
|---|---|
| agenda.reserva_criada | Insert com título "[Reserva] ..." |
| agenda.reserva_confirmada | Patch: remover "[Reserva]" do título |
| agenda.reserva_cancelada | Delete do Google |

### Criar Reserva no Google
```js
async function espelharReservaCriada(evento) {
  const { tenant_id, evento_id, titulo, data_inicio, data_fim, cliente_nome } = evento
  
  const tokens = await getTokens(tenant_id)
  if (!tokens) return
  
  const oauth2Client = getOAuth2Client(tokens)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  
  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `[Reserva] ${titulo}`,
        description: `Cliente: ${cliente_nome || 'Não informado'}\nStatus: Aguardando confirmação`,
        start: {
          dateTime: data_inicio,
          timeZone: 'America/Sao_Paulo'
        },
        end: {
          dateTime: data_fim,
          timeZone: 'America/Sao_Paulo'
        },
        colorId: '5', // Amarelo (reserva)
        transparency: 'opaque' // Bloqueia horário
      }
    })
    
    await atualizarEvento(tenant_id, evento_id, {
      google_event_id: response.data.id,
      google_sync_status: 'sincronizado'
    })
    
  } catch (error) {
    await enviarParaFilaRetry(tenant_id, 'criar_reserva', evento, error)
  }
}
```

### Confirmar Reserva (Remover prefixo)
```js
async function espelharReservaConfirmada(evento) {
  const { tenant_id, evento_id, google_event_id, titulo } = evento
  
  if (!google_event_id) return
  
  const oauth2Client = getOAuth2Client(await getTokens(tenant_id))
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  
  try {
    await calendar.events.patch({
      calendarId: 'primary',
      eventId: google_event_id,
      requestBody: {
        summary: `${titulo} (via Sistema)`, // Remove [Reserva], adiciona sufixo
        colorId: '9', // Azul (confirmado)
        description: `Status: Confirmado`
      }
    })
    
  } catch (error) {
    await enviarParaFilaRetry(tenant_id, 'confirmar_reserva', evento, error)
  }
}
```

### Cancelar Reserva
```js
async function espelharReservaCancelada(evento) {
  const { tenant_id, evento_id, google_event_id } = evento
  
  if (!google_event_id) return
  
  const oauth2Client = getOAuth2Client(await getTokens(tenant_id))
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  
  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: google_event_id
    })
  } catch (error) {
    if (error.code !== 404 && error.code !== 410) {
      await enviarParaFilaRetry(tenant_id, 'cancelar_reserva', evento, error)
    }
  }
}
```

### Cores no Google Calendar
| Status | colorId | Cor |
|---|---|---|
| Reserva | 5 | Amarelo |
| Confirmado | 9 | Azul |

### Regras
- Reserva: título com prefixo "[Reserva]" + cor amarela
- Confirmação: remove prefixo, muda cor para azul
- Cancelamento: deleta do Google
- Bloqueia horário (transparency: opaque)
- Mesma lógica de retry do GCL-03

## Critérios de Aceite
- [ ] Reserva criada no Google com "[Reserva]" + amarelo
- [ ] Confirmação remove prefixo e muda para azul
- [ ] Cancelamento deleta do Google
- [ ] Bloqueia horário (opaque)
- [ ] Retry via GCL-03 em caso de falha
- [ ] Ignorar se Google não conectado

## Prompt Pronto para o Kiro CLI

```
Implemente a spec GCL-05: Espelhar Reserva Temporária.

1. Crie handlers/google-calendar/syncReserva.js: 3 eventos.
2. Reserva: insert com "[Reserva]" + colorId 5 (amarelo).
3. Confirmação: patch removendo prefixo, colorId 9 (azul).
4. Cancelamento: delete.
5. Usar retry do GCL-03 em falha.
6. SAM: triggers EventBridge.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
