# SPEC-52 — Criar Tela de Fotógrafos (P3)

| Campo | Valor |
|-------|-------|
| **ID** | SPEC-52 |
| **Tipo** | Feature |
| **Título** | Criar Fotografos.jsx — gestão de equipe/segundos fotógrafos |
| **Prioridade** | P3 |
| **Impacto** | Desejável — útil para quem trabalha com equipe |
| **Esforço** | Baixo |

---

## Contexto

Não existe tela de Fotógrafos no frontend. O backend `admin-fotografos.js` (2.9KB) tem CRUD básico. Essa tela é para gerenciar segundos fotógrafos, assistentes e freelancers que participam dos jobs.

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/pages/admin/Fotografos.jsx` — listagem
- `apps/frontend/src/pages/admin/FotografoForm.jsx` — criar/editar

### Arquivos a ALTERAR
- `apps/frontend/src/App.js` — rota
- `apps/frontend/src/components/Sidebar.jsx` — item no menu (submenu sob Configurações ou separado)

---

## Spec Técnica

### Listagem (Fotografos.jsx)
- Tabela/Cards: Nome, Especialidade, Telefone, E-mail, Status (ativo/inativo), Jobs realizados
- Busca por nome
- Filtros: status, especialidade
- Botão "+ Novo Fotógrafo"

### Formulário (FotografoForm.jsx)
- Nome completo (text, obrigatório)
- E-mail (email)
- Telefone (masked)
- WhatsApp (masked)
- CPF (masked)
- Especialidade (select múltiplo: Casamento, Ensaio, Drone, Vídeo, Assistente, etc.)
- Valor/dia ou valor/evento (R$) — cachê padrão
- PIX/Dados bancários (para pagamento)
- Observações (textarea)
- Status: Ativo / Inativo
- Foto de perfil (upload)

### Integração com Agenda
- Na tela de Agenda (SPEC existente), ao criar evento, poder selecionar fotógrafos da equipe
- Essa integração é mencionada aqui mas implementada via alteração mínima na Agenda (fora do escopo desta spec)

### API Endpoints (já existentes)
- `GET /api/admin/fotografos` — listar
- `GET /api/admin/fotografos/:id` — detalhe
- `POST /api/admin/fotografos` — criar
- `PUT /api/admin/fotografos/:id` — editar
- `DELETE /api/admin/fotografos/:id` — excluir

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/`, `template.yaml`, `infra/`
- Outras pages
- Integração com Agenda (será feita em spec separada)
- Sistema de comissão (futuro)

---

## Critérios de Aceite
1. Listagem exibe fotógrafos com busca e filtros
2. Criar fotógrafo com dados completos persiste
3. Status ativo/inativo funciona
4. Upload de foto de perfil funciona
5. Item aparece no Sidebar

---

## Prompt Pronto para o Kiro CLI

```
Implemente a SPEC-52 conforme docs/specs/SPEC-52-fotografos-frontend.md.

Crie Fotografos.jsx e FotografoForm.jsx.
Conecte às rotas de admin-fotografos.js.
Tela simples — CRUD com listagem e formulário.

Arquivos a criar:
- apps/frontend/src/pages/admin/Fotografos.jsx
- apps/frontend/src/pages/admin/FotografoForm.jsx

Arquivos a alterar:
- apps/frontend/src/App.js
- apps/frontend/src/components/Sidebar.jsx

NÃO TOQUE em nenhum arquivo fora dessa lista.
```
