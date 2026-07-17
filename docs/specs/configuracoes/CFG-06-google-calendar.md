# CFG-06: Google Calendar — Calendar ID + OAuth

## Metadados
- **ID:** CFG-06
- **Tipo:** Melhoria
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** Nenhuma

## Contexto
A tela (print image-8.png) mostra "Calendário Vinculado: Nenhum" e "Última Sincronização: Nunca". Faltam: Calendar ID, OAuth client ID, seletor de calendário, e status de token OAuth.

## Escopo
- `apps/frontend/src/pages/admin/` — tela Integrações > Google Calendar
- `apps/api/src/routes/admin-google-calendar.js` — endpoints OAuth + sync

## Fora de Escopo (NÃO TOCAR)
- Lógica de sincronização real (já na SPEC-18)
- Criação de eventos
- Outros módulos

## Spec Técnica

### Campos na tela
| Campo | Tipo | Notas |
|---|---|---|
| Status OAuth | badge | Conectado/Desconectado |
| Conta Google | text readonly | Email vinculado |
| Calendar ID | dropdown | Lista calendários do usuário após OAuth |
| Última Sincronização | datetime readonly | Timestamp |
| Frequência | info | "Automática a cada 15 min" (readonly) |
| Direção | info | "MBF → Google (unidirecional)" |

### API
| Método | Path | Descrição |
|---|---|---|
| GET | /admin/configuracoes/google-calendar | Status atual |
| POST | /admin/configuracoes/google-calendar/auth | Inicia OAuth flow → retorna redirect URL |
| GET | /admin/configuracoes/google-calendar/callback | Callback OAuth → salva tokens |
| GET | /admin/configuracoes/google-calendar/calendars | Lista calendários disponíveis |
| PUT | /admin/configuracoes/google-calendar | Salva calendar_id selecionado |
| POST | /admin/configuracoes/google-calendar/sync | Força sincronização manual |

### DynamoDB
```
PK: TENANT#<id>
SK: CONFIG#GOOGLE_CALENDAR
attributes: email, calendar_id, calendar_name, last_sync, oauth_status, updated_at
```
Tokens OAuth → SSM: `/mbf/<tenant_id>/google/access_token`, `/mbf/<tenant_id>/google/refresh_token`

## Critérios de Aceite
- [ ] Botão "Vincular Conta Google" inicia OAuth flow
- [ ] Após OAuth, dropdown lista calendários disponíveis
- [ ] Calendar ID selecionado é persistido
- [ ] Status mostra email vinculado + badge
- [ ] Última sincronização mostra timestamp real
- [ ] Botão "Sincronizar Agora" funciona

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CFG-06: Google Calendar — Calendar ID + OAuth.

1. Frontend — tela Integrações > Google Calendar:
   - Se desconectado: botão "Vincular Conta Google" (POST /auth → redirect)
   - Se conectado: email, dropdown de calendários, última sync, botão sync now
   - Badge de status OAuth

2. Backend em admin-google-calendar.js:
   - POST /auth → gera URL OAuth Google e retorna
   - GET /callback → recebe code, troca por tokens, salva em SSM
   - GET /calendars → usa access_token para listar calendários
   - PUT → salva calendar_id
   - POST /sync → dispara sync

3. DynamoDB: PK TENANT#<id>, SK CONFIG#GOOGLE_CALENDAR

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
