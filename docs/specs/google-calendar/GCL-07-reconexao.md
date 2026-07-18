# GCL-07: Reconexão (Fluxo Admin)

## Metadados
- **ID:** GCL-07
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** GCL-06

## Contexto
Quando o token é inválido (GCL-06), o admin precisa reconectar. O fluxo é o mesmo OAuth (GCL-01), mas com ações adicionais: limpar alertas, retomar sync de eventos pendentes.

## Escopo
- `apps/backend/src/handlers/google-calendar/reconectar.js` — NOVO
- Reutiliza: GCL-01 (OAuth flow)

## Fora de Escopo (NÃO TOCAR)
- OAuth inicial (GCL-01 — reutilizado)
- Token check (GCL-06)
- Sync principal (GCL-02)

## Spec Técnica

### Fluxo de Reconexão
```
1. Admin vê alerta "Google Calendar desconectado"
2. Clica "Reconectar"
3. Redireciona para OAuth (mesmo GCL-01)
4. Após callback bem-sucedido:
   a. Limpar flags de token inválido
   b. Limpar notificação de alerta
   c. Sincronizar eventos pendentes (criados durante desconexão)
   d. Registrar log de reconexão
```

### Pós-Reconexão
```js
async function posReconexao(tenantId) {
  // 1. Limpar flags
  await atualizarConfig(tenantId, {
    google_calendar_token_valido: true,
    google_calendar_invalido_em: null,
    google_calendar_alerta_enviado: false
  })
  
  // 2. Limpar notificação
  await marcarNotificacaoResolvida(tenantId, 'gcal-desconectado')
  
  // 3. Buscar eventos sem google_event_id (criados durante desconexão)
  const eventosPendentes = await listarEventosSemSync(tenantId)
  
  // 4. Sincronizar cada um
  for (const evento of eventosPendentes) {
    await enviarParaFilaRetry(tenantId, 'criar', evento, null)
  }
  
  // 5. Log
  await registrarSyncLog(tenantId, null, {
    acao: 'reconexao',
    status: 'sucesso',
    eventos_pendentes: eventosPendentes.length
  })
  
  return {
    sucesso: true,
    eventos_sincronizados: eventosPendentes.length,
    mensagem: `Reconectado! ${eventosPendentes.length} evento(s) serão sincronizados.`
  }
}
```

### Frontend (dentro de ConfigGoogleCalendar.jsx)
- **Botão "Reconectar"** (quando token inválido)
- Mesmo fluxo visual do GCL-01
- Após sucesso: toast "✅ Reconectado! X eventos pendentes serão sincronizados."
- Banner vermelho desaparece

### Regras
- Reutilizar 100% do fluxo OAuth do GCL-01
- Pós-callback: executar lógica extra de limpeza
- Sincronizar apenas eventos dos últimos 30 dias sem google_event_id
- Não duplicar: se evento já tem google_event_id, pular
- Máximo 50 eventos por reconexão (evitar throttle do Google)

## Critérios de Aceite
- [ ] Reconexão usa mesmo OAuth do GCL-01
- [ ] Flags limpos após reconexão
- [ ] Notificação resolvida
- [ ] Eventos pendentes sincronizados
- [ ] Toast de sucesso com contagem
- [ ] Máximo 50 eventos por reconexão
- [ ] Não duplicar (pular se já tem google_event_id)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec GCL-07: Reconexão Google Calendar.

1. Crie handlers/google-calendar/reconectar.js: pós-reconexão.
2. Limpar flags de token inválido.
3. Resolver notificação de alerta.
4. Buscar eventos sem google_event_id (últimos 30d).
5. Enviar para fila de sync (max 50).
6. Reutilizar OAuth do GCL-01.
7. SAM: trigger pós-callback.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
