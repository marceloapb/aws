# SPEC-46 — Criar Tela de Notas Fiscais (P2)

| Campo | Valor |
|-------|-------|
| **ID** | SPEC-46 |
| **Tipo** | Feature |
| **Título** | Criar NotasFiscais.jsx — emissão e gestão de NFS-e |
| **Prioridade** | P2 |
| **Impacto** | Relevante — obrigação fiscal |
| **Esforço** | Alto (ref: 20.7KB protótipo) |

---

## Contexto

Não existe tela de Notas Fiscais no frontend. O backend `admin-notas-fiscais.js` (9.1KB) é o mais robusto do sistema. Protótipo ref: `nota-fiscal-prototipo.jsx` (20.7KB).

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/pages/admin/NotasFiscais.jsx` — listagem
- `apps/frontend/src/pages/admin/NotaFiscalForm.jsx` — emissão
- `apps/frontend/src/pages/admin/NotaFiscalDetalhe.jsx` — visualização
- `apps/frontend/src/components/notafiscal/EmissaoWizard.jsx` — wizard de emissão
- `apps/frontend/src/components/notafiscal/NFStatusBadge.jsx` — badge status

### Arquivos a ALTERAR
- `apps/frontend/src/App.js` — rotas
- `apps/frontend/src/components/Sidebar.jsx` — item no menu

---

## Spec Técnica

### Listagem (NotasFiscais.jsx)
- Tabela: Número, Cliente, Valor, Data Emissão, Status (emitida/cancelada/rejeitada/processando), Ações
- Filtros: status, período, cliente
- KPIs: Total emitido no mês, Quantidade, Canceladas
- Ações: Baixar PDF, Baixar XML, Cancelar, Reemitir

### Wizard de Emissão (EmissaoWizard.jsx)
Step 1 — Origem:
- Emitir a partir de: Contrato (select) / Cobrança (select) / Manual
- Se vinculado, pré-preenche dados

Step 2 — Dados do Tomador:
- Nome/Razão Social, CPF/CNPJ, Endereço completo
- Se veio de contrato/cobrança, vem preenchido

Step 3 — Serviço:
- Descrição do serviço (textarea)
- Código do serviço municipal (select ou text)
- Valor (R$)
- Alíquota ISS (%)
- Deduções (R$, se aplicável)

Step 4 — Revisão e Emissão:
- Preview dos dados
- Botão "Emitir NFS-e"
- Feedback: processando → sucesso/erro

### Detalhe (NotaFiscalDetalhe.jsx)
- Todos os dados da nota (readonly)
- Status com timeline (emitida → enviada ao cliente)
- Botões: Baixar PDF, Baixar XML, Enviar por e-mail, Cancelar
- Se cancelada: motivo e data

### API Endpoints (já existentes)
- `GET /api/admin/notas-fiscais` — listar
- `GET /api/admin/notas-fiscais/:id` — detalhe
- `POST /api/admin/notas-fiscais` — emitir
- `POST /api/admin/notas-fiscais/:id/cancelar` — cancelar
- `GET /api/admin/notas-fiscais/:id/pdf` — download PDF
- `GET /api/admin/notas-fiscais/:id/xml` — download XML
- `POST /api/admin/notas-fiscais/:id/enviar` — enviar por email

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/`, `template.yaml`, `infra/`
- Integração real com prefeitura (já está no backend)
- Outras pages

---

## Critérios de Aceite
1. Wizard de emissão funciona em 4 steps
2. Pré-preenchimento a partir de contrato/cobrança funciona
3. Download de PDF e XML funciona
4. Cancelamento com motivo persiste
5. KPIs calculam corretamente
6. Item aparece no Sidebar

---

## Prompt Pronto para o Kiro CLI

```
Implemente a SPEC-46 conforme docs/specs/SPEC-46-notas-fiscais-frontend.md.

Crie NotasFiscais.jsx com wizard de emissão em 4 steps.
Siga docs/prototipos/nota-fiscal-prototipo.jsx.

Arquivos a criar:
- apps/frontend/src/pages/admin/NotasFiscais.jsx
- apps/frontend/src/pages/admin/NotaFiscalForm.jsx
- apps/frontend/src/pages/admin/NotaFiscalDetalhe.jsx
- apps/frontend/src/components/notafiscal/EmissaoWizard.jsx
- apps/frontend/src/components/notafiscal/NFStatusBadge.jsx

Arquivos a alterar:
- apps/frontend/src/App.js
- apps/frontend/src/components/Sidebar.jsx

NÃO TOQUE em nenhum arquivo fora dessa lista.
```
