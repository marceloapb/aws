# SPEC-45 — Criar Tela de Feedback (P2)

| Campo | Valor |
|-------|-------|
| **ID** | SPEC-45 |
| **Tipo** | Feature |
| **Título** | Criar Feedback.jsx — coleta e gestão de depoimentos |
| **Prioridade** | P2 |
| **Impacto** | Relevante — social proof e melhoria contínua |
| **Esforço** | Médio (ref: 11.6KB protótipo) |

---

## Contexto

Não existe tela de Feedback no frontend admin. O backend `admin-feedback.js` (5.5KB) e `client-feedback.js` (3.1KB) estão completos. O protótipo `feedback-prototipo.jsx` (11.6KB) define o fluxo.

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/pages/admin/Feedback.jsx` — listagem e gestão
- `apps/frontend/src/pages/admin/FeedbackDetalhe.jsx` — visualização + ações
- `apps/frontend/src/components/feedback/FeedbackCard.jsx` — card de depoimento
- `apps/frontend/src/components/feedback/SolicitarFeedbackModal.jsx` — modal de solicitação

### Arquivos a ALTERAR
- `apps/frontend/src/App.js` — rotas
- `apps/frontend/src/components/Sidebar.jsx` — item no menu

---

## Spec Técnica

### Listagem (Feedback.jsx)
- Cards ou tabela: Cliente, Evento, Nota (estrelas 1-5), Trecho do depoimento, Data, Status (pendente/aprovado/publicado/rejeitado)
- Filtros: status, nota mínima, período
- KPIs no topo: Nota média, Total recebidos, Pendentes de moderação, Taxa de resposta
- Botão "Solicitar feedback" → abre modal
- Ações em lote: Aprovar selecionados, Publicar no site

### Detalhe (FeedbackDetalhe.jsx)
- Nota (estrelas)
- Depoimento completo (texto)
- Dados do cliente e evento
- Fotos anexadas pelo cliente (se houver)
- Ações:
  - Aprovar / Rejeitar
  - Publicar no site (envia para apps/web/)
  - Responder (texto de agradecimento — enviado por e-mail/WhatsApp)
  - Solicitar edição (pede ao cliente para refrasear)

### Solicitar Feedback (SolicitarFeedbackModal.jsx)
- Select de cliente (filtro por jobs entregues sem feedback)
- Canal de envio: E-mail / WhatsApp / Ambos
- Template de mensagem (preview com variáveis)
- Botão enviar

### API Endpoints (já existentes)
- `GET /api/admin/feedback` — listar
- `GET /api/admin/feedback/:id` — detalhe
- `POST /api/admin/feedback/solicitar` — enviar solicitação
- `PATCH /api/admin/feedback/:id/status` — aprovar/rejeitar/publicar
- `POST /api/admin/feedback/:id/responder` — responder ao cliente

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/`, `template.yaml`, `infra/`
- Outras pages não listadas
- Integração com site público (será SPEC futura)

---

## Critérios de Aceite
1. Listagem exibe feedbacks com filtros e KPIs
2. Solicitar feedback envia notificação ao cliente
3. Aprovar/rejeitar muda status
4. Nota média calcula corretamente
5. Item aparece no Sidebar

---

## Prompt Pronto para o Kiro CLI

```
Implemente a SPEC-45 conforme docs/specs/SPEC-45-feedback-frontend.md.

Crie Feedback.jsx e FeedbackDetalhe.jsx seguindo docs/prototipos/feedback-prototipo.jsx.
Conecte às rotas de admin-feedback.js.

Arquivos a criar:
- apps/frontend/src/pages/admin/Feedback.jsx
- apps/frontend/src/pages/admin/FeedbackDetalhe.jsx
- apps/frontend/src/components/feedback/FeedbackCard.jsx
- apps/frontend/src/components/feedback/SolicitarFeedbackModal.jsx

Arquivos a alterar:
- apps/frontend/src/App.js
- apps/frontend/src/components/Sidebar.jsx

NÃO TOQUE em nenhum arquivo fora dessa lista.
```
