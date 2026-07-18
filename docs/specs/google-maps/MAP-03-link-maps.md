# MAP-03: Link "Abrir no Maps" (URL de Directions)

## Metadados
- **ID:** MAP-03
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** MAP-07

## Contexto
Botão/link que abre o Google Maps com rota traçada do estúdio até o local do evento. Custo ZERO — é apenas uma URL formatada. Aparece na agenda (detalhe do evento) e na central do cliente.

## Escopo
- `apps/frontend/src/components/MapLink.jsx` — NOVO
- Componente reutilizável (usado em múltiplas telas)

## Fora de Escopo (NÃO TOCAR)
- Geocoding (MAP-01)
- Distance Matrix (MAP-02)
- Mapa embed (MAP-04)
- Backend (este é 100% frontend)

## Spec Técnica

### Componente — MapLink.jsx
```jsx
function MapLink({ origem, destino, label }) {
  const url = buildGoogleMapsUrl(origem, destino)
  
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      📍 {label || 'Abrir no Maps'}
    </a>
  )
}

function buildGoogleMapsUrl(origem, destino) {
  // Formato: directions do Google Maps
  const base = 'https://www.google.com/maps/dir/'
  const origemStr = origem ? `${origem.lat},${origem.lng}` : ''
  const destinoStr = destino.endereco || `${destino.lat},${destino.lng}`
  
  return `${base}${encodeURIComponent(origemStr)}/${encodeURIComponent(destinoStr)}`
}

// Variante: sem origem (só destino)
function MapLinkDestino({ endereco, label }) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`
  
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      📍 {label || 'Ver no Mapa'}
    </a>
  )
}

export { MapLink, MapLinkDestino }
```

### Uso nos Módulos
| Tela | Componente | Props |
|---|---|---|
| Agenda (detalhe evento) | `<MapLink>` | origem=estúdio, destino=local |
| Central do Cliente | `<MapLinkDestino>` | endereco=local do evento |
| Orçamento (admin) | `<MapLink>` | origem=estúdio, destino=local |

### URL Geradas
```
// Com origem e destino (directions)
https://www.google.com/maps/dir/-23.5505,-46.6333/Rua+das+Flores,+123,+São+Paulo

// Só destino (pin)
https://www.google.com/maps/search/?api=1&query=Rua+das+Flores,+123,+São+Paulo
```

### Regras
- Custo: $0 (é só URL)
- Abre em nova aba
- Se não tem endereço: não renderizar (esconder componente)
- Mobile: abre app Google Maps nativo
- Não precisa de API key

## Critérios de Aceite
- [ ] Link gera URL correta de directions
- [ ] Abre em nova aba
- [ ] Funciona com origem+destino
- [ ] Funciona só com destino
- [ ] Mobile abre app nativo
- [ ] Se sem endereço: componente não renderiza

## Prompt Pronto para o Kiro CLI

```
Implemente a spec MAP-03: Link Abrir no Maps.

1. Crie components/MapLink.jsx: MapLink + MapLinkDestino.
2. MapLink: URL de directions (origem → destino).
3. MapLinkDestino: URL de busca (só destino).
4. target="_blank", rel="noopener noreferrer".
5. Se sem endereço: não renderizar.
6. Exportar ambos componentes.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
