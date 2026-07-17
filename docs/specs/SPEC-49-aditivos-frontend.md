# SPEC-49 — Criar Tela de Aditivos (P2)

| Campo | Valor |
|-------|-------|
| **ID** | SPEC-49 |
| **Tipo** | Feature |
| **Título** | Criar Aditivos.jsx — renegociação de contratos |
| **Prioridade** | P2 |
| **Impacto** | Relevante — alterações pós-contrato são frequentes |
| **Esforço** | Médio (ref: 20.8KB protótipo) |

---

## Contexto

Não existe tela de Aditivos no frontend. O backend `admin-aditivos.js` (6.8KB) e `client-aditivos.js` (4.2KB) estão completos. Protótipo ref: `renegociacao-aditivo-prototipo.jsx` (20.8KB).

Aditivos são alterações pós-assinatura de contrato: mudança de data, adição de serviço, alteração de valor, etc.

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/pages/admin/Aditivos.jsx` — listagem
- `apps/frontend/src/pages/admin/AditivoForm.jsx` — criar/editar
- `apps/frontend/src/pages/admin/AditivoDetalhe.jsx` — visualização
- `apps/frontend/src/components/aditivo/ComparativoPanel.jsx` — antes/depois
- `apps/frontend/src/components/aditivo/AditivoStatusBadge.jsx` — badge

### Arquivos a ALTERAR
- `apps/frontend/src/App.js` — rotas
- `apps/frontend/src/components/Sidebar.jsx` — item no menu

---

## Spec Técnica

### Listagem (Aditivos.jsx)
- Tabela: #, Contrato original, Cliente, Tipo alteração, Impacto financeiro (+/-R$), Status (rascunho/enviado/aceito/rejeitado), Data, Ações
- Filtros: status, tipo, período
- Botão "+ Novo Aditivo" (seleciona contrato base)

### Formulário (AditivoForm.jsx)
- Contrato base (select — só contratos assinados)
- Tipo de alteração (checkboxes múltiplos):
  - Mudança de data
  - Adição de serviço
  - Remoção de serviço
  - Alteração de valor
  - Alteração de condição de pagamento
  - Outro (texto livre)
- Para cada tipo selecionado, campos específicos:
  - Mudança de data: data original (readonly) → nova data
  - Adição de serviço: select do catálogo + valor
  - Remoção: select do serviço atual
  - Valor: valor original (readonly) → novo valor
- Justificativa (textarea)
- Impacto financeiro: calculado automaticamente (diferença)
- Novas cláusulas (se necessário — editor simples)

### Comparativo (ComparativoPanel.jsx)
- Lado a lado: Contrato Original vs. Com Aditivo
- Campos alterados destacados em amarelo
- Resumo: "Alterações: +1 serviço, data alterada, +R$500"

### Detalhe (AditivoDetalhe.jsx)
- Dados completos do aditivo
- Comparativo embutido
- Ações por status:
  - Rascunho → Editar, Enviar para aceite, Excluir
  - Enviado → Reenviar, Cancelar
  - Aceito → Baixar PDF, Ver contrato atualizado
  - Rejeitado → Duplicar e ajustar
- Histórico de ações

### API Endpoints (já existentes)
- `GET /api/admin/aditivos` — listar
- `GET /api/admin/aditivos/:id` — detalhe
- `POST /api/admin/aditivos` — criar
- `PUT /api/admin/aditivos/:id` — editar
- `DELETE /api/admin/aditivos/:id` — excluir
- `POST /api/admin/aditivos/:id/enviar` — enviar para aceite
- `PATCH /api/admin/aditivos/:id/status` — mudar status

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/`, `template.yaml`, `infra/`
- Outras pages
- Geração de PDF do aditivo (já está no backend)

---

## Critérios de Aceite
1. Criar aditivo vinculado a contrato funciona
2. Comparativo exibe diferenças claramente
3. Impacto financeiro calcula automaticamente
4. Enviar para aceite muda status e notifica
5. Múltiplos tipos de alteração no mesmo aditivo
6. Item aparece no Sidebar

---

## Prompt Pronto para o Kiro CLI

```
Implemente a SPEC-49 conforme docs/specs/SPEC-49-aditivos-frontend.md.

Crie Aditivos.jsx com formulário dinâmico e ComparativoPanel.
Siga docs/prototipos/renegociacao-aditivo-prototipo.jsx.

Arquivos a criar:
- apps/frontend/src/pages/admin/Aditivos.jsx
- apps/frontend/src/pages/admin/AditivoForm.jsx
- apps/frontend/src/pages/admin/AditivoDetalhe.jsx
- apps/frontend/src/components/aditivo/ComparativoPanel.jsx
- apps/frontend/src/components/aditivo/AditivoStatusBadge.jsx

Arquivos a alterar:
- apps/frontend/src/App.js
- apps/frontend/src/components/Sidebar.jsx

NÃO TOQUE em nenhum arquivo fora dessa lista.
```
