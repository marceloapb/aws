# AGD-10: Status de sincronização Google Calendar

## Metadados
- **ID:** AGD-10
- **Tipo:** Melhoria
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** AGD-01, CFG-06

## Contexto
Quando Google Calendar está vinculado (CFG-06), o admin precisa saber se os eventos estão sincronizados. Não existe indicação visual de sync status na agenda.

## Escopo
- `apps/frontend/src/pages/admin/Agenda/AgendaEventDrawer.jsx` — badge de sync
- `apps/frontend/src/pages/admin/Agenda/AgendaList.jsx` — ícone sutil no card
- API já retorna `google_sync` no evento (AGD-01)

## Fora de Escopo (NÃO TOCAR)
- Lógica de sincronização real (SPEC-18)
- Configuração do Google Calendar (CFG-06)
- Calendário view
- Backend

## Spec Técnica

### Frontend

#### No Drawer (AGD-01)
- Seção "Google Calendar" no final:
  - Se sincronizado: `✅ Sincronizado` + data da última sync
  - Se não sincronizado: `⚠️ Não sincronizado` + botão "Sincronizar agora"
  - Se Google não vinculado (CFG-06): `ℹ️ Google Calendar não configurado` + link para Configurações

#### Na Lista
- Ícone sutil no canto superior direito do card:
  - ✅ (verde, 12px) = sincronizado
  - ⚠️ (amarelo, 12px) = falha de sync
  - Nada = Google não configurado

### Ação "Sincronizar agora"
- Chama POST /admin/agenda/eventos/:id/sync
- Atualiza o badge após resposta

## Critérios de Aceite
- [ ] Drawer mostra status de sync com ícone correto
- [ ] Se sincronizado, mostra data da última sync
- [ ] Se não sincronizado, botão "Sincronizar agora" funciona
- [ ] Se Google não configurado, mostra link para Configurações
- [ ] Lista mostra ícone sutil de sync status
- [ ] Ícone não aparece se Google não está configurado

## Prompt Pronto para o Kiro CLI

```
Implemente a spec AGD-10: Status de sincronização Google Calendar.

1. Em AgendaEventDrawer.jsx, adicione seção "Google Calendar" antes das ações:
   - Se google_sync.sincronizado === true: badge verde "✅ Sincronizado" + texto "Última sync: {data}"
   - Se google_sync.sincronizado === false: badge amarelo "⚠️ Não sincronizado" + botão "Sincronizar agora" → POST /admin/agenda/eventos/:id/sync
   - Se google_sync === null: texto info "Google Calendar não configurado" + link "/admin/configuracoes" (target integrações)

2. Em AgendaList.jsx, no card de cada evento:
   - Se google_sync.sincronizado: ícone CheckCircle size=12 text-emerald-500 absolute top-2 right-2
   - Se google_sync === false: ícone AlertCircle size=12 text-amber-500
   - Se google_sync null: nada

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
