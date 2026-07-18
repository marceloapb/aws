# STP-01 — ConfigSite + Multi-tenant

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | STP-01 |
| **Tipo** | Feature |
| **Prioridade** | P0 |
| **Impacto** | Alto — fundação para todo o site; sem isso nada renderiza |
| **Esforço** | Baixo |

## Contexto
Todo dado dinâmico do site público (logo, nome do estúdio, redes sociais, WhatsApp) vem de uma entidade `ConfigSite` vinculada ao tenant. Nada hardcoded — é o que permite multi-tenant futuro sem tocar código.

## Escopo
- **DynamoDB:** entidade `ConfigSite` (PK: `TENANT#<id>`, SK: `CONFIG#SITE`)
  - Campos: `logo_url`, `nome`, `redes[]` (array de {tipo, url}), `whatsapp_pessoal`, `tenant_id`
- **Lambda:** `getConfigSite` — GET público, retorna config do tenant (por domínio ou subdomínio)
- **Lambda:** `putConfigSite` — PUT autenticado (admin), valida e salva
- **API Gateway:** `GET /public/config` e `PUT /admin/config/site`
- **IAM:** role por Lambda, acesso mínimo à tabela
- **CloudFront:** cache da config pública (TTL 5min)

## Fora de Escopo (NÃO TOCAR)
- Telas do admin de configurações (§9) — já existem
- Identidade visual / CSS do site
- Outras páginas do site público

## Spec Técnica

### DynamoDB
```
PK: TENANT#1  SK: CONFIG#SITE
{
  logo_url: "https://cdn.../logo.png",
  nome: "Marcelo Bloise Fotografia",
  redes: [
    { tipo: "instagram", url: "https://instagram.com/..." },
    { tipo: "whatsapp", url: "https://wa.me/..." }
  ],
  whatsapp_pessoal: "5511999999999",
  tenant_id: "1",
  updated_at: "2026-07-18T00:00:00Z"
}
```

### Lambda getConfigSite
- Recebe header `x-tenant-domain` ou query `?tenant=1`
- Retorna 200 + JSON da config (sem campos sensíveis)
- Cache-Control: public, max-age=300

### Lambda putConfigSite
- Auth: Cognito admin
- Valida: logo_url (URL válida ou vazio), nome (obrigatório, max 100), redes (array, cada item com tipo+url), whatsapp (formato E.164)
- Retorna 200 + config atualizada

## Critérios de Aceite
- GET público retorna config sem autenticação
- PUT só funciona com token admin válido
- Logo ausente → resposta inclui `logo_url: null` (frontend faz fallback)
- Redes vazias → array vazio (footer não renderiza ícones)

## Prompt Pronto para o Kiro CLI
```
Implemente a spec STP-01 (ConfigSite + Multi-tenant).

Crie:
1. Lambda getConfigSite em src/functions/site/getConfigSite/index.mjs
2. Lambda putConfigSite em src/functions/site/putConfigSite/index.mjs
3. Adicione as rotas GET /public/config e PUT /admin/config/site no template.yaml
4. Crie IAM role por Lambda com acesso mínimo (dynamodb:GetItem / PutItem na tabela principal, partição TENANT#*)
5. Validação de input no PUT (nome obrigatório, whatsapp formato E.164, redes como array de {tipo, url})

Padrões: handler stateless, resposta { statusCode, body: JSON }, logs estruturados em JSON.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
