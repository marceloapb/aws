# FLW-13: Métricas de Eficácia por Régua

## Metadados
- **ID:** FLW-13
- **Tipo:** Feature
- **Prioridade:** P3
- **Impacto:** Baixo
- **Esforço:** Médio
- **Dependência:** FLW-08, FLW-12

## Contexto
Dashboard de métricas que mostra a eficácia de cada régua: taxa de resolução, tentativa média de conversão, canal mais eficaz, tempo médio até resolução. Ajuda o admin a otimizar suas réguas.

## Escopo
- `apps/backend/src/handlers/followup/metricas.js` — NOVO
- `apps/frontend/src/pages/admin/FollowupMetricas.jsx` — NOVO
- API: GET /admin/followup/metricas

## Fora de Escopo (NÃO TOCAR)
- Configuração de réguas (FLW-09)
- Log (FLW-12)
- Motor (FLW-03)

## Spec Técnica

### API — GET /admin/followup/metricas
Query params: `periodo` (7d|30d|90d), `regua_id`

```json
{
  "periodo": "30d",
  "geral": {
    "total_gatilhos": 50,
    "resolvidos": 35,
    "esgotados": 10,
    "cancelados": 5,
    "taxa_resolucao": 70.0,
    "tempo_medio_resolucao_dias": 4.2,
    "tentativa_media_resolucao": 1.8
  },
  "por_regua": [
    {
      "regua_id": "regua_001",
      "regua_nome": "Orçamento Pendente",
      "gatilhos": 20,
      "resolvidos": 15,
      "taxa_resolucao": 75.0,
      "tentativa_media": 1.6,
      "tempo_medio_dias": 3.8,
      "melhor_canal": "email",
      "por_tentativa": [
        { "tentativa": 1, "resolvidos": 8, "taxa": 40.0 },
        { "tentativa": 2, "resolvidos": 5, "taxa": 25.0 },
        { "tentativa": 3, "resolvidos": 2, "taxa": 10.0 }
      ]
    }
  ],
  "por_canal": {
    "email": { "enviados": 60, "resolvidos_apos": 25, "taxa": 41.6 },
    "whatsapp": { "enviados": 20, "resolvidos_apos": 10, "taxa": 50.0 }
  }
}
```

### Frontend — FollowupMetricas.jsx
```jsx
function FollowupMetricas() {
  return (
    <div className="followup-metricas">
      {/* Seletor de período */}
      <div className="metricas-periodo">
        <button>7 dias</button>
        <button className="active">30 dias</button>
        <button>90 dias</button>
      </div>
      
      {/* KPIs Gerais */}
      <div className="metricas-kpis">
        <KPI titulo="Taxa Resolução" valor="70%" trend="+5%" />
        <KPI titulo="Tempo Médio" valor="4.2 dias" trend="-0.8" />
        <KPI titulo="Tentativa Média" valor="1.8" trend="-0.2" />
        <KPI titulo="Total Gatilhos" valor="50" />
      </div>
      
      {/* Tabela por Régua */}
      <h2>Eficácia por Régua</h2>
      <table>
        <thead>
          <tr>
            <th>Régua</th>
            <th>Gatilhos</th>
            <th>Resolvidos</th>
            <th>Taxa</th>
            <th>Tempo Médio</th>
            <th>Melhor Canal</th>
          </tr>
        </thead>
        <tbody>
          {metricas.por_regua.map(r => (
            <tr key={r.regua_id}>
              <td>{r.regua_nome}</td>
              <td>{r.gatilhos}</td>
              <td>{r.resolvidos}</td>
              <td>{r.taxa_resolucao}%</td>
              <td>{r.tempo_medio_dias}d</td>
              <td>{r.melhor_canal}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Comparação de Canais */}
      <h2>Eficácia por Canal</h2>
      <div className="metricas-canais">
        <CanalCard canal="Email" dados={metricas.por_canal.email} />
        <CanalCard canal="WhatsApp" dados={metricas.por_canal.whatsapp} />
      </div>
    </div>
  )
}
```

### Cálculos
```js
async function calcularMetricas(tenantId, periodo) {
  const dataInicio = subDays(new Date(), periodo)
  
  // Buscar gatilhos do período
  const gatilhos = await queryGatilhosPorPeriodo(tenantId, dataInicio)
  
  // Calcular métricas gerais
  const resolvidos = gatilhos.filter(g => g.status === 'resolvido')
  const taxa = (resolvidos.length / gatilhos.length) * 100
  
  // Tempo médio de resolução
  const tempos = resolvidos.map(g => diasEntre(g.inicio_inercia, g.resolvido_em))
  const tempoMedio = tempos.reduce((a, b) => a + b, 0) / tempos.length
  
  // Tentativa média de resolução
  const tentativas = resolvidos.map(g => g.tentativa_atual)
  const tentativaMedia = tentativas.reduce((a, b) => a + b, 0) / tentativas.length
  
  return { taxa, tempoMedio, tentativaMedia, ... }
}
```

### Regras
- Períodos: 7d, 30d, 90d
- Taxa = resolvidos / total * 100
- Tempo médio = média(resolvido_em - inicio_inercia)
- Tentativa média = média(tentativa_atual dos resolvidos)
- Melhor canal = canal com maior taxa de resolução
- Por tentativa: % resolvidos em cada step
- Trend: comparar com período anterior

## Critérios de Aceite
- [ ] KPIs gerais (taxa, tempo, tentativa)
- [ ] Tabela por régua
- [ ] Comparação de canais
- [ ] Seletor de período funciona
- [ ] Trend calculado vs período anterior
- [ ] Eficácia por tentativa

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FLW-13: Métricas de Eficácia.

1. Crie handlers/followup/metricas.js: GET com período.
2. Crie pages/admin/FollowupMetricas.jsx.
3. KPIs: taxa resolução, tempo médio, tentativa média.
4. Tabela por régua com taxa e melhor canal.
5. Comparação email vs WhatsApp.
6. Seletor 7d/30d/90d.
7. SAM: rota GET.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
