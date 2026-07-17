# IG-01: Conexão OAuth + Token (Graph API)

## Metadados
- **ID:** IG-01
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Médio
- **Dependência:** Nenhuma

## Contexto
Fundação do módulo Instagram. O admin conecta a conta IG Business via OAuth da Meta. O sistema obtém o short-lived token, troca por long-lived (60 dias), e armazena em SSM. O refresh é tratado em IG-18.

## Escopo
- `apps/backend/src/handlers/instagram/conexao.js` — NOVO
- `apps/frontend/src/pages/admin/InstagramConexao.jsx` — NOVO
- API: GET /admin/instagram/conexao, POST /admin/instagram/oauth/callback
- SSM Parameter Store: token

## Fora de Escopo (NÃO TOCAR)
- Publicação (IG-03)
- Insights (IG-08)
- Refresh automático (IG-18)

## Spec Técnica

### Fluxo OAuth
```
1. Admin clica "Conectar Instagram"
2. Frontend redireciona para:
   https://www.facebook.com/v21.0/dialog/oauth?
     client_id={app_id}&
     redirect_uri={callback_url}&
     scope=instagram_basic,instagram_content_publish,instagram_manage_insights,pages_show_list,pages_read_engagement&
     response_type=code
3. Usuário autoriza
4. Meta redireciona para callback com ?code=xxx
5. Backend troca code por short-lived token:
   GET https://graph.facebook.com/v21.0/oauth/access_token?
     client_id={app_id}&client_secret={app_secret}&
     redirect_uri={callback}&code={code}
6. Trocar short por long-lived:
   GET https://graph.facebook.com/v21.0/oauth/access_token?
     grant_type=fb_exchange_token&
     client_id={app_id}&client_secret={app_secret}&
     fb_exchange_token={short_token}
7. Buscar Instagram Business Account ID:
   GET https://graph.facebook.com/v21.0/me/accounts (pages)
   GET https://graph.facebook.com/v21.0/{page_id}?fields=instagram_business_account
8. Salvar: token em SSM, ig_user_id e page_id em DynamoDB
```

### Entidade CONTA_INSTAGRAM
```json
{
  "PK": "TENANT#t123",
  "SK": "INSTAGRAM#CONTA",
  "ig_user_id": "17841400123456789",
  "page_id": "123456789",
  "username": "studiombf",
  "token_ssm_path": "/mbf/t123/instagram/token",
  "app_secret_ssm_path": "/mbf/t123/instagram/app_secret",
  "token_expira_em": "2026-09-15T10:00:00Z",
  "status": "conectado",
  "followers_count": 2500,
  "media_count": 340,
  "ultimo_refresh": "2026-07-17T10:00:00Z",
  "created_at": "2026-07-17T10:00:00Z"
}
```

### Permissões (Scopes)
| Scope | Uso |
|---|---|
| instagram_basic | Ler perfil, username, media_count |
| instagram_content_publish | Publicar posts e stories |
| instagram_manage_insights | Métricas da conta e posts |
| pages_show_list | Listar páginas do FB |
| pages_read_engagement | Ler engajamento da página |

### Frontend — InstagramConexao.jsx
- **Desconectado:** Botão "Conectar com Instagram" (abre OAuth)
- **Conectado:** Card com avatar, username, followers, media_count
- **Token expirando:** Alerta amarelo "Token expira em X dias"
- Botão "Desconectar" (limpa dados)

### Regras
- Token NUNCA no DynamoDB (só path SSM)
- App Secret em SSM separado
- Se callback falha: erro amigável + log
- Verificar que conta é Business (não Personal)

## Critérios de Aceite
- [ ] OAuth completo funciona
- [ ] Token long-lived obtido (60 dias)
- [ ] Token salvo em SSM
- [ ] ig_user_id salvo em DynamoDB
- [ ] Frontend exibe status conexão
- [ ] Erro se conta não é Business
- [ ] Desconectar funciona

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IG-01: Conexão OAuth Instagram.

1. Crie handlers/instagram/conexao.js: OAuth callback, trocar token.
2. Crie pages/admin/InstagramConexao.jsx: botão conectar, card status.
3. Trocar code → short → long-lived token.
4. Buscar ig_user_id via pages.
5. Token em SSM, dados em DynamoDB.
6. SAM: rotas /admin/instagram/conexao e /admin/instagram/oauth/callback.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
