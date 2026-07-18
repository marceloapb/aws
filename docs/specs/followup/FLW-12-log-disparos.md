# FLW-12: Log de Disparos (Histórico + Filtros)

## Metadados
- **ID:** FLW-12
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** FLW-04, FLW-05

## Contexto
Tela com histórico completo de todos os disparos feitos pelo motor de follow-up. Filtros por período, cliente, canal, status, domínio. Útil para auditoria e debug.

## Escopo
- `apps/backend/src/handlers/followup/logDisparos.js` — NOVO
- `apps/frontend/src/pages/admin/FollowupLog.jsx` — NOVO
- API: GET /admin/followup/log

## Fora de Escopo (NÃO TOCAR)
- Disparos em si (FLW-04/05)
- Governança (FLW-08)
- Métricas (FLW-13)

## Spec Técnica

### API — GET /admin/followup/log
Query params: `periodo_inicio`, `periodo_fim`, `cliente_id`, `canal`, `status`, `dominio`, `limit`, `cursor`

```json
{
  "resumo": {
    "total_periodo": 45,
    "enviados": 38,
    "falhas": 7,
    "taxa_sucesso": 84.4,
    "por_canal": { "email": 30, "whatsapp": 15 }
  },
  "disparos": [
    {
      "id": "disp_001",
      "data": "2026-07-17T09:00:00Z",
      "cliente_nome": "Ana Carolina",
      "dominio": "orcamento",
      "recurso_label": "Casamento - R$ 5.500",
      "tentativa": 2,
      "canal": "email",
      "template_id": "tpl_orc_2",
      "status": "enviado",
      "destino": "ana@email.com",
      "erro": null
    }
  ],
  "total": 45,
  "cursor": "next_token"
}
```

### Frontend — FollowupLog.jsx
```jsx
function FollowupLog() {
  return (
    <div className="followup-log">
      {/* Resumo */}
      <div className="log-resumo">
        <Card titulo="Total" valor={resumo.total_periodo} />
        <Card titulo="Enviados" valor={resumo.enviados} cor="green" />
        <Card titulo="Falhas" valor={resumo.falhas} cor="red" />
        <Card titulo="Taxa Sucesso" valor={`${resumo.taxa_sucesso}%`} />
      </div>
      
      {/* Filtros */}
      <div className="log-filtros">
        <DateRange onChange={setPeriodo} />
        <Select label="Canal" options={['Todos', 'email', 'whatsapp']} />
        <Select label="Status" options={['Todos', 'enviado', 'falha']} />
        <Select label="Domínio" options={['Todos', 'orcamento', 'contrato', 'pagamento', 'album', 'feedback']} />
        <SearchInput placeholder="Buscar cliente..." />
      </div>
      
      {/* Tabela */}
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Cliente</th>
            <th>Domínio</th>
            <th>Tentativa</th>
            <th>Canal</th>
            <th>Status</th>
            <th>Destino</th>
          </tr>
        </thead>
        <tbody>
          {disparos.map(d => (
            <tr key={d.id}>
              <td>{formatDateTime(d.data)}</td>
              <td>{d.cliente_nome}</td>
              <td><Badge>{d.dominio}</Badge></td>
              <td>#{d.tentativa}</td>
              <td>{d.canal === 'email' ? '📧' : '📱'}</td>
              <td><StatusBadge status={d.status} /></td>
              <td>{d.destino}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Paginação */}
      <Pagination />
    </div>
  )
}
```

### Regras
- Período default: últimos 30 dias
- Paginação cursor-based (20 por página)
- Filtros combinam (AND)
- Resumo recalculado por filtro
- Exportar CSV (futuro)
- Ordenar por data DESC

## Critérios de Aceite
- [ ] Lista disparos com filtros
- [ ] Filtro por período, canal, status, domínio
- [ ] Resumo com contadores
- [ ] Taxa de sucesso calculada
- [ ] Paginação funciona
- [ ] Ordenado por data DESC

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FLW-12: Log de Disparos.

1. Crie handlers/followup/logDisparos.js: GET com filtros.
2. Crie pages/admin/FollowupLog.jsx.
3. Resumo: total, enviados, falhas, taxa.
4. Filtros: período, canal, status, domínio, cliente.
5. Tabela paginada (cursor-based, 20/página).
6. SAM: rota GET.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
