# GCL-06: Detectar Token Expirado/Revogado + Alerta

## Metadados
- **ID:** GCL-06
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** GCL-01

## Contexto
Quando o refresh_token falha (401/403) ou o admin revoga o acesso no Google, o sistema detecta e alerta o admin para reconectar. Enquanto isso, a sync é pausada (sem erros em loop).

## Escopo
- `apps/backend/src/handlers/google-calendar/tokenCheck.js` — NOVO
- Alerta: in-app + email

## Fora de Escopo (NÃO TOCAR)
- OAuth flow (GCL-01)
- Reconexão (GCL-07)
- Retry (GCL-03)

## Spec Técnica

### Detecção
Ocorre em 2 pontos:
1. **Durante sync (GCL-02/GCL-05):** Erro 401/403 da Google API
2. **Cron diário:** Verificar se access_token ainda é válido

### Fluxo de Detecção
```js
async function verificarToken(tenantId) {
  const tokens = await getTokens(tenantId)
  if (!tokens) return { valido: false, motivo: 'sem_token' }
  
  try {
    // Tentar refresh
    const oauth2Client = getOAuth2Client(tokens)
    const { credentials } = await oauth2Client.refreshAccessToken()
    
    // Atualizar access_token no SSM
    await salvarTokens(tenantId, {
      ...tokens,
      access_token: credentials.access_token,
      expiry_date: credentials.expiry_date
    })
    
    return { valido: true }
    
  } catch (error) {
    // Token revogado ou expirado permanentemente
    await marcarTokenInvalido(tenantId)
    return { valido: false, motivo: error.message }
  }
}
```

### Marcar como Inválido
```js
async function marcarTokenInvalido(tenantId) {
  // Atualizar config
  await atualizarConfig(tenantId, {
    google_calendar_token_valido: false,
    google_calendar_invalido_em: new Date().toISOString()
  })
  
  // Notificar admin
  await criarNotificacao(tenantId, {
    tipo: 'alerta',
    titulo: 'Google Calendar desconectado',
    mensagem: 'A conexão com o Google Calendar foi perdida. Reconecte para continuar sincronizando.',
    acao_url: '/admin/configuracoes/google-calendar',
    prioridade: 'alta'
  })
  
  // Email
  const admin = await getAdmin(tenantId)
  await enviarEmail({
    para: admin.email,
    assunto: '⚠️ Google Calendar desconectado',
    template: 'gcal-desconectado',
    dados: { nome: admin.nome }
  })
}
```

### Cron Diário
```yaml
TokenCheckSchedule:
  Type: AWS::Scheduler::Schedule
  Properties:
    ScheduleExpression: 'cron(0 6 * * ? *)'
    Target:
      Arn: !GetAtt TokenCheckFunction.Arn
```

### Frontend (dentro de ConfigGoogleCalendar.jsx)
- **Banner vermelho:** "⚠️ Conexão com Google Calendar perdida. Clique aqui para reconectar."
- **Badge no menu:** Indicador de atenção (exclamação vermelha)

### Regras
- Ao detectar token inválido: pausar sync (não enviar para fila)
- Alerta in-app + email
- Cron diário às 6h: verificar proativamente
- Não spammar: alertar apenas 1x (flag `google_calendar_alerta_enviado`)
- Ao reconectar (GCL-07): limpar flag e retomar sync

## Critérios de Aceite
- [ ] Detectar 401/403 durante sync
- [ ] Cron diário verifica token
- [ ] Marcar config como inválido
- [ ] Notificação in-app
- [ ] Email de alerta
- [ ] Pausar sync enquanto inválido
- [ ] Alertar apenas 1x (não spammar)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec GCL-06: Detectar Token Expirado.

1. Crie handlers/google-calendar/tokenCheck.js: verificar + marcar inválido.
2. Cron diário às 6h para verificação proativa.
3. Ao detectar 401/403: marcar inválido + notificar.
4. Notificação in-app + email (1x só).
5. Pausar sync enquanto token inválido.
6. SAM: schedule + Lambda.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
