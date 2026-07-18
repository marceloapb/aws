# MAP-04: Mapa Embed (iframe clássico, sem chave de API)

## Metadados
- **ID:** MAP-04
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** Nenhuma

## Contexto
Mapa embutido via iframe clássico do Google Maps. NÃO precisa de chave de API. Formato: `maps.google.com/maps?q=...&output=embed`. Exibido no detalhe do evento e na central do cliente. Decisão validada em 06/07/2026.

## Escopo
- `apps/frontend/src/components/MapEmbed.jsx` — NOVO
- Componente reutilizável

## Fora de Escopo (NÃO TOCAR)
- Google Maps JavaScript API (não usar)
- Geocoding (MAP-01)
- Link (MAP-03)
- Backend (100% frontend)

## Spec Técnica

### Componente — MapEmbed.jsx
```jsx
function MapEmbed({ endereco, lat, lng, altura = 200, largura = '100%' }) {
  if (!endereco && !lat) return null
  
  // Priorizar coordenadas (mais preciso), fallback para endereço
  const query = lat && lng
    ? `${lat},${lng}`
    : encodeURIComponent(endereco)
  
  const src = `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`
  
  return (
    <div className="map-embed-container" style={{ borderRadius: '8px', overflow: 'hidden' }}>
      <iframe
        src={src}
        width={largura}
        height={altura}
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Localização do evento"
      />
    </div>
  )
}

export default MapEmbed
```

### Uso nos Módulos
| Tela | Contexto | Props |
|---|---|---|
| Agenda > Detalhe Evento | Mostra local do evento | endereco ou lat/lng |
| Central do Cliente | Mostra onde será o evento | endereco |
| Orçamento (preview) | Visualização do local | endereco |

### Formato da URL
```
https://maps.google.com/maps?q=-23.5505,-46.6333&t=&z=15&ie=UTF8&iwloc=&output=embed
```

### Parâmetros
| Param | Valor | Descrição |
|---|---|---|
| q | coordenadas ou endereço | Local a exibir |
| z | 15 | Zoom (1-20) |
| t | (vazio) | Tipo mapa (padrão) |
| output | embed | Formato iframe |

### Regras
- **ZERO custo** — iframe clássico não cobra
- **Sem API key** — confirmado em 06/07/2026
- `loading="lazy"` para performance
- Se sem endereço e sem coordenadas: não renderizar
- Altura default: 200px (customizável)
- Border radius 8px
- Responsive: width 100%

## Critérios de Aceite
- [ ] Mapa renderiza com endereço
- [ ] Mapa renderiza com lat/lng
- [ ] Sem API key necessária
- [ ] Loading lazy
- [ ] Se sem dados: não renderiza
- [ ] Responsive (100% width)
- [ ] Border radius 8px

## Prompt Pronto para o Kiro CLI

```
Implemente a spec MAP-04: Mapa Embed.

1. Crie components/MapEmbed.jsx: iframe Google Maps.
2. URL: maps.google.com/maps?q=...&output=embed.
3. Priorizar lat/lng, fallback para endereço string.
4. loading="lazy", border-radius 8px.
5. Se sem dados: return null.
6. Props: endereco, lat, lng, altura, largura.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
