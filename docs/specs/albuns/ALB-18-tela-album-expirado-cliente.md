# ALB-18 — Tela de Álbum Expirado (Prorrogação pelo Cliente)

## META
| Campo | Valor |
|---|---|
| ID | ALB-18 |
| Tipo | Feature |
| Prioridade | P1 |
| Impacto | Alto — monetização + experiência do cliente |
| Esforço | Médio |
| Fonte | §11 atualização 05/07/2026 + protótipo `album-vitrine-cliente-prototipo.jsx` |

## CONTEXTO
A atualização 05/07/2026 do §11 define: cliente acessa álbum expirado → vê tela de expiração → escolhe faixa (1/3/6/12 meses) → paga → reativação automática (se online) ou "em análise" (se fora do gateway). O protótipo `album-vitrine-cliente-prototipo.jsx` já tem essa tela. A config global de prorrogação (ALB-10/ALB-11) define faixas e preços. Esta spec cobre o FLUXO do cliente + integração com gateway.

## ESCOPO

### Fluxo do cliente
```
1. Cliente acessa URL do álbum (slug)
2. Sistema verifica status:
   - Se entregue/publicado → vitrine normal
   - Se expirado → renderiza TELA DE EXPIRAÇÃO
3. Tela exibe:
   - Mensagem customizável (da config global)
   - Faixas ativas com preço (filtradas: só ativo=true)
   - Botão "Renovar acesso" por faixa
4. Cliente escolhe faixa → direciona para pagamento (§21.1)
5a. Pagamento online confirmado (webhook) → reativa automático (ALB-16: expirado → entregue, novo expira_em)
5b. Pagamento fora do gateway → status "em_analise" → admin confirma manualmente → reativa
```

### Entidade PRORROGACAO (nova)
```
PRORROGACAO
  id              ULID
  album_id        FK → ALBUM
  cliente_id      FK → CLIENTE
  faixa_meses     1 | 3 | 6 | 12
  valor           decimal (congelado no momento da escolha)
  status          pendente | pago | em_analise | cancelado
  cobranca_id     FK → COBRANCA (§21)
  criado_em       timestamp
  confirmado_em   timestamp (nullable)
  novo_expira_em  timestamp (calculado: now + faixa_meses)
```

### Lambda functions
- `album-prorrogacao-criar` — POST /albums/{slug}/prorrogacao
  - Valida: álbum está expirado, faixa está ativa, preço congelado
  - Cria PRORROGACAO com status=pendente
  - Cria COBRANCA via adapter de gateway (§21) tipo=Pix (ou link)
  - Retorna URL de pagamento ao cliente
- `album-prorrogacao-confirmar` — trigger: evento `cobranca.paga` (webhook do gateway)
  - Verifica cobranca_id vinculada a PRORROGACAO
  - Se pagamento online: status=pago, chama album-status-transition (ALB-16) expirado→entregue, seta novo expira_em
  - Se fora do gateway: status=em_analise (admin confirma depois)
- `album-prorrogacao-admin-confirmar` — POST /admin/prorrogacoes/{id}/confirmar
  - Admin confirma manualmente → mesmo efeito que pagamento online

### API Gateway (HTTP API)
- `POST /albums/{slug}/prorrogacao` — autenticado cliente
- `GET /albums/{slug}/prorrogacao/faixas` — público (retorna faixas ativas + preços)
- `POST /admin/prorrogacoes/{id}/confirmar` — autenticado ADM

### DynamoDB
- PK = `ALBUM#{album_id}`, SK = `PRORROGACAO#{id}`
- GSI: `cobranca_id` → para lookup rápido no evento de webhook

### Integração com ALB-10/ALB-11
- Faixas e preços lidos da CONFIG_ALBUM_GLOBAL (entidade da config global, spec ALB-10/11)
- Formato esperado:
```json
{
  "faixas_extensao": [
    { "meses": 1, "ativo": true, "valor": 49.90 },
    { "meses": 3, "ativo": true, "valor": 99.90 },
    { "meses": 6, "ativo": false, "valor": 149.90 },
    { "meses": 12, "ativo": true, "valor": 199.90 }
  ]
}
```

### Integração com Gateway (§21)
- Usa adapter de gateway padrão para criar cobrança Pix
- Webhook de confirmação emite evento `cobranca.paga` → trigger da Lambda de confirmação
- Idempotência: se PRORROGACAO já está `pago`, ignora evento duplicado

### IAM
- `album-prorrogacao-criar-role`: DynamoDB GetItem (ALBUM) + PutItem (PRORROGACAO) + invoke do adapter gateway
- `album-prorrogacao-confirmar-role`: DynamoDB UpdateItem (PRORROGACAO) + UpdateItem (ALBUM status+expira_em)
- `album-prorrogacao-admin-confirmar-role`: mesma da anterior + validação de role ADM

## FORA DE ESCOPO (NÃO TOCAR)
- Config global de faixas/preços (ALB-10/ALB-11) — esta spec CONSOME, não define
- Gateway de pagamento (§21) — esta spec USA o adapter, não o implementa
- Notificações de expiração próxima (§23 + ALB-10) — orquestrado por Notificações
- Frontend da tela de expiração (protótipo existe, implementação frontend separada)
- Máquina de estados (ALB-16) — esta spec CHAMA a transição, não a reimplementa

## CRITÉRIOS DE ACEITE
1. Cliente em álbum expirado vê apenas faixas com `ativo=true`
2. Valor congelado no momento da criação da prorrogação (não muda se admin alterar depois)
3. Pagamento online → álbum volta para `entregue` em < 30s (dependente do webhook)
4. Pagamento fora do gateway → status `em_analise` até admin confirmar
5. Admin confirma → álbum reativa com novo `expira_em` correto
6. Duplo webhook não gera dupla reativação (idempotência)
7. Faixa desativada nunca aparece para o cliente

## PROMPT PRONTO PARA O KIRO CLI

```
Implementar fluxo de prorrogação paga pelo cliente (spec ALB-18).

Criar/alterar SOMENTE:
- src/functions/album/prorrogacao-criar/handler.js (POST /albums/{slug}/prorrogacao — cria PRORROGACAO + COBRANCA via adapter)
- src/functions/album/prorrogacao-faixas/handler.js (GET /albums/{slug}/prorrogacao/faixas — retorna faixas ativas da config global)
- src/functions/album/prorrogacao-confirmar/handler.js (trigger evento cobranca.paga — reativa álbum)
- src/functions/album/prorrogacao-admin-confirmar/handler.js (POST /admin/prorrogacoes/{id}/confirmar — confirmação manual)
- template.yaml (4 funções + 3 rotas HTTP API + GSI cobranca_id + 4 roles IAM)

Regras:
- PRORROGACAO: PK=ALBUM#{album_id}, SK=PRORROGACAO#{ulid}
- GSI: GSI-CobrancaId com PK=cobranca_id para lookup no webhook
- Congelar valor no PutItem (copiar da config, não referenciar)
- Idempotência: se status já é 'pago', retornar 200 sem alterar
- Pagamento fora do gateway: status='em_analise', não reativa até admin confirmar
- Novo expira_em = now() + (faixa_meses * 30 dias) — simplificação aceita
- Emitir evento { source: "album", detail-type: "album.prorrogacao.confirmada" } ao reativar
- IAM: uma role por função, sem '*', recurso exato
- Não refatorar, renomear ou mexer em mais nada
```
