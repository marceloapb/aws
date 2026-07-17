# SPEC-50 — Criar Tela de Import/Export (P3)

| Campo | Valor |
|-------|-------|
| **ID** | SPEC-50 |
| **Tipo** | Feature |
| **Título** | Criar Import.jsx — importação e exportação de dados |
| **Prioridade** | P3 |
| **Impacto** | Desejável — facilita migração e backup manual |
| **Esforço** | Baixo-Médio |

---

## Contexto

Não existe tela de Import/Export no frontend. O backend `admin-import.js` (4.6KB) + `services/csvParserService.js` (2.7KB) suportam importação de dados via CSV. É útil para migrar dados do sistema antigo (PocketBase/Hostinger) e para exportar relatórios.

---

## Escopo

### Arquivos a CRIAR
- `apps/frontend/src/pages/admin/ImportExport.jsx` — tela principal
- `apps/frontend/src/components/import/ImportWizard.jsx` — wizard de importação
- `apps/frontend/src/components/import/ExportPanel.jsx` — painel de exportação
- `apps/frontend/src/components/import/MappingTable.jsx` — mapeamento de colunas

### Arquivos a ALTERAR
- `apps/frontend/src/App.js` — rota
- `apps/frontend/src/components/Sidebar.jsx` — item no menu

---

## Spec Técnica

### Layout (ImportExport.jsx)
Duas abas:
1. Importar
2. Exportar

### Importar (ImportWizard.jsx)
Wizard de 4 steps:

**Step 1 — Selecionar tipo de dado:**
- Clientes
- Contratos
- Lançamentos financeiros
- Equipamentos
- Catálogo

**Step 2 — Upload do arquivo:**
- Drag & drop de CSV
- Preview das primeiras 5 linhas
- Detectar encoding (UTF-8, Latin1)
- Detectar separador (vírgula, ponto-e-vírgula, tab)

**Step 3 — Mapeamento de colunas (MappingTable.jsx):**
- Tabela: Coluna do CSV → Campo do sistema (select)
- Auto-detect por nome similar
- Campos obrigatórios destacados
- Preview de como os dados ficarão

**Step 4 — Revisão e execução:**
- Resumo: X registros a importar, Y com erro
- Erros listados (linha + motivo)
- Botão "Importar" (só os válidos)
- Progress bar
- Resultado: X importados, Y ignorados

### Exportar (ExportPanel.jsx)
- Select tipo de dado (mesma lista)
- Filtros opcionais (período, status)
- Formato: CSV / JSON
- Botão "Exportar" → download direto
- Incluir ou não campos sensíveis (toggle)

### API Endpoints (já existentes)
- `POST /api/admin/import/upload` — upload do CSV
- `POST /api/admin/import/preview` — preview com mapeamento
- `POST /api/admin/import/execute` — executar importação
- `GET /api/admin/import/export/:tipo` — exportar dados

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/`, `template.yaml`, `infra/`
- Outras pages
- Importação de fotos (é via álbum)

---

## Critérios de Aceite
1. Upload de CSV exibe preview correto
2. Mapeamento de colunas com auto-detect funciona
3. Importação com erros parciais reporta quais falharam
4. Exportar CSV/JSON faz download
5. Item aparece no Sidebar

---

## Prompt Pronto para o Kiro CLI

```
Implemente a SPEC-50 conforme docs/specs/SPEC-50-import-export-frontend.md.

Crie ImportExport.jsx com wizard de importação em 4 steps e painel de exportação.
Conecte às rotas de admin-import.js e csvParserService.

Arquivos a criar:
- apps/frontend/src/pages/admin/ImportExport.jsx
- apps/frontend/src/components/import/ImportWizard.jsx
- apps/frontend/src/components/import/ExportPanel.jsx
- apps/frontend/src/components/import/MappingTable.jsx

Arquivos a alterar:
- apps/frontend/src/App.js
- apps/frontend/src/components/Sidebar.jsx

NÃO TOQUE em nenhum arquivo fora dessa lista.
```
