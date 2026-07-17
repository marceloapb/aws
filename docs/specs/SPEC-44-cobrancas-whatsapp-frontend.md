# SPEC-44 — Criar Telas de Cobranças e WhatsApp (P1)

| Campo | Valor |
|-------|-------|
| **ID** | SPEC-44 |
| **Tipo** | Feature |
| **Título** | Criar Cobrancas.jsx e WhatsApp.jsx |
| **Prioridade** | P1 |
| **Impacto** | Alto — cobrar parcelas e comunicar com cliente |
| **Esforço** | Alto (2 telas complexas) |

---

## Contexto

Nenhuma das duas telas existe no frontend. Os backends estão completos:
- `admin-cobrancas.js` (5KB) — gestão de cobranças com gateway
- `admin-whatsapp.js` (3.5KB) — envio, templates, conversas

Protótipos ref:
- `cobranca-experiencia-prototipo.jsx` (16.3KB)
- `whatsapp-conexao-templates-prototipo.jsx` (20KB) + `whatsapp-conversas-log-prototipo.jsx` (25.4KB)

---

## Escopo

### Arquivos a CRIAR

**Cobranças:**
- `apps/frontend/src/pages/admin/Cobrancas.jsx` — listagem de cobranças
- `apps/frontend/src/pages/admin/CobrancaDetalhe.jsx` — detalhe da cobrança
- `apps/frontend/src/components/cobranca/CobrancaForm.jsx` — nova cobrança
- `apps/frontend/src/components/cobranca/ParcelaTimeline.jsx` — timeline de parcelas

**WhatsApp:**
- `apps/frontend/src/pages/admin/WhatsApp.jsx` — central WhatsApp
- `apps/frontend/src/components/whatsapp/ConversaList.jsx` — lista de conversas
- `apps/frontend/src/components/whatsapp/ChatPanel.jsx` — painel de chat
- `apps/frontend/src/components/whatsapp/TemplateList.jsx` — templates

### Arquivos a ALTERAR
- `apps/frontend/src/App.js` — rotas
- `apps/frontend/src/components/Sidebar.jsx` — itens no menu

---

## Spec Técnica — Cobranças

### Listagem (Cobrancas.jsx)
- Tabela: #, Cliente, Contrato, Valor, Parcela (X de Y), Vencimento, Status (pendente/pago/atrasado/cancelado), Ações
- Filtros: status, período, cliente
- Badges de cor: verde (pago), amarelo (pendente), vermelho (atrasado)
- Ações: Enviar lembrete, Marcar pago, Cancelar, Ver comprovante
- Indicadores no topo: Total a receber, Atrasado, Recebido no mês

### Formulário (CobrancaForm.jsx)
- Cliente (select)
- Contrato (select, filtra por cliente)
- Valor total (R$)
- Condição: à vista / parcelado
- Se parcelado: nº parcelas, data primeiro vencimento (gera datas automaticamente)
- Gateway: select do provedor ativo nas configurações
- Enviar cobrança ao salvar (toggle)

### Detalhe (CobrancaDetalhe.jsx)
- Dados do cliente e contrato
- Timeline de parcelas (ParcelaTimeline):
  - Cada parcela: número, valor, vencimento, status, data pagamento
  - Ações por parcela: Enviar lembrete, Marcar pago, Estornar
- Histórico de notificações enviadas
- Comprovantes (upload/visualização)

---

## Spec Técnica — WhatsApp

### Central (WhatsApp.jsx)
Layout com 2 painéis:
- Esquerda: lista de conversas (ConversaList)
- Direita: chat selecionado (ChatPanel)

### Lista de Conversas (ConversaList.jsx)
- Busca por nome/telefone
- Filtro: todas, não lidas, com pendência
- Cada item: avatar, nome, última mensagem (truncada), timestamp, badge não lidas
- Ordenado por mais recente

### Chat (ChatPanel.jsx)
- Histórico de mensagens (balões esquerda/direita)
- Tipos: texto, imagem, documento, template
- Input de mensagem com:
  - Campo de texto
  - Botão enviar
  - Botão "Usar template" → abre seletor de templates
  - Botão anexar (foto/documento)
- Informações do contato no header

### Templates (TemplateList.jsx)
- Lista de templates cadastrados
- Status: aprovado/pendente/rejeitado
- Preview do template
- Botão "Usar" → preenche no chat com variáveis

### API Endpoints (já existentes)

**Cobranças:**
- `GET/POST /api/admin/cobrancas`
- `GET/PUT/DELETE /api/admin/cobrancas/:id`
- `POST /api/admin/cobrancas/:id/lembrete`
- `PATCH /api/admin/cobrancas/:id/parcelas/:n/pagar`

**WhatsApp:**
- `GET /api/admin/whatsapp/conversas`
- `GET /api/admin/whatsapp/conversas/:id/mensagens`
- `POST /api/admin/whatsapp/enviar`
- `GET /api/admin/whatsapp/templates`
- `POST /api/admin/whatsapp/templates`

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/`, `template.yaml`, `infra/`
- Outras pages não listadas
- Funcionalidade de bot/automação (futuro)

---

## Critérios de Aceite
1. Cobranças lista parcelas com status visual
2. Criar cobrança parcelada gera datas automáticas
3. Enviar lembrete via WhatsApp funciona
4. WhatsApp exibe conversas em tempo real (polling ou refresh)
5. Enviar mensagem de texto funciona
6. Usar template insere mensagem com variáveis preenchidas
7. Ambos aparecem no Sidebar

---

## Prompt Pronto para o Kiro CLI

```
Implemente a SPEC-44 conforme docs/specs/SPEC-44-cobrancas-whatsapp-frontend.md.

Crie as telas de Cobranças e WhatsApp conforme especificado.
Use os protótipos em docs/prototipos/cobranca-experiencia-prototipo.jsx e docs/prototipos/whatsapp-conexao-templates-prototipo.jsx.

Arquivos a criar:
- apps/frontend/src/pages/admin/Cobrancas.jsx
- apps/frontend/src/pages/admin/CobrancaDetalhe.jsx
- apps/frontend/src/components/cobranca/CobrancaForm.jsx
- apps/frontend/src/components/cobranca/ParcelaTimeline.jsx
- apps/frontend/src/pages/admin/WhatsApp.jsx
- apps/frontend/src/components/whatsapp/ConversaList.jsx
- apps/frontend/src/components/whatsapp/ChatPanel.jsx
- apps/frontend/src/components/whatsapp/TemplateList.jsx

Arquivos a alterar:
- apps/frontend/src/App.js
- apps/frontend/src/components/Sidebar.jsx

NÃO TOQUE em nenhum arquivo fora dessa lista.
```
