# SPEC-43 — Criar Tela de Clientes (P1)

| Campo | Valor |
|-------|-------|
| **ID** | SPEC-43 |
| **Tipo** | Feature |
| **Título** | Criar Clientes.jsx — CRM básico |
| **Prioridade** | P1 |
| **Impacto** | Alto — base de todo o sistema (orçamento, contrato, álbum) |
| **Esforço** | Médio |

---

## Contexto

Não existe tela de Clientes no frontend. O backend `admin-clientes.js` (3.7KB) tem CRUD completo. Clientes são referenciados em orçamentos, contratos, álbuns e cobranças mas não há onde gerenciá-los diretamente.

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/pages/admin/Clientes.jsx` — listagem
- `apps/frontend/src/pages/admin/ClienteForm.jsx` — criar/editar
- `apps/frontend/src/pages/admin/ClienteDetalhe.jsx` — ficha completa

### Arquivos a ALTERAR
- `apps/frontend/src/App.js` — rotas
- `apps/frontend/src/components/Sidebar.jsx` — garantir item "Clientes" no menu

---

## Spec Técnica

### Listagem (Clientes.jsx)
- Tabela: Nome, E-mail, Telefone, WhatsApp, Cidade, Último Job, Total Jobs, Ações
- Busca: por nome, email, telefone
- Filtros: cidade, tem job ativo (sim/não)
- Ordenação: nome, último job, total jobs
- Botão "+ Novo Cliente"
- Ação rápida: WhatsApp (abre conversa), E-mail

### Formulário (ClienteForm.jsx)
- Nome completo (text, obrigatório)
- E-mail (email)
- Telefone (masked)
- WhatsApp (masked)
- CPF (masked)
- Data de nascimento (date)
- Endereço: CEP, Rua, Número, Complemento, Bairro, Cidade, Estado
- Como conheceu (select: Instagram, Google, Indicação, Outro)
- Observações (textarea)
- Tags (chips: VIP, Recorrente, Influencer, etc.)

### Ficha (ClienteDetalhe.jsx)
- Dados do cliente (readonly, botão editar)
- Histórico consolidado:
  - Orçamentos (lista com link)
  - Contratos (lista com link)
  - Álbuns (lista com link)
  - Pagamentos (resumo: total pago, pendente)
  - Feedbacks deixados
- Timeline de interações (criado, orçamento enviado, contrato assinado, álbum entregue)
- Ações: Enviar WhatsApp, Enviar e-mail, Novo orçamento para este cliente

### API Endpoints (já existentes)
- `GET /api/admin/clientes` — listar
- `GET /api/admin/clientes/:id` — detalhe
- `POST /api/admin/clientes` — criar
- `PUT /api/admin/clientes/:id` — editar
- `DELETE /api/admin/clientes/:id` — excluir

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/`, `template.yaml`, `infra/`
- Outras pages não listadas

---

## Critérios de Aceite
1. Listagem exibe clientes com busca e filtros
2. Criar cliente persiste via API
3. Ficha do cliente consolida histórico de orçamentos, contratos, álbuns, pagamentos
4. Botão WhatsApp abre conversa com número do cliente
5. Item "Clientes" aparece no Sidebar

---

## Prompt Pronto para o Kiro CLI

```
Implemente a SPEC-43 conforme docs/specs/SPEC-43-clientes-frontend.md.

Crie Clientes.jsx, ClienteForm.jsx e ClienteDetalhe.jsx.
Conecte às rotas de admin-clientes.js.
A ficha do cliente deve consolidar dados de orçamentos, contratos, álbuns e financeiro.

Arquivos a criar:
- apps/frontend/src/pages/admin/Clientes.jsx
- apps/frontend/src/pages/admin/ClienteForm.jsx
- apps/frontend/src/pages/admin/ClienteDetalhe.jsx

Arquivos a alterar:
- apps/frontend/src/App.js
- apps/frontend/src/components/Sidebar.jsx

NÃO TOQUE em nenhum arquivo fora dessa lista.
```
