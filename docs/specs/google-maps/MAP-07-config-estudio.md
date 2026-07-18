# MAP-07: Config — Endereço do Estúdio (Origem)

## Metadados
- **ID:** MAP-07
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** CFG-01

## Contexto
O endereço do estúdio é a ORIGEM para cálculos de distância/tempo. Admin configura na tela de Configurações. Ao salvar, geocodificar e armazenar lat/lng.

## Escopo
- `apps/backend/src/handlers/configuracoes/endereco.js` — NOVO
- `apps/frontend/src/pages/admin/ConfigEndereco.jsx` — NOVO (ou seção dentro de ConfigGeral)
- API: PUT /admin/configuracoes/endereco, GET /admin/configuracoes/endereco

## Fora de Escopo (NÃO TOCAR)
- Geocoding de evento (MAP-01)
- Distance Matrix (MAP-02)
- Configurações gerais (CFG-*)

## Spec Técnica

### Entidade (dentro de CONFIG TENANT)
```json
{
  "endereco_estudio": {
    "logradouro": "Rua das Flores, 123",
    "complemento": "Sala 5",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "estado": "SP",
    "cep": "01234-567",
    "lat": -23.5505,
    "lng": -46.6333,
    "geocodificado_em": "2026-07-17T10:00:00Z"
  }
}
```

### API — PUT /admin/configuracoes/endereco
```json
// Input
{
  "logradouro": "Rua das Flores, 123",
  "complemento": "Sala 5",
  "bairro": "Centro",
  "cidade": "São Paulo",
  "estado": "SP",
  "cep": "01234-567"
}

// Backend: geocodificar ao salvar
// Response
{
  "sucesso": true,
  "endereco": {
    "logradouro": "Rua das Flores, 123",
    "cidade": "São Paulo",
    "estado": "SP",
    "cep": "01234-567",
    "lat": -23.5505,
    "lng": -46.6333
  }
}
```

### Backend
```js
async function salvarEndereco(tenantId, endereco) {
  // Geocodificar
  const coords = await geocodificar(endereco)
  
  const enderecoCompleto = {
    ...endereco,
    lat: coords.lat,
    lng: coords.lng,
    geocodificado_em: new Date().toISOString()
  }
  
  await atualizarConfig(tenantId, {
    endereco_estudio: enderecoCompleto
  })
  
  return enderecoCompleto
}
```

### Frontend
- **Campos:** Logradouro, Complemento, Bairro, Cidade, Estado (select), CEP
- **Auto-preencher:** Ao digitar CEP, buscar endereço (ViaCEP grátis)
- **Mapa preview:** Embed do Google Maps mostrando o pin
- **Botão Salvar:** Geocodifica e salva

### Regras
- CEP obrigatório
- Geocodificar ao salvar (não ao digitar)
- Se geocoding falhar: salvar endereço sem lat/lng + aviso
- ViaCEP: preenchimento automático (grátis)
- Lat/lng necessários para Distance Matrix funcionar

## Critérios de Aceite
- [ ] Campos de endereço salvos
- [ ] Geocoding ao salvar
- [ ] Lat/lng armazenados
- [ ] Auto-preenchimento por CEP (ViaCEP)
- [ ] Preview no mapa
- [ ] Aviso se geocoding falhar

## Prompt Pronto para o Kiro CLI

```
Implemente a spec MAP-07: Config Endereço do Estúdio.

1. Crie handlers/configuracoes/endereco.js: GET + PUT.
2. Crie pages/admin/ConfigEndereco.jsx: form + preview mapa.
3. Geocodificar ao salvar (Google Geocoding API).
4. Auto-preencher via ViaCEP (grátis).
5. Salvar lat/lng na config do tenant.
6. SAM: rotas GET/PUT.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
