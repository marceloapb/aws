# ALB-10: Expiração do Álbum

## Metadados
- **ID:** ALB-10
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** ALB-07

## Contexto
Cada álbum tem um prazo de disponibilidade (ex: 90 dias). Após o prazo, o acesso é bloqueado automaticamente. O admin define prazo global (configurações) e pode sobrescrever por álbum. Avisos automáticos são enviados antes da expiração.

## Escopo
- `apps/backend/src/handlers/album/verificarExpiracao.js` — NOVO (Lambda scheduled)
- `apps/frontend/src/pages/admin/AlbumDetalhe.jsx` — campo expira_em, avisos
- EventBridge Scheduler: job diário de verificação
- DynamoDB: campo `expira_em` no ALBUM

## Fora de Escopo (NÃO TOCAR)
- Prorrogação paga (ALB-11 — separado)
- Upload/processamento
- Publicação

## Spec Técnica

### Configuração Global
- `prazo_padrao_dias: number` (default: 90)
- `avisos_antes_expirar: [30, 15, 7, 1]` (dias de antecedência)
- `canal_aviso: ['email', 'whatsapp']`

### Configuração por Álbum
- `expira_em: ISO date` — data exata de expiração
- Override do padrão se admin definir manualmente
- Se null: usa prazo_padrao_dias a partir de disponivel_em

### Job Diário (EventBridge → Lambda)
```
1. Query álbuns com status='publicado'
2. Para cada álbum:
   a. Se expira_em <= now(): status → 'expirado', bloquear acesso
   b. Se expira_em - now() in avisos_antes_expirar: enviar aviso ao cliente
3. Log de ações tomadas
```

### Aviso ao Cliente
- Template: "Seu álbum {titulo} expira em {dias} dias. Acesse: {url}"
- Variáveis: nome, titulo, url, dias_restantes, data_expiracao
- Canais: email + WhatsApp (se configurado)

### Bloqueio de Acesso
- AlbumView.jsx: se status='expirado' → mensagem amigável
- "Seu álbum expirou. Entre em contato para reativação."
- Link/botão para solicitar prorrogação (ALB-11)

### Frontend — AlbumDetalhe.jsx (admin)
- Campo editável: data de expiração
- Badge: "Expira em X dias" (verde > 30, amarelo 7-30, vermelho < 7)
- Botão: "Reativar" (se expirado) — muda status de volta para publicado + nova data

## Critérios de Aceite
- [ ] Job diário executa via EventBridge
- [ ] Álbuns expirados têm acesso bloqueado
- [ ] Avisos enviados nos dias configurados
- [ ] Mensagem amigável ao cliente no AlbumView
- [ ] Admin pode definir/alterar data de expiração
- [ ] Badge de contagem regressiva
- [ ] Reativar álbum expirado funciona
- [ ] Prazo padrão global respeitado

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ALB-10: Expiração do Álbum.

1. Crie handlers/album/verificarExpiracao.js: Lambda scheduled (EventBridge, diário).
2. Verificar álbuns publicados com expira_em <= now(): mudar status para 'expirado'.
3. Enviar avisos nos dias configurados (30, 15, 7, 1).
4. Em AlbumDetalhe.jsx: campo expira_em, badge contagem regressiva, botão reativar.
5. Em AlbumView.jsx: mensagem amigável se expirado.
6. SAM: EventBridge rule + Lambda.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
