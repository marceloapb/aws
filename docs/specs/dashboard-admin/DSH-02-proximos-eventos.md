# DSH-02: Widget Próximos Eventos

## Metadados
- **ID:** DSH-02
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** DSH-01, AGD-01

## Contexto
Bloco no dashboard com os próximos 5 eventos da agenda, mostrando contagem regressiva, data/hora, local e tipo de evento. Informação essencial para o fotógrafo planejar o dia/semana.

## Escopo
- `apps/backend/src/handlers/dashboard/proximosEventos.js` — NOVO
- `apps/frontend/src/components/dashboard/ProximosEventos.jsx` — NOVO
- API: GET /admin/dashboard/proximos-eventos

## Fora de Escopo (NÃO TOCAR)
- Agenda completa (AGD-*)
- Pendências (DSH-03)
- Shell (DSH-01 — já feito)

## Spec Técnica

### API — GET /admin/dashboard/proximos-eventos
Query params: `limit` (default 5)

```json
{
  "eventos": [
    {
      "id": "evt_001",
      "titulo": "Casamento Ana & Pedro",
      "tipo_evento": "Casamento",
      "data": "2026-07-25T15:00:00Z",
      "hora_inicio": "15:00",
      "hora_fim": "22:00",
      "local": "Espaço Villa Garden",
      "cidade": "São Paulo - SP",
      "contagem_regressiva": {
        "dias": 8,
        "texto": "em 8 dias"
      },
      "status": "confirmado",
      "cliente_nome": "Ana Carolina"
    },
    {
      "id": "evt_002",
      "titulo": "Ensaio Pré-Wedding",
      "tipo_evento": "Ensaio",
      "data": "2026-07-20T10:00:00Z",
      "hora_inicio": "10:00",
      "hora_fim": "12:00",
      "local": "Parque Ibirapuera",
      "cidade": "São Paulo - SP",
      "contagem_regressiva": {
        "dias": 3,
        "texto": "em 3 dias"
      },
      "status": "confirmado",
      "cliente_nome": "Maria Lima"
    }
  ],
  "total_mes": 6,
  "proximo_livre": "2026-07-22"
}
```

### Backend
```js
async function getProximosEventos(tenantId, limit = 5) {
  const agora = new Date().toISOString()
  
  // Query: eventos com data >= agora, status != cancelado, limit
  const eventos = await queryEventos(tenantId, {
    filtro: 'data >= :agora AND status <> :cancelado',
    valores: { ':agora': agora, ':cancelado': 'cancelado' },
    limit,
    ordem: 'ASC' // Mais próximo primeiro
  })
  
  // Calcular contagem regressiva
  return eventos.map(evt => ({
    ...evt,
    contagem_regressiva: calcularContagemRegressiva(evt.data)
  }))
}

function calcularContagemRegressiva(dataEvento) {
  const agora = new Date()
  const evento = new Date(dataEvento)
  const diffMs = evento - agora
  const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
  if (dias === 0) return { dias: 0, texto: 'Hoje!' }
  if (dias === 1) return { dias: 1, texto: 'Amanhã' }
  if (dias <= 7) return { dias, texto: `em ${dias} dias` }
  return { dias, texto: `em ${dias} dias` }
}
```

### Frontend — ProximosEventos.jsx
```jsx
function ProximosEventos({ eventos }) {
  if (!eventos?.length) {
    return <EmptyState icon="📅" message="Nenhum evento próximo" />
  }
  
  return (
    <div className="widget proximos-eventos">
      <div className="widget-header">
        <h2>📅 Próximos Eventos</h2>
        <Link to="/admin/agenda">Ver todos →</Link>
      </div>
      <div className="widget-body">
        {eventos.map(evt => (
          <div key={evt.id} className="evento-card-mini">
            <div className="evento-countdown">
              <span className="countdown-dias">{evt.contagem_regressiva.dias}</span>
              <span className="countdown-label">dias</span>
            </div>
            <div className="evento-info">
              <h4>{evt.titulo}</h4>
              <p className="evento-meta">
                📅 {formatarData(evt.data)} · ⏰ {evt.hora_inicio}
              </p>
              <p className="evento-local">📍 {evt.local}</p>
            </div>
            <span className={`badge badge-${evt.tipo_evento.toLowerCase()}`}>
              {evt.tipo_evento}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Destaques Visuais
| Contagem | Estilo |
|---|---|
| Hoje | Vermelho pulsante |
| 1-3 dias | Laranja |
| 4-7 dias | Amarelo |
| > 7 dias | Cinza |

### Regras
- Máximo 5 eventos (configurável)
- Ordenar por data ASC (mais próximo primeiro)
- Excluir cancelados
- Contagem regressiva em tempo real (client-side)
- Link para agenda completa
- Empty state se nenhum evento

## Critérios de Aceite
- [ ] Lista até 5 próximos eventos
- [ ] Contagem regressiva (dias)
- [ ] Cores por urgência
- [ ] Exclui cancelados
- [ ] Link "Ver todos" para agenda
- [ ] Empty state
- [ ] Data, hora, local exibidos

## Prompt Pronto para o Kiro CLI

```
Implemente a spec DSH-02: Widget Próximos Eventos.

1. Crie handlers/dashboard/proximosEventos.js: GET /admin/dashboard/proximos-eventos.
2. Crie components/dashboard/ProximosEventos.jsx.
3. Query eventos futuros, ordenar ASC, limit 5.
4. Contagem regressiva com cores (hoje=vermelho, 1-3=laranja, 4-7=amarelo).
5. Empty state se sem eventos.
6. SAM: rota GET.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
