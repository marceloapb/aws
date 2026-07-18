# MAP-01: Geocoding (Endereço → Coordenadas) + Cache por CEP

## Metadados
- **ID:** MAP-01
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** MAP-07

## Contexto
Converter endereço do local do evento em coordenadas (lat/lng) para cálculos de distância. Cache por CEP no DynamoDB — o mesmo CEP nunca é geocodificado 2x (economia de API).

## Escopo
- `apps/backend/src/services/geocodingService.js` — NOVO
- DynamoDB: entidade GEOCODING_CACHE
- Google Geocoding API

## Fora de Escopo (NÃO TOCAR)
- Distance Matrix (MAP-02)
- Config estúdio (MAP-07)
- Agenda interna (AGD-*)

## Spec Técnica

### Entidade GEOCODING_CACHE
```json
{
  "PK": "GEOCACHE",
  "SK": "CEP#01234567",
  "cep": "01234567",
  "lat": -23.5505,
  "lng": -46.6333,
  "endereco_formatado": "Rua das Flores, 123 - Centro, São Paulo - SP",
  "created_at": "2026-07-17T10:00:00Z",
  "ttl": 1784000000
}
```

### Service — geocodingService.js
```js
const axios = require('axios')

async function geocodificar(endereco) {
  const cep = endereco.cep?.replace(/\D/g, '')
  
  // 1. Verificar cache
  if (cep) {
    const cached = await getGeocacheporCEP(cep)
    if (cached) return { lat: cached.lat, lng: cached.lng, fonte: 'cache' }
  }
  
  // 2. Chamar Google Geocoding API
  const apiKey = await getApiKey()
  const enderecoString = formatarEndereco(endereco)
  
  const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
    params: {
      address: enderecoString,
      key: apiKey,
      language: 'pt-BR',
      components: 'country:BR'
    }
  })
  
  if (response.data.status !== 'OK' || !response.data.results.length) {
    return null
  }
  
  const resultado = response.data.results[0]
  const { lat, lng } = resultado.geometry.location
  
  // 3. Salvar no cache
  if (cep) {
    await salvarGeocache(cep, {
      lat,
      lng,
      endereco_formatado: resultado.formatted_address,
      ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
    })
  }
  
  return { lat, lng, fonte: 'api' }
}

function formatarEndereco(endereco) {
  const partes = [
    endereco.logradouro,
    endereco.numero,
    endereco.bairro,
    endereco.cidade,
    endereco.estado,
    endereco.cep
  ].filter(Boolean)
  return partes.join(', ') + ', Brasil'
}

module.exports = { geocodificar, getGeocacheporCEP }
```

### Custo
| Cenário | Custo |
|---|---|
| Cache hit (mesmo CEP) | $0 |
| API call (CEP novo) | $0.005/chamada |
| Free tier Google | ~28.000 chamadas/mês grátis |

### Regras
- Cache por CEP (não por endereço completo)
- TTL do cache: 1 ano (endereço de CEP não muda)
- Se API falhar: retornar null, não bloquear
- Limpar números do CEP antes de buscar cache
- API key em SSM Parameter Store
- Componente BR (forçar resultados no Brasil)

## Critérios de Aceite
- [ ] Geocoding funciona (endereço → lat/lng)
- [ ] Cache por CEP no DynamoDB
- [ ] Cache hit não chama API
- [ ] TTL 1 ano
- [ ] Falha não bloqueia fluxo
- [ ] API key em SSM
- [ ] Forçar resultados Brasil

## Prompt Pronto para o Kiro CLI

```
Implemente a spec MAP-01: Geocoding + Cache por CEP.

1. Crie services/geocodingService.js: geocodificar + cache.
2. Entidade GEOCODING_CACHE no DynamoDB (PK=GEOCACHE, SK=CEP#xxx).
3. Cache hit: retornar direto sem chamar API.
4. API key em SSM Parameter Store.
5. TTL 1 ano.
6. Forçar country:BR.
7. Retornar null se falhar (não bloquear).

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
