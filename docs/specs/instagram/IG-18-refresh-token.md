# IG-18: Refresh Token Automático + Alerta

## Metadados
- **ID:** IG-18
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** IG-01

## Contexto
O token long-lived do Instagram expira em 60 dias. O sistema deve fazer refresh automático antes de expirar (a cada 50 dias) e alertar o admin se o refresh falhar.

## Escopo
- `apps/backend/src/handlers/instagram/refreshToken.js` — NOVO
- EventBridge: cron diário (verificar expiração)

## Fora de Escopo (NÃO TOCAR)
- OAuth inicial (IG-01)
- Publicação (IG-03)
- Insights (IG-08)

## Spec Técnica

### Fluxo de Refresh
```js
async function refreshTokenIG(tenantId) {
  const conta = await getContaInstagram(tenantId)
  const diasParaExpirar = Math.floor(
    (new Date(conta.token_expira_em) - new Date()) / (1000 * 60 * 60 * 24)
  )
  
  // Refresh se faltam 10 dias ou menos
  if (diasParaExpirar > 10) return { acao: 'nenhuma', dias: diasParaExpirar }
  
  const tokenAtual = await getTokenSSM(conta.token_ssm_path)
  
  const response = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?` +
    `grant_type=ig_refresh_token&access_token=${tokenAtual}`
  )
  
  if (response.ok) {
    const { access_token, expires_in } = await response.json()
    const novaExpiracao = new Date(Date.now() + expires_in * 1000)
    
    await salvarTokenSSM(conta.token_ssm_path, access_token)
    await atualizarConta(tenantId, {
      token_expira_em: novaExpiracao.toISOString(),
      ultimo_refresh: new Date().toISOString()
    })
    return { acao: 'refreshed', nova_expiracao: novaExpiracao }
  } else {
    // Alertar admin
    await alertarAdmin(tenantId, 'TOKEN_IG_FALHOU', {
      erro: response.statusText,
      expira_em: conta.token_expira_em
    })
    return { acao: 'falhou', erro: response.statusText }
  }
}
```

### Alertas
| Condição | Alerta |
|---|---|
| Faltam 10 dias | 🟡 "Token IG expira em 10 dias" (tenta refresh) |
| Refresh falhou | 🔴 "Refresh falhou! Reconecte o Instagram" |
| Faltam 3 dias | 🔴 "URGENTE: Token IG expira em 3 dias" |
| Expirou | 🔴 "Token IG EXPIRADO — módulo desativado" |

### EventBridge (Cron Diário)
```yaml
InstagramRefreshSchedule:
  Type: AWS::Scheduler::Schedule
  Properties:
    ScheduleExpression: 'cron(0 8 * * ? *)'
    Target:
      Arn: !GetAtt RefreshTokenFunction.Arn
      RoleArn: !GetAtt SchedulerRole.Arn
    FlexibleTimeWindow:
      Mode: 'FLEXIBLE'
      MaximumWindowInMinutes: 30
```

### Frontend
- Badge na tela de conexão (IG-01): "Token expira em X dias"
- Se < 10 dias: badge amarelo
- Se < 3 dias: badge vermelho + banner
- Se expirou: módulo desativado + CTA "Reconectar"

## Critérios de Aceite
- [ ] Refresh automático quando faltam 10 dias
- [ ] Token novo salvo em SSM
- [ ] Alerta se refresh falhar
- [ ] Alerta urgente se < 3 dias
- [ ] Módulo desativado se expirou
- [ ] Cron diário
- [ ] Badge no frontend

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IG-18: Refresh Token Automático.

1. Crie handlers/instagram/refreshToken.js: verificar expiração, refresh.
2. EventBridge cron diário às 8h.
3. Refresh se faltam ≤10 dias.
4. Alertar admin se falhar.
5. Desativar módulo se token expirou.
6. SAM: schedule + rota.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
