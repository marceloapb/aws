# MAP-08: Controle de Custo (Chave API + Restrição de Domínio)

## Metadados
- **ID:** MAP-08
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** MAP-01

## Contexto
Gerenciar a chave de API do Google Maps Platform: armazenamento seguro (SSM), restrição de domínio/IP, monitoramento de uso, e alerta se se aproximar do limite do free tier ($200/mês).

## Escopo
- `apps/backend/src/handlers/config/googleMapsConfig.js` — NOVO
- SSM Parameter Store: `/mbf/global/google/maps_api_key`
- API: PUT /admin/config/google-maps-key, GET /admin/config/google-maps-status

## Fora de Escopo (NÃO TOCAR)
- Geocoding service (MAP-01)
- Distance service (MAP-02)
- Google Cloud Console (configuração manual do admin)

## Spec Técnica

### Armazenamento da API Key
```
SSM Parameter Store:
  Path: /mbf/global/google/maps_api_key
  Type: SecureString
  KMS: aws/ssm (default)
```

### API — PUT /admin/config/google-maps-key
```json
// Input
{
  "api_key": "AIza..."
}

// Backend: validar key antes de salvar
// Response
{
  "sucesso": true,
  "valida": true,
  "mensagem": "Chave salva e validada com sucesso"
}
```

### Validação da Key
```js
async function validarApiKey(apiKey) {
  try {
    // Fazer uma chamada simples de geocoding para validar
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: 'São Paulo, Brasil',
        key: apiKey
      }
    })
    
    if (response.data.status === 'REQUEST_DENIED') {
      return { valida: false, motivo: 'Chave inválida ou sem permissão' }
    }
    
    return { valida: true }
  } catch (error) {
    return { valida: false, motivo: error.message }
  }
}
```

### API — GET /admin/config/google-maps-status
```json
{
  "configurado": true,
  "key_mascarada": "AIza...x4Fg",
  "uso_estimado": {
    "geocoding_chamadas_mes": 45,
    "distance_chamadas_mes": 32,
    "custo_estimado_usd": 0.39,
    "limite_free_tier_usd": 200,
    "percentual_usado": 0.2
  },
  "recomendacoes": [
    "✅ Restrinja a chave por domínio no Google Cloud Console",
    "✅ Habilite apenas Geocoding API e Distance Matrix API"
  ]
}
```

### Monitoramento de Uso
```js
async function contarUsoMensal(tenantId) {
  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)
  
  // Contar chamadas no log
  const geocoding = await contarLogs('GEOCACHE', 'api', inicioMes)
  const distance = await contarLogs('DISTANCE', 'api', inicioMes)
  
  const custoGeocoding = geocoding * 0.005
  const custoDistance = distance * 0.005
  const custoTotal = custoGeocoding + custoDistance
  
  return {
    geocoding_chamadas_mes: geocoding,
    distance_chamadas_mes: distance,
    custo_estimado_usd: Math.round(custoTotal * 100) / 100,
    limite_free_tier_usd: 200,
    percentual_usado: Math.round((custoTotal / 200) * 100 * 10) / 10
  }
}
```

### Alerta de Custo
```js
// Cron semanal: verificar uso
async function verificarCustoMaps() {
  const uso = await contarUsoMensal()
  
  if (uso.percentual_usado > 80) {
    await criarNotificacao({
      tipo: 'alerta',
      titulo: '⚠️ Google Maps: 80% do free tier usado',
      mensagem: `Uso atual: $${uso.custo_estimado_usd} de $200. Considere otimizar cache.`,
      prioridade: 'media'
    })
  }
}
```

### Checklist de Segurança (exibido ao admin)
```
□ Restringir chave por domínio (*.mbfotos.com.br)
□ Restringir por IP do backend (Lambda IPs via NAT — futuro)
□ Habilitar apenas APIs necessárias:
  - Geocoding API
  - Distance Matrix API
□ Configurar alertas de billing no Google Cloud Console
□ Definir quota máxima mensal
```

### Regras
- API Key NUNCA no frontend (apenas backend)
- Armazenar em SSM SecureString
- Validar antes de salvar
- Mascarar na resposta (primeiros 4 + últimos 4 chars)
- Monitorar uso (contar chamadas por mês)
- Alertar se > 80% do free tier
- Checklist de boas práticas exibido ao admin

## Critérios de Aceite
- [ ] API Key salva no SSM (SecureString)
- [ ] Validação antes de salvar
- [ ] Key mascarada na resposta
- [ ] Contagem de uso mensal
- [ ] Alerta se > 80% free tier
- [ ] Checklist de segurança exibido
- [ ] Key nunca exposta no frontend

## Prompt Pronto para o Kiro CLI

```
Implemente a spec MAP-08: Controle de Custo Google Maps.

1. Crie handlers/config/googleMapsConfig.js: salvar key + status.
2. Validar key antes de salvar (chamada teste).
3. SSM SecureString para armazenar.
4. Contagem de uso mensal (geocoding + distance).
5. Alerta se > 80% do free tier ($200).
6. Mascarar key na resposta.
7. SAM: rotas PUT + GET.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
