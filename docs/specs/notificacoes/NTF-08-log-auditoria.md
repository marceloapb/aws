# NTF-08: Log de Entregas + Tela de Auditoria

## Metadados
- **ID:** NTF-08
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio — observabilidade
- **Esforço:** Baixo
- **Dependência:** NTF-03

## Contexto
Tela onde o admin vê o histórico completo de todas as notificações despachadas: qual evento gerou, qual canal foi usado, se deu sucesso ou falha, timestamp. Filtros por período, canal, status, tipo de evento.

## Escopo
- `apps/backend/src/handlers/notificacoes/logAuditoria.js` — NOVO
- `apps/frontend/src/pages/admin/NotificacoesLog.jsx` — NOVO
- DynamoDB: entidade LOG_ENTREGA
- API: GET /admin/notificacoes/log

## Fora de Escopo (NÃO TOCAR)
- Dispatcher (NTF-03 — já registra log)
- Canais (NTF-04/05/06)
- Log de Follow-up (FLW-12 — separado)

## Spec Técnica

### Entidade LOG_ENTREGA
```json
{
  "PK": "TENANT#t123",
  "SK": "LOG_NTF#2026-07-18T10:00:00Z#lntf_001",
  "GSI1PK": "TENANT#t123",
  "GSI1SK": "CANAL#email#2026-07-18",
  "id": "lntf_001",
  "evento_id": "evt_01J5X...",
  "tipo_evento": "orcamento.aceito",
  "regra_id": "rnf_001",
  "destinatario": "admin",
  "canal": "email",
  "destino": "marcelo@studio.com",
  "status": "enviado",
  "erro": null,
  "created_at": "2026-07-18T10:00:00Z"
}
```

### API — GET /admin/notificacoes/log
Query params: `periodo_inicio`, `periodo_fim`, `canal`, `status`, `tipo_evento`, `limit`, `cursor`

```json
{
  "resumo": {
    "total": 120,
    "enviados": 110,
    "falhas": 10,
    "taxa_sucesso": 91.7,
    "por_canal": {
      "inapp": 60,
      "email": 45,
      "whatsapp": 15
    }
  },
  "logs": [
    {
      "id": "lntf_001",
      "tipo_evento": "orcamento.aceito",
      "canal": "email",
      "destinatario": "admin",
      "destino": "marcelo@studio.com",
      "status": "enviado",
      "created_at": "2026-07-18T10:00:00Z"
    }
  ],
  "total": 120,
  "cursor": "next_token"
}
```

### Frontend — NotificacoesLog.jsx
```jsx
function NotificacoesLog() {
  return (
    <div className="ntf-log">
      {/* Resumo */}
      <div className="log-resumo">
        <Card titulo="Total" valor={resumo.total} />
        <Card titulo="Enviados" valor={resumo.enviados} cor="green" />
        <Card titulo="Falhas" valor={resumo.falhas} cor="red" />
        <Card titulo="Taxa Sucesso" valor={`${resumo.taxa_sucesso}%`} />
      </div>
      
      {/* Filtros */}
      <div className="log-filtros">
        <DateRange />
        <Select label="Canal" options={['Todos', 'inapp', 'email', 'whatsapp']} />
        <Select label="Status" options={['Todos', 'enviado', 'falha']} />
        <Select label="Evento" options={tiposEvento} />
      </div>
      
      {/* Tabela */}
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Evento</th>
            <th>Canal</th>
            <th>Destinatário</th>
            <th>Destino</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>{formatDateTime(log.created_at)}</td>
              <td><Badge>{log.tipo_evento}</Badge></td>
              <td>{iconCanal(log.canal)}</td>
              <td>{log.destinatario}</td>
              <td>{log.destino}</td>
              <td><StatusBadge status={log.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <Pagination />
    </div>
  )
}
```

### Regras
- SK com timestamp: ordenar por data DESC
- GSI1: query por canal + data
- Filtros combinam (AND)
- Período default: últimos 7 dias
- Paginação cursor-based (20/página)
- Resumo recalculado por filtro
- Retenção: 90 dias (TTL)

## Critérios de Aceite
- [ ] Lista logs com filtros
- [ ] Filtro por período, canal, status, tipo_evento
- [ ] Resumo com contadores
- [ ] Taxa de sucesso
- [ ] Paginação
- [ ] Ordenado por data DESC
- [ ] Ícone por canal (🔔 📧 📱)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec NTF-08: Log de Auditoria.

1. Crie handlers/notificacoes/logAuditoria.js: GET com filtros.
2. Crie pages/admin/NotificacoesLog.jsx.
3. Entidade LOG_ENTREGA + GSI1.
4. Resumo: total, enviados, falhas, taxa, por_canal.
5. Filtros: período, canal, status, tipo_evento.
6. Paginação cursor-based (20/página).
7. SAM: rota GET.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
