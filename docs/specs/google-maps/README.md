# Módulo Google Maps — Specs

## Decisões de Design (§6)
- Geocoding + Distance Matrix: chamadas ao backend, cache por CEP
- Link "abrir no Maps": URL de directions (custo zero)
- Mapa embed: iframe clássico (sem chave de API)
- Cache por CEP: DynamoDB com TTL longo
- Chave de API: restrição de domínio + monitorar free tier
- Módulo NÃO tem tela própria — aparece como widget em Agenda, Orçamento, Central

## Fora de Escopo (confirmado)
- Autocomplete de endereço (futuro P3)
- Places API (busca de locais)
- Street View
- Rota otimizada multi-paradas

## Dependências entre specs:

- **Fase 1 (P0):** MAP-07 → MAP-01 → MAP-02
- **Fase 2 (P1):** MAP-03 | MAP-04 | MAP-08 (paralelas)
- **Fase 3 (P1):** MAP-05 | MAP-06

## Lista de Specs

| ID | Arquivo | Prioridade | Título |
|---|---|---|---|
| MAP-01 | [MAP-01-geocoding.md](./MAP-01-geocoding.md) | P0 | Geocoding + Cache |
| MAP-02 | [MAP-02-distance-matrix.md](./MAP-02-distance-matrix.md) | P0 | Distance Matrix |
| MAP-03 | [MAP-03-link-maps.md](./MAP-03-link-maps.md) | P1 | Link Abrir no Maps |
| MAP-04 | [MAP-04-mapa-embed.md](./MAP-04-mapa-embed.md) | P1 | Mapa Embed |
| MAP-05 | [MAP-05-distancia-agenda.md](./MAP-05-distancia-agenda.md) | P1 | Distância na Agenda |
| MAP-06 | [MAP-06-distancia-orcamento.md](./MAP-06-distancia-orcamento.md) | P1 | Distância no Orçamento |
| MAP-07 | [MAP-07-config-estudio.md](./MAP-07-config-estudio.md) | P0 | Config Endereço Estúdio |
| MAP-08 | [MAP-08-controle-custo.md](./MAP-08-controle-custo.md) | P1 | Controle de Custo API |
