# MAP-07: Config — Endereço do Estúdio (Origem)

## Metadados
- **ID:** MAP-07
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** Nenhuma (CFG-01 para tela de config)

## Contexto
O endereço do estúdio é o ponto de ORIGEM para cálculos de distância. Admin cadastra na tela de configurações. O sistema faz geocoding e salva lat/lng para uso futuro.

## Escopo
- `apps/backend/src/handlers/config/endereco.js` — NOVO
- Dentro da tela Configurações > Empresa (CFG-02)
- API: PUT /admin/config/endereco-estudio

## Fora de Escopo (NÃO TOCAR)
- Geocoding genérico (MAP-01)
- Distance Matrix (MAP-02)
- Tela de configurações gerais (CFG-*)

## Spec Técnica

### API — PUT /admin/config/endereco-estudio
```json
// Input
{
  "endereco": "Rua das Flores, 123",
  "bairro": "Centro",
  "cidade": "São Paulo",
  "estado": "SP",
  "cep": "01001-000"
}

// Response
{
  "sucesso": true,
  "endereco_completo": "Rua das Flores, 123 - Centro, São Paulo - SP, 01001-000",
  "coordenadas": {
    "lat": -23.5505,
    "lng": -46.6333
  }
}
```

### Backend
```js
async function salvarEnderecoEstudio(tenantId, dados) {
  // Geocoding do endereço
  const endereco_completo = `${dados.endereco}, ${dados.bairro}, ${dados.cidade} - ${dados.estado}, ${dados.cep}`
  const coordenadas = await geocodificar(endereco_completo)
  
  // Salvar na config do tenant
  await atualizarConfig(tenantId, {
    endereco_estudio: {
      ...dados,
      endereco_completo,
      lat: coordenadas.lat,
      lng: coordenadas.lng,
      geocodificado_em: new Date().toISOString()
    }
  })
  
  return { sucesso: true, endereco_completo, coordenadas }
}
```

### Entidade (dentro de CONFIG TENANT)
```json
{
  "endereco_estudio": {
    "endereco": "Rua das Flores, 123",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "estado": "SP",
    "cep": "01001-000",
    "endereco_completo": "Rua das Flores, 123 - Centro, São Paulo - SP, 01001-000",
    "lat": -23.5505,
    "lng": -46.6333,
    "geocodificado_em": "2026-07-17T10:00:00Z"
  }
}
```

### Regras
- Geocoding automático ao salvar
- Se geocoding falha: salvar endereço sem coordenadas + aviso
- Lat/lng usados como ORIGEM no Distance Matrix (MAP-02)
- Obrigatório para MAP-02 funcionar

## Critérios de Aceite
- [ ] Endereço salvo na config do tenant
- [ ] Geocoding automático ao salvar
- [ ] Lat/lng salvos
- [ ] Se geocoding falha: salvar sem coordenadas + aviso
- [ ] Exibido na tela de config (CFG-02)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec MAP-07: Config Endereço do Estúdio.

1. Crie handlers/config/endereco.js: PUT salvar + geocodificar.
2. Salvar na config do tenant (endereco_estudio).
3. Geocoding automático ao salvar.
4. Se geocoding falha: salvar sem coordenadas + aviso.
5. SAM: rota PUT /admin/config/endereco-estudio.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
