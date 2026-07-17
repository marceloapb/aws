# ALB-15: Estatísticas do Álbum

## Metadados
- **ID:** ALB-15
- **Tipo:** Feature
- **Prioridade:** P3
- **Impacto:** Baixo
- **Esforço:** Médio
- **Dependência:** ALB-07

## Contexto
O admin quer saber: quantas vezes o álbum foi visualizado, quais fotos foram mais vistas/favoritadas, quantos downloads foram feitos, quanto tempo o cliente gastou. Informação valiosa para entender engajamento.

## Escopo
- `apps/backend/src/handlers/album/estatisticas.js` — NOVO
- `apps/frontend/src/components/album/EstatisticasPanel.jsx` — NOVO
- DynamoDB: entidade EVENTO_ALBUM
- API: GET /admin/albuns/:id/estatisticas

## Fora de Escopo (NÃO TOCAR)
- Frontend do cliente (tracking é transparente)
- Dashboard geral (módulo separado)
- Outros módulos

## Spec Técnica

### Eventos Rastreados
| Evento | Dados |
|---|---|
| album_visualizado | timestamp, IP, user_agent |
| foto_visualizada | foto_id, timestamp |
| foto_favoritada | foto_id, timestamp |
| foto_download | foto_id, timestamp |
| zip_download | qtd_fotos, timestamp |
| tempo_sessao | duracao_segundos, timestamp |

### Entidade EVENTO_ALBUM
```json
{
  "PK": "ALBUM#alb_001",
  "SK": "EVENTO#2026-08-01T10:00:00Z#evt_001",
  "tipo": "foto_visualizada",
  "foto_id": "foto_042",
  "timestamp": "2026-08-01T10:00:00Z",
  "ip": "191.x.x.x",
  "TTL": 1756684800
}
```

### TTL
- Eventos individuais: TTL de 90 dias (auto-delete)
- Agregados mensais: permanentes

### Agregados (calculados diariamente)
```json
{
  "total_visualizacoes": 234,
  "total_downloads": 45,
  "total_favoritas": 32,
  "tempo_medio_sessao_min": 12,
  "foto_mais_vista": "foto_042",
  "foto_mais_favoritada": "foto_015",
  "ultima_visita": "2026-08-10T15:30:00Z"
}
```

### Frontend — EstatisticasPanel.jsx
- Cards: visualizações, downloads, favoritas, tempo médio
- Top 5 fotos mais vistas
- Top 5 fotos mais favoritadas
- Gráfico de acessos por dia (últimos 30 dias)
- Última visita do cliente

### Tracking (frontend do cliente)
- Evento disparado via POST /c/:slug/track (fire-and-forget)
- Não bloqueia UX
- Debounce: 1 evento por tipo a cada 5s

## Critérios de Aceite
- [ ] Eventos registrados no DynamoDB
- [ ] TTL de 90 dias funciona
- [ ] Agregados calculados diariamente
- [ ] Cards de estatísticas no admin
- [ ] Top 5 fotos mais vistas/favoritadas
- [ ] Última visita registrada
- [ ] Tracking transparente (sem impactar UX)
- [ ] Debounce funciona

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ALB-15: Estatísticas do Álbum.

1. Crie handlers/album/estatisticas.js: registrar eventos, calcular agregados, retornar stats.
2. Crie components/album/EstatisticasPanel.jsx: cards, top 5, última visita.
3. Tracking: POST /c/{slug}/track (fire-and-forget, debounce 5s).
4. TTL 90 dias nos eventos individuais.
5. Job diário para calcular agregados.
6. SAM: rotas GET /admin/albuns/{id}/estatisticas, POST /c/{slug}/track.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
