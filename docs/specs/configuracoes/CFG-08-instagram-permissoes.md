# CFG-08: Instagram — Permissões, App Review

## Metadados
- **ID:** CFG-08
- **Tipo:** Melhoria
- **Prioridade:** P3
- **Impacto:** Baixo
- **Esforço:** Baixo
- **Dependência:** Nenhuma

## Contexto
A tela (print image-5.png) mostra apenas Business Account ID e botão "Vincular Conta". Faltam: status de permissões (quais grants ativos), indicação de App Review pendente, e token refresh status.

## Escopo
- `apps/frontend/src/pages/admin/` — tela Integrações > Instagram
- `apps/api/src/routes/admin-instagram.js` — endpoints extras

## Fora de Escopo (NÃO TOCAR)
- Lógica de publicação/resposta no Instagram
- Métricas de engajamento
- Feed/galeria
- Outros módulos

## Spec Técnica

### Campos na tela
| Campo | Tipo | Notas |
|---|---|---|
| Business Account ID | text readonly | Já existe |
| Status OAuth | badge | Conectado/Desconectado/Token expirado |
| Nome da página | text readonly | Vem da Graph API |
| Permissões ativas | checklist readonly | Lista de grants (instagram_basic, instagram_manage_comments, etc.) |
| App Review | badge | Aprovado/Pendente/Não submetido |
| Token expira em | date readonly | Dias restantes até expiração |
| Último refresh | datetime readonly | Quando o token foi renovado |

### API
| Método | Path | Descrição |
|---|---|---|
| GET | /admin/configuracoes/instagram | Status completo |
| POST | /admin/configuracoes/instagram/auth | Inicia OAuth Facebook/Instagram |
| GET | /admin/configuracoes/instagram/callback | Callback OAuth |
| POST | /admin/configuracoes/instagram/refresh | Força refresh do token |
| GET | /admin/configuracoes/instagram/permissions | Lista permissões ativas |

### DynamoDB
```
PK: TENANT#<id>
SK: CONFIG#INSTAGRAM
attributes: business_account_id, page_name, oauth_status, permissions[], app_review_status, token_expires_at, last_refresh, updated_at
```

## Critérios de Aceite
- [ ] Tela mostra status OAuth com badge
- [ ] Nome da página visível após vinculação
- [ ] Lista de permissões ativas (checklist visual)
- [ ] Badge de App Review (Aprovado/Pendente/Não submetido)
- [ ] Token expiration date visível
- [ ] Botão "Renovar Token" funciona

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CFG-08: Instagram — Permissões, App Review.

1. Frontend — tela Integrações > Instagram:
   - Badge OAuth status (Conectado/Desconectado/Token expirado)
   - Nome da página Instagram vinculada
   - Checklist visual de permissões (readonly)
   - Badge App Review (3 estados)
   - Info: token expira em X dias + botão "Renovar Token"

2. Backend em admin-instagram.js:
   - GET /admin/configuracoes/instagram → status completo
   - POST /auth → OAuth Facebook
   - GET /callback → salva tokens
   - POST /refresh → renova long-lived token
   - GET /permissions → chama /me/permissions na Graph API

3. DynamoDB: PK TENANT#<id>, SK CONFIG#INSTAGRAM

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
