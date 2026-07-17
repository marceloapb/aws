# SPEC-38 — Expandir Tela de Orçamentos (P0)

| Campo | Valor |
|-------|-------|
| **ID** | SPEC-38 |
| **Tipo** | Feature |
| **Título** | Expandir Orcamentos.jsx para fluxo completo |
| **Prioridade** | P0 |
| **Impacto** | Crítico — core business, sem isso não vende |
| **Esforço** | Alto (page mais complexa do sistema — ref: 50KB protótipo) |

---

## Contexto

Orcamentos.jsx tem 3.8KB (7.5% do protótipo de 50.6KB). Apenas lista orçamentos. Falta o fluxo completo de criação, edição, envio, aceite e conversão em contrato.

Backend: `apps/api/src/routes/admin-orcamentos.js` (6KB) — CRUD completo com status machine.
Protótipo ref: `docs/prototipos/orcamento-completo-prototipo.jsx` (50.6KB).

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/pages/admin/OrcamentoForm.jsx` — formulário de criação/edição
- `apps/frontend/src/pages/admin/OrcamentoDetalhe.jsx` — visualização + ações
- `apps/frontend/src/components/orcamento/ItemServico.jsx` — linha de item
- `apps/frontend/src/components/orcamento/ResumoValores.jsx` — totais e descontos
- `apps/frontend/src/components/orcamento/StatusBadge.jsx` — badge de status

### Arquivos a ALTERAR
- `apps/frontend/src/pages/admin/Orcamentos.jsx` — expandir listagem com filtros e ações
- `apps/frontend/src/App.js` — adicionar rotas /admin/orcamentos/:id e /admin/orcamentos/novo

---

## Spec Técnica

### Listagem (Orcamentos.jsx)
- Tabela com colunas: #, Cliente, Evento, Data Evento, Valor Total, Status, Ações
- Filtros: status (rascunho/enviado/aceito/recusado/expirado), período, busca por cliente
- Ações em lote: enviar selecionados, excluir rascunhos
- Botão "+ Novo Orçamento" → navega para OrcamentoForm
- Indicador visual de orçamentos expirando (amarelo) e expirados (vermelho)

### Formulário (OrcamentoForm.jsx)
- **Seção 1 — Cliente**: Autocomplete de clientes existentes OU cadastro rápido inline
- **Seção 2 — Evento**: Tipo (casamento/ensaio/corporativo/etc), data, local, duração estimada
- **Seção 3 — Itens/Serviços**: Lista dinâmica de itens do catálogo
  - Cada item: serviço (select do catálogo), quantidade, valor unitário, subtotal
  - Botão "+ Adicionar item" e "+ Item personalizado"
  - Drag & drop para reordenar
- **Seção 4 — Valores**: Subtotal (automático), desconto (% ou R$), valor final
  - Validar: desconto não excede % máximo das configurações
- **Seção 5 — Condições**: Condição de pagamento (select), parcelas, observações
  - Defaults vindos das Configurações (SPEC-37)
- **Seção 6 — Validade**: Dias (default das Configurações), data de expiração calculada
- **Ações**: Salvar rascunho, Salvar e Enviar, Cancelar
- Enviar = muda status para "enviado" + dispara notificação (email/WhatsApp)

### Detalhe (OrcamentoDetalhe.jsx)
- Visualização completa do orçamento (modo leitura)
- Ações contextuais por status:
  - Rascunho → Editar, Enviar, Excluir
  - Enviado → Reenviar, Marcar aceito manualmente, Cancelar
  - Aceito → Gerar contrato (navega para contrato pré-preenchido)
  - Recusado/Expirado → Duplicar (cria cópia como rascunho)
- Histórico de ações (timeline): criado, enviado, visualizado, aceito/recusado
- Botão "Duplicar orçamento" em qualquer status

### API Endpoints (já existentes)
- `GET /api/admin/orcamentos` — listar com filtros
- `GET /api/admin/orcamentos/:id` — detalhe
- `POST /api/admin/orcamentos` — criar
- `PUT /api/admin/orcamentos/:id` — editar
- `PATCH /api/admin/orcamentos/:id/status` — mudar status
- `DELETE /api/admin/orcamentos/:id` — excluir
- `POST /api/admin/orcamentos/:id/enviar` — enviar para cliente
- `POST /api/admin/orcamentos/:id/duplicar` — duplicar

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/` — backend pronto
- `template.yaml`
- Outras pages
- Não refatorar componentes existentes não listados

---

## Critérios de Aceite
1. Listagem exibe orçamentos com filtros funcionais
2. Criar orçamento com itens do catálogo funciona end-to-end
3. Enviar orçamento muda status e dispara notificação
4. Aceitar orçamento permite gerar contrato
5. Duplicar orçamento cria cópia como rascunho
6. Validação de desconto máximo respeita configurações

---

## Prompt Pronto para o Kiro CLI

```
Implemente a SPEC-38 conforme docs/specs/SPEC-38-orcamentos-frontend-completo.md.

Expanda Orcamentos.jsx e crie OrcamentoForm.jsx e OrcamentoDetalhe.jsx seguindo o protótipo em docs/prototipos/orcamento-completo-prototipo.jsx.
Use o padrão de componentes de apps/frontend/src/components/.
Conecte às rotas existentes em admin-orcamentos.js.
Adicione as novas rotas no App.js.

Arquivos a criar:
- apps/frontend/src/pages/admin/OrcamentoForm.jsx
- apps/frontend/src/pages/admin/OrcamentoDetalhe.jsx
- apps/frontend/src/components/orcamento/ItemServico.jsx
- apps/frontend/src/components/orcamento/ResumoValores.jsx
- apps/frontend/src/components/orcamento/StatusBadge.jsx

Arquivos a alterar:
- apps/frontend/src/pages/admin/Orcamentos.jsx
- apps/frontend/src/App.js

NÃO TOQUE em nenhum arquivo fora dessa lista. Não altere backend, template.yaml, infra/ ou outras pages.
```
