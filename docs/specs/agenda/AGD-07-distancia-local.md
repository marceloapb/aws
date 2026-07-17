# AGD-07: Distância/tempo até o local

## Metadados
- **ID:** AGD-07
- **Tipo:** Feature
- **Prioridade:** P3
- **Impacto:** Baixo
- **Esforço:** Médio
- **Dependência:** AGD-01

## Contexto
A spec §7 prevê mostrar distância e tempo de deslocamento entre o estúdio e o local da sessão. Útil para planejamento logístico.

## Escopo
- `apps/frontend/src/pages/admin/Agenda/AgendaEventDrawer.jsx` — seção local
- `apps/api/src/routes/admin-agenda.js` — endpoint com cálculo de distância
- Integração com Google Maps Distance Matrix API (ou fallback estático)

## Fora de Escopo (NÃO TOCAR)
- Mapa embed (AGD-08)
- Navegação GPS
- Custo de combustível
- Outros módulos

## Spec Técnica

### Frontend
- No drawer (AGD-01), seção Local, abaixo do endereço:
  - "🚗 ~45 min (32 km)" — texto informativo
  - Calculado com base no endereço do estúdio (CFG-09) vs endereço do evento

### Backend
- Na API GET /admin/agenda/eventos/:id, campo adicional:
  ```json
  "distancia": {
    "texto": "32 km",
    "duracao": "45 min",
    "origem": "Estúdio (Rua Y, 456)"
  }
  ```
- Implementação: chamar Google Maps Distance Matrix API com origin=endereço estúdio, destination=endereço evento
- Fallback: se não configurado, retorna null e frontend não mostra
- Cache: salvar resultado no DynamoDB por 7 dias (endereços não mudam)

### SSM
- `/mbf/<tenant_id>/google/maps_api_key` — chave da API

## Critérios de Aceite
- [ ] Drawer mostra distância e tempo quando disponível
- [ ] Se Maps API não configurada, não mostra (graceful degradation)
- [ ] Cache de 7 dias funciona (não chama API repetidamente)
- [ ] Formato: "🚗 ~{duracao} ({distancia})"

## Prompt Pronto para o Kiro CLI

```
Implemente a spec AGD-07: Distância/tempo até o local.

1. Backend em admin-agenda.js, no GET /admin/agenda/eventos/:id:
   - Após buscar evento e local, chamar Google Distance Matrix API (se maps_api_key configurada em SSM)
   - Origin: endereço do estúdio (CONFIG#EMPRESA.endereco)
   - Destination: evento.local.endereco
   - Cachear resultado no DynamoDB (SK: DISTANCIA#hash(origin+dest), TTL 7 dias)
   - Retornar campo "distancia" no response

2. Frontend em AgendaEventDrawer.jsx:
   - Na seção Local, se distancia !== null, mostrar "🚗 ~{duracao} ({texto})"
   - Se null, não renderizar nada

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
