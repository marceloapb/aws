# GCL-04: Log de Sincronização + Reenvio Manual

## Metadados
- **ID:** GCL-04
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** GCL-03

## Contexto
Tela admin com log de todas as sincronizações Google Calendar: sucesso, falha, pendente. Admin pode filtrar e reenviar manualmente itens com falha.

## Escopo
- `apps/backend/src/handlers/google-calendar/logSync.js` — NOVO
- `apps/frontend/src/pages/admin/GoogleCalendarLog.jsx` — NOVO
- API: GET /admin/google-calendar/log, POST /admin/google-calendar/reenviar/:id

## Fora de Escopo (NÃO TOCAR)
- Sync principal (GCL-02)
- Retry automático (GCL-03)
- OAuth (GCL-01)

## Spec Técnica

### Entidade LOG_SYNC_GCAL
```json
{
  "PK": "TENANT#t123",
  "SK": "SYNC_GCAL#sync_001",
  "id": "sync_001",
  "evento_id": "evt_001",
  "acao": "criar",
  "status": "sucesso",
  "tentativas": 1,
  "google_event_id": "abc123",
  "erro": null,
  "created_at": "2026-07-18T10:00:00Z",
  "atualizado_em": "2026-07-18T10:01:00Z"
}
```

### Status de Sync
| Status | Descrição |
|---|---|
| sucesso | Sincronizado com Google |
| falha | Todas tentativas falharam (DLQ) |
| pendente | Na fila de retry |
| ignorado | Google não conectado |

### API — GET /admin/google-calendar/log
Query params: `status`, `acao`, `periodo`, `page`

```json
{
  "resumo": {
    "total": 150,
    "sucesso": 142,
    "falha": 5,
    "pendente": 3,
    "taxa_sucesso": 94.7
  },
  "items": [
    {
      "id": "sync_001",
      "evento_titulo": "Casamento Ana",
      "acao": "criar",
      "status": "falha",
      "tentativas": 3,
      "erro": "timeout",
      "created_at": "2026-07-18T10:00:00Z"
    }
  ]
}
```

### API — POST /admin/google-calendar/reenviar/:id
```js
async function reenviarManual(tenantId, syncId) {
  const log = await getLogSync(tenantId, syncId)
  const evento = await getEvento(tenantId, log.evento_id)
  
  // Reenviar para fila
  await enviarParaFilaRetry(tenantId, log.acao, evento, null)
  
  // Atualizar status
  await atualizarLogSync(tenantId, syncId, {
    status: 'pendente',
    tentativas: 0
  })
  
  return { sucesso: true, mensagem: 'Reenviado para sincronização' }
}
```

### Frontend — GoogleCalendarLog.jsx
- **Cards resumo:** Total, Sucesso, Falha, Pendente, Taxa %
- **Filtros:** Status, Ação (criar/atualizar/deletar), Período
- **Lista:**
  - Título do evento, Ação, Status (badge colorido), Tentativas, Data
  - Botão "🔄 Reenviar" (se status=falha)
- **Bulk:** Selecionar múltiplos + "Reenviar Selecionados"

### Regras
- Log criado em todo evento de sync (sucesso ou falha)
- Retenção: 90 dias
- Reenvio manual reseta tentativas
- Bulk reenvio: máximo 20 por vez

## Critérios de Aceite
- [ ] Log registrado em toda sync
- [ ] Listagem com filtros
- [ ] Reenvio manual funciona
- [ ] Cards resumo com taxa de sucesso
- [ ] Bulk reenvio (max 20)
- [ ] Badges coloridos por status

## Prompt Pronto para o Kiro CLI

```
Implemente a spec GCL-04: Log de Sincronização Google Calendar.

1. Crie handlers/google-calendar/logSync.js: listar + reenviar.
2. Crie pages/admin/GoogleCalendarLog.jsx: lista + filtros.
3. Entidade LOG_SYNC_GCAL no DynamoDB.
4. Resumo: total, sucesso, falha, taxa.
5. Reenvio manual: reseta tentativas, reenviar para fila.
6. SAM: rotas GET + POST.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
