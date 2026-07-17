# AGD-08: Link "Ver mapa" / embed no drawer

## Metadados
- **ID:** AGD-08
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** AGD-01

## Contexto
O drawer de detalhe mostra o nome do local mas não oferece link direto para abrir no Maps nem preview visual da localização.

## Escopo
- `apps/frontend/src/pages/admin/Agenda/AgendaEventDrawer.jsx` — seção local

## Fora de Escopo (NÃO TOCAR)
- Cálculo de distância (AGD-07)
- Google Maps embed completo (custo alto)
- Backend

## Spec Técnica

### Frontend
- Na seção Local do drawer:
  - Link "📍 Abrir no Google Maps" → abre em nova aba
  - URL: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco_completo)}`
  - Static map preview (opcional, sem API key): imagem do Google Static Maps
  - Se coordenadas disponíveis: usar lat/lng, senão usar endereço textual

### Fallback
- Se local.maps_url existe (admin preencheu manualmente): usar diretamente
- Se não: construir URL a partir do endereço

## Critérios de Aceite
- [ ] Link "Abrir no Google Maps" visível na seção local do drawer
- [ ] Clique abre nova aba com Google Maps
- [ ] URL construída corretamente (encoded)
- [ ] Se maps_url manual existe, usa ela
- [ ] Se local não tem endereço, link não aparece

## Prompt Pronto para o Kiro CLI

```
Implemente a spec AGD-08: Link "Ver mapa" no drawer.

1. Em AgendaEventDrawer.jsx, na seção de Local:
   - Abaixo do endereço, adicione link:
     <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
       <MapPin size={14} /> Abrir no Google Maps
     </a>
   - mapsUrl = evento.local.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(evento.local.endereco)}`
   - Só renderizar se evento.local.endereco ou evento.local.maps_url existir

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
