# GCL-02: Espelhar Evento (Create/Update/Delete)

## Metadados
- **ID:** GCL-02
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** GCL-01

## Contexto
Quando um evento é criado/atualizado/deletado na agenda interna, espelhar a ação no Google Calendar do admin. Operação assíncrona — falha não bloqueia o fluxo principal.

## Escopo
- `apps/backend/src/handlers/google-calendar/sync.js` — NOVO
- `apps/backend/src/services/googleCalendarService.js` — NOVO
- EventBridge: consumir 'agenda.evento_criado', 'agenda.evento_atualizado', 'agenda.evento_cancelado'

## Fora de Escopo (NÃO TOCAR)
- OAuth (GCL-01)
- Retry (GCL-03 — tratado separadamente)
- Log (GCL-04)
- Agenda interna (AGD-*)

## Spec Técnica

### Eventos Consumidos
| Evento | Ação no Google |
|---|---|
| agenda.evento_criado | calendar.events.insert |
| agenda.evento_atualizado | calendar.events.patch |
| agenda.evento_cancelado | calendar.events.delete |

### Criar Evento no Google
```js
const { google } = require('googleapis')

async function espelharEventoCriado(evento) {
  const { tenant_id, evento_id, titulo, data_inicio, data_fim, local, descricao } = evento
  
  // Obter tokens
  const tokens = await getTokens(tenant_id)
  if (!tokens) return // Google não conectado, ignorar silenciosamente
  
  const oauth2Client = getOAuth2Client(tokens)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  
  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `${titulo} (via Sistema)`,
        description: descricao || '',
        location: local || '',
        start: {
          dateTime: data_inicio,
          timeZone: 'America/Sao_Paulo'
        },
        end: {
          dateTime: data_fim,
          timeZone: 'America/Sao_Paulo'
        },
        colorId: '9' // Azul
      }
    })
    
    // Salvar google_event_id na entidade interna
    await atualizarEvento(tenant_id, evento_id, {
      google_event_id: response.data.id,
      google_sync_status: 'sincronizado',
      google_sync_em: new Date().toISOString()
    })
    
  } catch (error) {
    // Não bloquear — enviar para fila de retry
    await enviarParaFilaRetry(tenant_id, 'criar', evento, error)
  }
}
```

### Atualizar Evento no Google
```js
async function espelharEventoAtualizado(evento) {
  const { tenant_id, evento_id, google_event_id, titulo, data_inicio, data_fim, local } = evento
  
  if (!google_event_id) return // Nunca foi sincronizado
  
  const oauth2Client = getOAuth2Client(await getTokens(tenant_id))
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  
  try {
    await calendar.events.patch({
      calendarId: 'primary',
      eventId: google_event_id,
      requestBody: {
        summary: `${titulo} (via Sistema)`,
        location: local || '',
        start: { dateTime: data_inicio, timeZone: 'America/Sao_Paulo' },
        end: { dateTime: data_fim, timeZone: 'America/Sao_Paulo' }
      }
    })
    
    await atualizarEvento(tenant_id, evento_id, {
      google_sync_status: 'sincronizado',
      google_sync_em: new Date().toISOString()
    })
    
  } catch (error) {
    await enviarParaFilaRetry(tenant_id, 'atualizar', evento, error)
  }
}
```

### Deletar Evento no Google
```js
async function espelharEventoCancelado(evento) {
  const { tenant_id, evento_id, google_event_id } = evento
  
  if (!google_event_id) return
  
  const oauth2Client = getOAuth2Client(await getTokens(tenant_id))
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  
  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: google_event_id
    })
    
    await atualizarEvento(tenant_id, evento_id, {
      google_event_id: null,
      google_sync_status: 'removido'
    })
    
  } catch (error) {
    if (error.code === 404 || error.code === 410) {
      // Já deletado no Google — OK
      return
    }
    await enviarParaFilaRetry(tenant_id, 'deletar', evento, error)
  }
}
```

### Service — googleCalendarService.js
```js
module.exports = {
  getOAuth2Client(tokens) {},
  refreshTokenIfNeeded(tenantId, tokens) {},
  espelharEventoCriado(evento) {},
  espelharEventoAtualizado(evento) {},
  espelharEventoCancelado(evento) {},
  enviarParaFilaRetry(tenantId, acao, evento, error) {}
}
```

### Regras
- **Mão única:** sistema → Google (nunca lê do Google)
- **Falha não bloqueia:** agenda interna funciona independente
- **google_event_id:** salvo na entidade para vincular
- **Título:** sempre com sufixo " (via Sistema)"
- **Timezone:** America/Sao_Paulo (hardcoded por ora)
- **Se Google não conectado:** ignorar silenciosamente (sem erro)
- **Delete 404/410:** tratar como sucesso (já foi deletado)

## Critérios de Aceite
- [ ] Evento criado no Google ao criar na agenda interna
- [ ] Evento atualizado no Google ao editar
- [ ] Evento deletado no Google ao cancelar
- [ ] google_event_id salvo na entidade
- [ ] Título com sufixo " (via Sistema)"
- [ ] Falha não bloqueia fluxo principal
- [ ] Ignorar se Google não conectado
- [ ] Delete 404/410 = sucesso

## Prompt Pronto para o Kiro CLI

```
Implemente a spec GCL-02: Espelhar Evento no Google Calendar.

1. Crie handlers/google-calendar/sync.js: consumir 3 eventos.
2. Crie services/googleCalendarService.js: insert/patch/delete.
3. Criar evento: calendar.events.insert com título + sufixo.
4. Atualizar: calendar.events.patch.
5. Deletar: calendar.events.delete (404/410 = ok).
6. Salvar google_event_id na entidade.
7. Falha → enviar para fila retry (GCL-03).
8. SAM: triggers EventBridge para 3 eventos.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
