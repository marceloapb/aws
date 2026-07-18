# MAP-02: Distance Matrix (Distância/Tempo Estúdio → Evento)

## Metadados
- **ID:** MAP-02
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** MAP-01, MAP-07

## Contexto
Calcular distância (km) e tempo estimado (minutos) do estúdio ao local do evento usando Google Distance Matrix API. Cache por par (CEP origem, CEP destino). Exibido na agenda e no orçamento.

## Escopo
- `apps/backend/src/services/distanceService.js` — NOVO
- DynamoDB: entidade DISTANCE_CACHE

## Fora de Escopo (NÃO TOCAR)
- Geocoding (MAP-01 — já faz a conversão)
- Exibição na agenda (MAP-05)
- Exibição no orçamento (MAP-06)

## Spec Técnica

### Entidade DISTANCE_CACHE
```json
{
  "PK": "DISTANCE",
  "SK": "01001000#04001000",
  "cep_origem": "01001-000",
  "cep_destino": "04001-000",
  "distancia_metros": 8500,
  "distancia_km": 8.5,
  "duracao_segundos": 1200,
  "duracao_minutos": 20,
  "duracao_texto": "20 min",
  "distancia_texto": "8,5 km",
  "created_at": "2026-07-17T10:00:00Z",
  "ttl": 1755302400
}
```

### Service — distanceService.js
```js
async function calcularDistancia(tenantId, cepDestino) {
  // 1. Obter origem (estúdio)
  const config = await getConfig(tenantId)
  const estudio = config.endereco_estudio
  if (!estudio || !estudio.lat) {
    return null // Estúdio não configurado
  }
  
  const cepOrigem = estudio.cep.replace(/\D/g, '')
  const cepDest = cepDestino.replace(/\D/g, '')
  
  // 2. Verificar cache
  const cached = await getCacheDistance(cepOrigem, cepDest)
  if (cached) return { ...cached, cache: true }
  
  // 3. Chamar API
  const apiKey = await getApiKey()
  const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
    params: {
      origins: `${estudio.lat},${estudio.lng}`,
      destinations: cepDestino,
      key: apiKey,
      language: 'pt-BR',
      units: 'metric'
    }
  })
  
  const element = response.data.rows[0]?.elements[0]
  if (!element || element.status !== 'OK') {
    return null
  }
  
  const resultado = {
    distancia_metros: element.distance.value,
    distancia_km: Math.round(element.distance.value / 100) / 10,
    distancia_texto: element.distance.text,
    duracao_segundos: element.duration.value,
    duracao_minutos: Math.round(element.duration.value / 60),
    duracao_texto: element.duration.text
  }
  
  // 4. Salvar cache
  await salvarCacheDistance(cepOrigem, cepDest, {
    ...resultado,
    ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 dias
  })
  
  return { ...resultado, cache: false }
}

module.exports = { calcularDistancia }
```

### Cache Strategy
| Cenário | Ação |
|---|---|
| Par (origem, destino) no cache | Retornar direto |
| Par não no cache | Chamar API + salvar |
| API falha | Retornar null + log |
| Estúdio não configurado | Retornar null |

### TTL do Cache
- 30 dias (trânsito varia, mas distância não)
- Poderia ser mais longo, mas 30d é conservador

### Custo
- Distance Matrix API: $5 / 1000 chamadas
- Com cache por par CEP: poucas chamadas reais/mês
- Free tier: 40.000 elements/mês

### Regras
- Origem sempre = estúdio do tenant (MAP-07)
- Cache por par (cep_origem, cep_destino)
- Se estúdio não configurado: retornar null silenciosamente
- Se API falha: não bloquear fluxo
- Unidades: métrico (km, minutos)
- Idioma: pt-BR

## Critérios de Aceite
- [ ] Distância calculada corretamente
- [ ] Cache por par de CEPs
- [ ] Cache hit não chama API
- [ ] TTL 30 dias
- [ ] Retorna km e minutos
- [ ] Se estúdio não configurado: null
- [ ] Se API falha: null (não bloqueia)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec MAP-02: Distance Matrix.

1. Crie services/distanceService.js: calcular distância.
2. Entidade DISTANCE_CACHE (PK=DISTANCE, SK=cepOrigem#cepDestino).
3. Origem = endereço estúdio (MAP-07).
4. Cache por par CEP, TTL 30 dias.
5. Retornar km + minutos.
6. Se falha ou sem config: null.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
