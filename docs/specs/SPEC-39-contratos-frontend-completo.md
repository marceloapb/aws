# SPEC-39 — Expandir Tela de Contratos (P0)

| Campo | Valor |
|-------|-------|
| **ID** | SPEC-39 |
| **Tipo** | Feature |
| **Título** | Expandir Contratos.jsx para fluxo completo de geração e aceite |
| **Prioridade** | P0 |
| **Impacto** | Crítico — sem contrato completo, não fecha job |
| **Esforço** | Alto (ref: 26.5KB protótipo) |

---

## Contexto

Contratos.jsx tem 2.6KB (9.7% do protótipo de 26.5KB). Apenas lista contratos. Falta geração a partir do orçamento, edição de cláusulas, envio para aceite digital, assinatura e PDF.

Backend: `apps/api/src/routes/admin-contratos.js` (4.4KB) + `services/contratoService.js` (5.8KB) + `services/pdfService.js` (3.6KB).
Protótipo ref: `docs/prototipos/contrato-prototipo.jsx` (26.5KB).

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/pages/admin/ContratoForm.jsx` — criação/edição
- `apps/frontend/src/pages/admin/ContratoDetalhe.jsx` — visualização + ações
- `apps/frontend/src/components/contrato/ClausulaEditor.jsx` — editor de cláusulas
- `apps/frontend/src/components/contrato/AssinaturaPanel.jsx` — painel de assinatura

### Arquivos a ALTERAR
- `apps/frontend/src/pages/admin/Contratos.jsx` — expandir listagem
- `apps/frontend/src/App.js` — rotas /admin/contratos/:id e /novo

---

## Spec Técnica

### Listagem (Contratos.jsx)
- Tabela: #, Cliente, Evento, Valor, Status (rascunho/enviado/assinado/cancelado), Data Assinatura, Ações
- Filtros: status, período, busca
- Badge de status com cores distintas
- Ação rápida: Enviar, Baixar PDF, Cancelar

### Formulário (ContratoForm.jsx)
- **Modo 1 — Gerado de orçamento**: vem pré-preenchido (cliente, itens, valores, condições)
- **Modo 2 — Manual**: preencher do zero
- Seções:
  - Dados do contratante (readonly se veio do orçamento)
  - Dados do evento (data, local, horários)
  - Serviços contratados (itens do orçamento)
  - Valores e condições de pagamento
  - Cláusulas (editor com templates padrão + customização)
  - Multas e penalidades (campos: % multa cancelamento, prazo)
- Ações: Salvar rascunho, Salvar e Enviar para assinatura

### Cláusulas (ClausulaEditor.jsx)
- Lista de cláusulas com templates pré-definidos
- Drag & drop para reordenar
- Editar texto de cada cláusula
- Variáveis dinâmicas: {{cliente}}, {{evento}}, {{data}}, {{valor}}, {{parcelas}}
- Botão "+ Adicionar cláusula" e "Restaurar padrões"

### Detalhe (ContratoDetalhe.jsx)
- Visualização completa do contrato
- Ações por status:
  - Rascunho → Editar, Enviar, Excluir
  - Enviado → Reenviar, Marcar assinado manualmente
  - Assinado → Baixar PDF, Gerar aditivo
  - Cancelado → Duplicar
- Preview do PDF inline (iframe ou embed)
- Histórico: criado, enviado, visualizado pelo cliente, assinado

### Assinatura (AssinaturaPanel.jsx)
- Exibe status da assinatura
- Se assinado: exibe data, IP, nome do assinante
- Se pendente: botão reenviar link

### API Endpoints (já existentes)
- `GET/POST /api/admin/contratos`
- `GET/PUT/DELETE /api/admin/contratos/:id`
- `POST /api/admin/contratos/:id/enviar`
- `POST /api/admin/contratos/:id/pdf`
- `PATCH /api/admin/contratos/:id/status`

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/` — backend pronto
- `template.yaml`, `infra/`
- Outras pages não listadas

---

## Critérios de Aceite
1. Gerar contrato a partir de orçamento aceito pré-preenche todos os campos
2. Editor de cláusulas permite reordenar, editar e usar variáveis
3. Enviar para assinatura muda status e notifica cliente
4. Baixar PDF funciona
5. Histórico de ações visível no detalhe

---

## Prompt Pronto para o Kiro CLI

```
Implemente a SPEC-39 conforme docs/specs/SPEC-39-contratos-frontend-completo.md.

Expanda Contratos.jsx e crie ContratoForm.jsx e ContratoDetalhe.jsx seguindo o protótipo em docs/prototipos/contrato-prototipo.jsx.
Conecte às rotas de admin-contratos.js e services contratoService/pdfService.

Arquivos a criar:
- apps/frontend/src/pages/admin/ContratoForm.jsx
- apps/frontend/src/pages/admin/ContratoDetalhe.jsx
- apps/frontend/src/components/contrato/ClausulaEditor.jsx
- apps/frontend/src/components/contrato/AssinaturaPanel.jsx

Arquivos a alterar:
- apps/frontend/src/pages/admin/Contratos.jsx
- apps/frontend/src/App.js

NÃO TOQUE em nenhum arquivo fora dessa lista.
```
