# GCL-01: Conexão OAuth2 (Consent + Token Store)

## Metadados
- **ID:** GCL-01
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** Nenhuma

## Contexto
O admin conecta sua conta Google ao sistema via OAuth2. O sistema obtém access_token + refresh_token, armazena no SSM Parameter Store (criptografado), e usa para criar eventos no Google Calendar do admin.

## Escopo
- `apps/backend/src/handlers/google-calendar/oauth.js` — NOVO
- `apps/frontend/src/pages/admin/ConfigGoogleCalendar.jsx` — NOVO
- SSM Parameter Store: `/mbf/{tenantId}/google/tokens`
- API: GET /admin/google-calendar/auth-url, GET /admin/google-calendar/callback, GET /admin/google-calendar/status, DELETE /admin/google-calendar/desconectar

## Fora de Escopo (NÃO TOCAR)
- Espelhar eventos (GCL-02)
- Retry (GCL-03)
- Configurações gerais (CFG-*)

## Spec Técnica

### Fluxo OAuth2
```
1. Admin clica "Conectar Google Calendar"
2. Frontend chama GET /admin/google-calendar/auth-url
3. Backend gera URL de consent com scopes:
   - https://www.googleapis.com/auth/calendar.events
4. Admin autoriza no Google
5. Google redireciona para callback com code
6. Backend troca code por access_token + refresh_token
7. Salva tokens no SSM (criptografado)
8. Retorna status "conectado" ao frontend
```

### API — GET /admin/google-calendar/auth-url
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&scope=...&access_type=offline&prompt=consent"
}
```

### API — GET /admin/google-calendar/callback?code=xxx
```js
async function handleCallback(tenantId, code) {
  const { tokens } = await oauth2Client.getToken(code)
  
  // Salvar no SSM
  await ssm.putParameter({
    Name: `/mbf/${tenantId}/google/tokens`,
    Value: JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date
    }),
    Type: 'SecureString',
    Overwrite: true
  }).promise()
  
  // Salvar email da conta conectada
  const userInfo = await getGoogleUserInfo(tokens.access_token)
  await atualizarConfig(tenantId, {
    google_calendar_email: userInfo.email,
    google_calendar_conectado: true,
    google_calendar_conectado_em: new Date().toISOString()
  })
  
  return { sucesso: true, email: userInfo.email }
}
```

### API — GET /admin/google-calendar/status
```json
{
  "conectado": true,
  "email": "marcelo@gmail.com",
  "conectado_em": "2026-07-17T10:00:00Z",
  "token_valido": true
}
```

### API — DELETE /admin/google-calendar/desconectar
```js
async function desconectar(tenantId) {
  // Revogar token no Google
  const tokens = await getTokens(tenantId)
  await revokeToken(tokens.access_token)
  
  // Deletar do SSM
  await ssm.deleteParameter({ Name: `/mbf/${tenantId}/google/tokens` }).promise()
  
  // Atualizar config
  await atualizarConfig(tenantId, {
    google_calendar_conectado: false,
    google_calendar_email: null
  })
}
```

### Frontend — ConfigGoogleCalendar.jsx
- **Estado desconectado:** Botão "Conectar Google Calendar" + explicação
- **Estado conectado:** Email conectado, data, botão "Desconectar"
- **Estado erro:** Alerta "Token expirado" + botão "Reconectar"

### SSM Parameter Store
```
Path: /mbf/{tenantId}/google/tokens
Type: SecureString
KMS: aws/ssm (default)
Value: { access_token, refresh_token, expiry_date }
```

### Credenciais do App (Google Cloud Console)
```
Path: /mbf/global/google/client_credentials
Value: { client_id, client_secret, redirect_uri }
```

### Regras
- Apenas 1 conta Google por tenant
- `access_type=offline` + `prompt=consent` para obter refresh_token
- Tokens NUNCA em DynamoDB (apenas SSM criptografado)
- Se refresh_token falha: marcar como desconectado + alerta (GCL-06)
- Redirect URI: `https://api.mbfotos.com.br/admin/google-calendar/callback`

## Critérios de Aceite
- [ ] Fluxo OAuth2 completo funciona
- [ ] Tokens salvos no SSM (SecureString)
- [ ] Status exibido no frontend
- [ ] Desconectar revoga token e limpa SSM
- [ ] Apenas 1 conta por tenant
- [ ] Credenciais do app em SSM global

## Prompt Pronto para o Kiro CLI

```
Implemente a spec GCL-01: Conexão OAuth2 Google Calendar.

1. Crie handlers/google-calendar/oauth.js: auth-url, callback, status, desconectar.
2. Crie pages/admin/ConfigGoogleCalendar.jsx: estados conectado/desconectado.
3. OAuth2 com scope calendar.events, access_type=offline.
4. Tokens em SSM Parameter Store (SecureString).
5. Credenciais do app em /mbf/global/google/client_credentials.
6. Desconectar: revogar + deletar SSM.
7. SAM: 4 rotas + policy SSM.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
