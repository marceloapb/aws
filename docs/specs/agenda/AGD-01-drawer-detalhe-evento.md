# AGD-01: Modal/Drawer de Detalhe do Evento

## Metadados
- **ID:** AGD-01
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** Nenhuma

## Contexto
A tela de agenda (views Calendário e Lista) exibe os eventos como cards estáticos. O admin não consegue ver detalhes completos nem tomar ações (editar, cancelar, sincronizar). A spec §7 prevê que o evento seja clicável e abra detalhes completos.

## Escopo
- `apps/frontend/src/pages/admin/Agenda/AgendaEventDrawer.jsx` — NOVO
- `apps/frontend/src/pages/admin/Agenda/AgendaCalendar.jsx` — onclick na pill
- `apps/frontend/src/pages/admin/Agenda/AgendaList.jsx` — onclick no card
- `apps/api/src/routes/admin-agenda.js` — GET /agenda/eventos/:id
- Lambda: `getAgendaEvento`

## Fora de Escopo (NÃO TOCAR)
- Layout do calendário
- Layout da lista
- Cards de métricas do topo
- Botão "Bloquear Data"
- Botão "Nova Sessão"
- CRUD de eventos (edição é outra spec)

## Spec Técnica

### Frontend — AgendaEventDrawer.jsx
- Drawer lateral direito, largura 400px (md:w-[400px])
- Overlay escuro semi-transparente
- Fecha com: botão X, tecla ESC, clique no overlay
- Conteúdo do drawer:
  - **Header:** Nome do evento + badge tipo (cor por tipo)
  - **Status:** Badge grande com cor (verde=confirmado, laranja=reserva, cinza=bloqueio)
  - **Se reserva:** Alert amarelo "Expira em X dias"
  - **Data/Hora:** Ícone calendário + data completa + horário início-fim
  - **Local:** Nome + endereço completo + link "Abrir no Maps"
  - **Cliente:** Nome + telefone + email (link para ficha)
  - **Orçamento:** Valor + status + link "Ver orçamento"
  - **Google Calendar:** Badge sync (✅ Sincronizado / ⚠️ Não sincronizado)
  - **Ações (footer):**
    - Botão "Editar" (primary)
    - Botão "Cancelar Sessão" (danger, com confirmação)
    - Botão "Ressincronizar" (secondary, se Google vinculado)

### API
| Método | Path | Descrição |
|---|---|---|
| GET | /admin/agenda/eventos/:id | Retorna evento completo com dados enriquecidos |

### Response do GET
```json
{
  "id": "evt_123",
  "tipo": "ensaio",
  "titulo": "Ensaio Pré-Wedding",
  "status": "reserva",
  "data": "2026-08-20",
  "hora_inicio": "10:00",
  "hora_fim": "12:00",
  "local": {
    "nome": "Studio",
    "endereco": "Rua X, 123",
    "maps_url": "https://maps.google.com/..."
  },
  "cliente": {
    "id": "cli_456",
    "nome": "Maria Silva",
    "telefone": "(11) 99999-0000",
    "email": "maria@email.com"
  },
  "orcamento": {
    "id": "orc_789",
    "valor": 2500,
    "status": "aceito"
  },
  "reserva_expira_em": 5,
  "google_sync": {
    "sincronizado": true,
    "google_event_id": "abc123",
    "ultima_sync": "2026-07-17T10:00:00Z"
  }
}
```

### DynamoDB
```
PK: TENANT#<id>
SK: EVENTO#<evento_id>
attributes: tipo, titulo, status, data, hora_inicio, hora_fim, local{}, cliente_id, orcamento_id, reserva_expira_em, google_event_id, sync_status, created_at, updated_at
```
A Lambda faz joins: busca cliente (SK=CLIENTE#id) e orçamento (SK=ORCAMENTO#id) no mesmo tenant.

## Critérios de Aceite
- [ ] Clicar em qualquer evento (lista ou calendário) abre o drawer
- [ ] Drawer mostra todos os dados: tipo, status, data/hora, local, cliente, orçamento
- [ ] Drawer fecha com X, ESC ou clique no overlay
- [ ] Status com cor correta (verde/laranja/cinza)
- [ ] Link "Abrir no Maps" abre URL real
- [ ] Botão "Ver orçamento" navega para o orçamento vinculado
- [ ] Loading state enquanto carrega dados
- [ ] Se reserva, mostra alert "Expira em X dias"

## Prompt Pronto para o Kiro CLI

```
Implemente a spec AGD-01: Modal/Drawer de Detalhe do Evento na Agenda.

1. Crie apps/frontend/src/pages/admin/Agenda/AgendaEventDrawer.jsx:
   - Drawer lateral direito (400px), overlay, fecha com X/ESC/overlay click
   - Props: { eventoId, isOpen, onClose }
   - Fetch GET /admin/agenda/eventos/:id ao abrir
   - Seções: Header+badge, Status, Data/Hora, Local+maps, Cliente, Orçamento, Google Sync
   - Footer com ações: Editar, Cancelar, Ressincronizar
   - Loading skeleton enquanto carrega
   - Alert amarelo se status=reserva com dias restantes

2. Em AgendaCalendar.jsx, no onClick da pill do evento, chame onEventClick(eventoId)
3. Em AgendaList.jsx, no onClick do card, chame onEventClick(eventoId)
4. No componente pai (Agenda.jsx), controle o estado isDrawerOpen e eventoSelecionado

5. Backend em admin-agenda.js:
   - GET /admin/agenda/eventos/:id → busca EVENTO, enriquece com CLIENTE e ORCAMENTO
   - Retorna JSON conforme spec

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
