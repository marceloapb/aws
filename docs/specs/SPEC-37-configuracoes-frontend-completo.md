# SPEC-37 — Expandir Tela de Configurações no Frontend

| Campo | Valor |
|-------|-------|
| **ID** | SPEC-37 |
| **Tipo** | Feature |
| **Título** | Expandir tela de Configurações com todas as seções previstas |
| **Prioridade** | P1 |
| **Impacto** | Alto — sem isso o fotógrafo não parametriza o sistema |
| **Esforço** | Médio (frontend only, backend já existe) |

---

## Contexto

A tela de Configurações atual exibe apenas 9 campos básicos de empresa (Razão Social, Nome Fantasia, CNPJ, Telefone, E-mail, CEP, Endereço, Cidade, Estado) e 2 campos genéricos (Prazo entrega, Condição pagamento).

A spec §9 (SPEC-15) define 3 seções obrigatórias com campos detalhados. Além disso, os módulos de WhatsApp (SPEC-29), Instagram (SPEC-36), Gateway de Pagamento (SPEC-27), Backup (SPEC-24) e Follow-up (SPEC-25) possuem configurações que devem estar acessíveis sob o guarda-chuva da tela de Configurações.

O **backend já está 100% implementado** — todas as rotas e services existem. Falta apenas o **frontend** refletir essas funcionalidades.

---

## Escopo

### Arquivos a CRIAR

- `apps/frontend/src/components/ConfigDadosEmpresa.js`
- `apps/frontend/src/components/ConfigPrazos.js`
- `apps/frontend/src/components/ConfigPagamento.js`
- `apps/frontend/src/components/ConfigIntegracoes.js`
- `apps/frontend/src/components/ConfigBackup.js`

### Arquivos a ALTERAR

- `apps/frontend/src/pages/Configuracoes.js` — refatorar para layout com Tabs (5 abas)

### Recursos AWS

Nenhum — é mudança exclusiva de frontend.

---

## Spec Técnica

### Aba 1 — Dados da Empresa (ConfigDadosEmpresa.js)

Expandir os campos existentes e adicionar:

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| Razão Social | text | sim | já existe |
| Nome Fantasia | text | sim | já existe |
| CNPJ/CPF | text masked | sim | já existe |
| Logo | file upload | não | usar presigned URL (mesmo padrão de admin-fotos) |
| Descrição | textarea | não | max 500 chars |
| Website | url | não | |
| Telefone | text masked | sim | já existe |
| E-mail | email | sim | já existe |
| WhatsApp comercial | text masked | não | formato +55... |
| Instagram | text | não | @usuario |
| Facebook | text | não | URL |
| CEP | text masked | sim | já existe, buscar endereço via API |
| Endereço | text | sim | já existe |
| Cidade | text | sim | já existe |
| Estado | select | sim | já existe |
| Horário abertura | time | não | |
| Horário fechamento | time | não | |
| Dias de funcionamento | checkboxes | não | Seg-Dom |

### Aba 2 — Prazos e Políticas (ConfigPrazos.js)

| Campo | Tipo | Default | Observação |
|-------|------|---------|------------|
| Prazo padrão de entrega (dias) | number | 30 | mover do campo atual |
| Validade do orçamento (dias) | number | 7 | após expirar, orçamento fecha |
| Prazo de reserva temporária (dias) | number | 3 | tempo para cliente confirmar |
| Texto de aviso de expiração | textarea | — | variáveis: {{cliente}}, {{data}}, {{dias}} |
| Prazo para feedback pós-entrega (dias) | number | 14 | |

### Aba 3 — Condições de Pagamento (ConfigPagamento.js)

| Campo | Tipo | Default | Observação |
|-------|------|---------|------------|
| Desconto à vista (%) | number | 10 | |
| Desconto máximo permitido (%) | number | 15 | trava no orçamento |
| Parcelas sem juros (máx) | number | 6 | |
| Valor mínimo da parcela (R$) | number | 200 | |
| Taxa de juros ao mês (%) | number | 2.5 | para parcelamento com juros |
| Sinal mínimo (%) | number | 30 | % do valor total |
| Meios aceitos | checkboxes | todos | PIX, Boleto, Cartão Crédito, Cartão Débito, Dinheiro, Transferência |
| Condição padrão | select | Sinal + parcelas | usado como default em novo orçamento |

### Aba 4 — Integrações (ConfigIntegracoes.js)

Sub-abas internas:

**WhatsApp**
- Status de conexão (badge verde/vermelho, readonly)
- WABA ID (readonly)
- Phone Number ID (readonly)
- Botão "Reconectar" → chama `POST /api/admin/whatsapp/reconnect`
- Lista de templates cadastrados (readonly, link para editar)

**Instagram**
- Conta vinculada (readonly: @usuario)
- Status (conectado/desconectado)
- Permissões ativas (lista readonly)
- Botão "Vincular conta" → chama fluxo OAuth existente

**Gateway de Pagamento**
- Provedor ativo (select: Asaas, Banco Inter, InfinitePay, MercadoPago, Pagar.me, PagBank, PicPay, Stone, Stripe, SumUp)
- Credenciais (inputs masked — client_id, client_secret, access_token)
- Ambiente (toggle: sandbox / produção)
- Botão "Testar conexão" → chama `POST /api/admin/cobrancas/test-gateway`

**Google Calendar**
- Status de sincronização (readonly)
- Calendário vinculado (readonly)
- Botão "Sincronizar agora" → chama `POST /api/admin/google-calendar/sync`

### Aba 5 — Backup e Sistema (ConfigBackup.js)

| Campo | Tipo | Observação |
|-------|------|------------|
| Backup automático | toggle | ativo/inativo |
| Horário do backup | time | default 03:00 |
| Retenção (dias) | number | default 30 |
| Último backup | datetime readonly | exibir status |
| Prefixo S3 | text readonly | |
| Botão "Executar backup agora" | button | chama `POST /api/admin/backup/trigger` |

---

## Padrão de Implementação

- Usar componente de Tabs (padrão já existente no frontend)
- Cada aba faz `GET /api/admin/configuracoes` ao montar
- Salvar via `PATCH /api/admin/configuracoes` com payload parcial da aba ativa
- Seguir `docs/style-guide.md` para cores, espaçamento, tipografia
- Seguir padrão de componentes existentes em `apps/frontend/src/components/`
- Toast de sucesso/erro após salvar
- Loading skeleton enquanto carrega dados

---

## Fora de Escopo (NÃO TOCAR)

- `apps/api/` — backend já está pronto, não alterar
- `apps/web/` — site público, não alterar
- `template.yaml` — infra SAM, não alterar
- `infra/` — CloudFormation, não alterar
- Outras pages do frontend — não alterar
- Não refatorar, renomear ou mexer em mais nada

---

## Critérios de Aceite

1. Tela de Configurações exibe 5 abas navegáveis
2. Aba "Dados da Empresa" exibe todos os 17 campos listados
3. Aba "Prazos" exibe 5 campos com defaults corretos
4. Aba "Pagamento" exibe 8 campos parametrizáveis
5. Aba "Integrações" exibe sub-abas de WhatsApp, Instagram, Gateway e Google Calendar com dados reais da API
6. Aba "Backup" exibe controles e status do último backup
7. Salvar em qualquer aba persiste via PATCH e exibe toast de confirmação
8. Nenhum arquivo fora do escopo foi alterado

---

## Prompt Pronto para o Kiro CLI

```
Implemente a SPEC-37 conforme docs/specs/SPEC-37-configuracoes-frontend-completo.md.

Crie 5 componentes de aba e refatore a página Configuracoes.js para usar Tabs.
Use o padrão de componentes existente em apps/frontend/src/components/.
Siga o style-guide em docs/style-guide.md.
Faça GET/PATCH em /api/admin/configuracoes.
Para integrações, use as rotas já existentes: admin-whatsapp, admin-instagram, admin-cobrancas, admin-google-calendar.

Arquivos a criar:
- apps/frontend/src/components/ConfigDadosEmpresa.js
- apps/frontend/src/components/ConfigPrazos.js
- apps/frontend/src/components/ConfigPagamento.js
- apps/frontend/src/components/ConfigIntegracoes.js
- apps/frontend/src/components/ConfigBackup.js

Arquivos a alterar:
- apps/frontend/src/pages/Configuracoes.js

NÃO TOQUE em nenhum arquivo fora dessa lista. Não altere backend, template.yaml, infra/, apps/web/ ou outras pages.
```
