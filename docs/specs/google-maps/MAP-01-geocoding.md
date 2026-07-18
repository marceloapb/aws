# MAP-01: Geocoding (Endereço → Coordenadas) + Cache por CEP

## Metadados
- **ID:** MAP-01
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** MAP-07

## Contexto
Converter endereço em coordenadas (lat/lng) usando Google Geocoding API. Cache por CEP no DynamoDB — mesmo CEP nunca chama a API 2x. Usado para Distance Matrix e para o mapa embed.

## Escopo
- `apps/backend/src/services/geocodingService.js` — NOVO
- DynamoDB: entidade GEOCODING_CACHE
- Chave API no SSM

## Fora de Escopo (NÃO TOCAR)
- Distance Matrix (MAP-02)
- Mapa embed (MAP-04)
- Config estúdio (MAP-07 — já feito)

## Spec Técnica

### Entidade GEOCODING_CACHE
```json
{
  "PK": "GEOCACHE",
  "SK": "CEP#01001000",
  "cep": "01001-000",
  "endereco_formatado": "Praça da Sé - Sé, São Paulo - SP, 01001-000",
  "lat": -23.5505,
  "lng": -46.6333,
  "source": "google_geocoding_api",
  "created_at": "2026-07-17T10:00:00Z",
  "ttl": 1752710400
}
```

### Service — geocodingService.js
```js
const axios = require('axios')

async function geocodificar(endereco, cep) {
  // 1. Verificar cache
  const cepLimpo = cep.replace(/\D/g, '')
  const cached = await getCacheGeocoding(cepLimpo)
  if (cached) return { lat: cached.lat, lng: cached.lng, cache: true }
  
  // 2. Chamar Google API
  const apiKey = await getApiKey()
  const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
    params: {
      address: endereco,
      key: apiKey,
      language: 'pt-BR',
      region: 'br'
    }
  })
  
  if (response.data.status !== 'OK' || !response.data.results.length) {
    return null // Endereço não encontrado
  }
  
  const { lat, lng } = response.data.results[0].geometry.location
  const endereco_formatado = response.data.results[0].formatted_address
  
  // 3. Salvar no cache
  await salvarCacheGeocoding(cepLimpo, {
    endereco_formatado,
    lat,
    lng,
    ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 ano
  })
  
  return { lat, lng, endereco_formatado, cache: false }
}

async function getApiKey() {
  const param = await ssm.getParameter({
    Name: '/mbf/global/google/maps_api_key',
    WithDecryption: true
  }).promise()
  return param.Parameter.Value
}

module.exports = { geocodificar, getApiKey }
```

### Cache Strategy
| Cenário | Ação |
|---|---|
| CEP no cache | Retornar direto (0 custo) |
| CEP não no cache | Chamar API + salvar cache |
| API falha | Retornar null + log |
| CEP inválido | Retornar null |

### TTL do Cache
- 1 ano (endereço por CEP não muda)
- DynamoDB TTL limpa automaticamente

### Custo
- Geocoding API: $5 / 1000 chamadas
- Com cache por CEP: na prática, pouquíssimas chamadas/mês
- Free tier: 28.000 chamadas/mês

### Regras
- Sempre verificar cache primeiro
- CEP normalizado (só dígitos) como chave
- API Key no SSM (/mbf/global/google/maps_api_key)
- Region: 'br', Language: 'pt-BR'
- Se API falha: não bloquear fluxo (retornar null)
- Log de todas as chamadas à API (para monitorar custo)

## Critérios de Aceite
- [ ] Geocoding funciona (endereço → lat/lng)
- [ ] Cache por CEP no DynamoDB
- [ ] Cache hit retorna sem chamar API
- [ ] TTL 1 ano
- [ ] API Key no SSM
- [ ] Falha não bloqueia fluxo
- [ ] Log de chamadas à API

## Prompt Pronto para o Kiro CLI

```
Implemente a spec MAP-01: Geocoding + Cache.

1. Crie services/geocodingService.js: geocodificar + cache.
2. Entidade GEOCODING_CACHE no DynamoDB (PK=GEOCACHE, SK=CEP#xxx).
3. Verificar cache antes de chamar API.
4. TTL 1 ano.
5. API Key em SSM /mbf/global/google/maps_api_key.
6. Se falha: retornar null (não bloquear).
7. Log de chamadas.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
