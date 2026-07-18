# MAP-02: Distance Matrix (Distância/Tempo Estúdio → Evento)

## Metadados
- **ID:** MAP-02
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** MAP-01, MAP-07

## Contexto
Calcular distância (km) e tempo estimado (min) do estúdio até o local do evento. Usado no card da agenda e no orçamento (para taxa de deslocamento). Cache por par origem-destino.

## Escopo
- `apps/backend/src/services/distanceService.js` — NOVO
- DynamoDB: entidade DISTANCE_CACHE
- Google Distance Matrix API

## Fora de Escopo (NÃO TOCAR)
- Geocoding (MAP-01 — já resolve lat/lng)
- Exibição na agenda (MAP-05)
- Exibição no orçamento (MAP-06)
- Taxa de deslocamento (ORC-*)

## Spec Técnica

### Entidade DISTANCE_CACHE
```json
{
  "PK": "DISTCACHE",
  "SK": "PAIR#-23.5505,-46.6333#-23.5631,-46.6543",
  "origem": { "lat": -23.5505, "lng": -46.6333 },
  "destino": { "lat": -23.5631, "lng": -46.6543 },
  "distancia_metros": 4200,
  "distancia_km": 4.2,
  "duracao_segundos": 900,
  "duracao_min": 15,
  "duracao_texto": "15 min",
  "distancia_texto": "4,2 km",
  "created_at": "2026-07-17T10:00:00Z",
  "ttl": 1784000000
}
```

### Service — distanceService.js
```js
async function calcularDistancia(tenantId, destinoCoords) {
  const config = await getConfig(tenantId)
  const origem = config.endereco_estudio
  
  if (!origem?.lat || !destinoCoords?.lat) {
    return null
  }
  
  const cacheKey = gerarCacheKey(origem, destinoCoords)
  const cached = await getDistanceCache(cacheKey)
  if (cached) return cached
  
  const apiKey = await getApiKey()
  const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
    params: {
      origins: `${origem.lat},${origem.lng}`,
      destinations: `${destinoCoords.lat},${destinoCoords.lng}`,
      mode: 'driving',
      language: 'pt-BR',
      key: apiKey
    }
  })
  
  const elemento = response.data.rows[0]?.elements[0]
  if (!elemento || elemento.status !== 'OK') return null
  
  const resultado = {
    distancia_metros: elemento.distance.value,
    distancia_km: Math.round(elemento.distance.value / 100) / 10,
    distancia_texto: elemento.distance.text,
    duracao_segundos: elemento.duration.value,
    duracao_min: Math.round(elemento.duration.value / 60),
    duracao_texto: elemento.duration.text
  }
  
  await salvarDistanceCache(cacheKey, {
    ...resultado,
    origem,
    destino: destinoCoords,
    ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
  })
  
  return resultado
}

function gerarCacheKey(origem, destino) {
  const oLat = origem.lat.toFixed(4)
  const oLng = origem.lng.toFixed(4)
  const dLat = destino.lat.toFixed(4)
  const dLng = destino.lng.toFixed(4)
  return `PAIR#${oLat},${oLng}#${dLat},${dLng}`
}

module.exports = { calcularDistancia }
```

### Custo
| Cenário | Custo |
|---|---|
| Cache hit | $0 |
| API call | $0.005/chamada |
| Free tier | ~40.000 chamadas/mês grátis |

### Regras
- Coordenadas arredondadas a 4 decimais (~11m precisão)
- TTL cache: 30 dias
- Mode: driving (padrão)
- Se origem ou destino sem coords: retornar null
- Não bloquear fluxo se API falhar

## Critérios de Aceite
- [ ] Distância calculada (km)
- [ ] Tempo estimado (min)
- [ ] Cache por par de coordenadas
- [ ] TTL 30 dias
- [ ] Falha não bloqueia
- [ ] Usa endereço do estúdio como origem
- [ ] Arredondamento 4 decimais

## Prompt Pronto para o Kiro CLI

```
Implemente a spec MAP-02: Distance Matrix.

1. Crie services/distanceService.js: calcularDistancia.
2. Entidade DISTANCE_CACHE no DynamoDB.
3. Cache por par de coordenadas (arredondado 4 decimais).
4. Origem: endereço do estúdio (config tenant).
5. TTL 30 dias.
6. Mode: driving.
7. Retornar null se falhar.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
