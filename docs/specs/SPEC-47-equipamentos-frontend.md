# SPEC-47 — Criar Tela de Equipamentos (P2)

| Campo | Valor |
|-------|-------|
| **ID** | SPEC-47 |
| **Tipo** | Feature |
| **Título** | Criar Equipamentos.jsx — inventário e checklist |
| **Prioridade** | P2 |
| **Impacto** | Relevante — controle de patrimônio e preparo para jobs |
| **Esforço** | Alto (ref: 40.6KB protótipo) |

---

## Contexto

Não existe tela de Equipamentos no frontend. O backend `admin-equipamentos.js` (3.3KB) tem CRUD. Protótipo ref: `inventario-checklist-prototipo.jsx` (40.6KB) — é o mais extenso pois inclui inventário + checklist por evento.

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/pages/admin/Equipamentos.jsx` — inventário
- `apps/frontend/src/pages/admin/EquipamentoForm.jsx` — criar/editar
- `apps/frontend/src/components/equipamento/ChecklistEvento.jsx` — checklist por evento
- `apps/frontend/src/components/equipamento/ManutencaoLog.jsx` — log de manutenção
- `apps/frontend/src/components/equipamento/EquipamentoCard.jsx` — card visual

### Arquivos a ALTERAR
- `apps/frontend/src/App.js` — rotas
- `apps/frontend/src/components/Sidebar.jsx` — item no menu

---

## Spec Técnica

### Inventário (Equipamentos.jsx)
- Grid de cards (EquipamentoCard) ou tabela toggle
- Cada card: Foto, Nome, Categoria, Status (disponível/em uso/manutenção/vendido), Valor patrimonial
- Filtros: categoria (Câmera, Lente, Flash, Tripé, Drone, Acessório, Outro), status
- Busca por nome/modelo
- Indicadores: Total itens, Valor total patrimônio, Em manutenção

### Formulário (EquipamentoForm.jsx)
- Nome/Modelo (text)
- Marca (text)
- Número de série (text)
- Categoria (select)
- Data de aquisição (date)
- Valor de aquisição (R$)
- Valor atual estimado (R$)
- Foto (upload)
- Status (select)
- Observações (textarea)

### Checklist por Evento (ChecklistEvento.jsx)
- Vinculado a um evento da agenda
- Lista de equipamentos com checkbox (vai/não vai)
- Template de checklist padrão por tipo de evento
- Status: Preparando → Pronto → Em uso → Devolvido
- Print/export da lista para conferência

### Log de Manutenção (ManutencaoLog.jsx)
- Histórico por equipamento:
  - Data, Tipo (preventiva/corretiva), Descrição, Custo, Prestador
- Botão "+ Registrar manutenção"
- Alerta visual quando última manutenção > X meses

### API Endpoints (já existentes)
- `GET /api/admin/equipamentos` — listar
- `GET /api/admin/equipamentos/:id` — detalhe
- `POST /api/admin/equipamentos` — criar
- `PUT /api/admin/equipamentos/:id` — editar
- `DELETE /api/admin/equipamentos/:id` — excluir

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/`, `template.yaml`, `infra/`
- Outras pages
- Integração com seguro (futuro)

---

## Critérios de Aceite
1. Inventário exibe equipamentos em grid/cards
2. Criar equipamento com foto funciona
3. Checklist vinculado a evento funciona
4. Log de manutenção registra entradas
5. Valor total de patrimônio calcula correto
6. Item aparece no Sidebar

---

## Prompt Pronto para o Kiro CLI

```
Implemente a SPEC-47 conforme docs/specs/SPEC-47-equipamentos-frontend.md.

Crie Equipamentos.jsx com grid de cards e EquipamentoForm.jsx.
Inclua ChecklistEvento.jsx e ManutencaoLog.jsx.
Siga docs/prototipos/inventario-checklist-prototipo.jsx.

Arquivos a criar:
- apps/frontend/src/pages/admin/Equipamentos.jsx
- apps/frontend/src/pages/admin/EquipamentoForm.jsx
- apps/frontend/src/components/equipamento/ChecklistEvento.jsx
- apps/frontend/src/components/equipamento/ManutencaoLog.jsx
- apps/frontend/src/components/equipamento/EquipamentoCard.jsx

Arquivos a alterar:
- apps/frontend/src/App.js
- apps/frontend/src/components/Sidebar.jsx

NÃO TOQUE em nenhum arquivo fora dessa lista.
```
