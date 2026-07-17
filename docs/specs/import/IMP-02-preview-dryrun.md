# IMP-02: Preview/Dry-run com Validação Visual

## Metadados
- **ID:** IMP-02
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** IMP-01

## Contexto
Após o upload do CSV, o admin precisa ver uma prévia dos dados parseados ANTES de confirmar a importação. Isso evita erros de formato, dados trocados e importações acidentais.

## Escopo
- `apps/frontend/src/pages/admin/ImportCSV.jsx` — step de preview
- `apps/frontend/src/components/import/ImportPreviewTable.jsx` — NOVO
- `apps/frontend/src/utils/csvParser.js` — NOVO, parse client-side

## Fora de Escopo (NÃO TOCAR)
- Validação avançada por coluna (IMP-03)
- Detecção de duplicatas (IMP-04)
- Backend
- Seletor de entidade (IMP-01, já implementado)

## Spec Técnica

### Fluxo
1. Admin seleciona entidade (IMP-01) ✅
2. Admin faz upload do CSV
3. **NOVO → Preview aparece:** tabela com primeiras 20 linhas, headers mapeados
4. Admin revisa e clica "Confirmar importação" ou "Cancelar"

### Frontend — csvParser.js
```js
export function parseCSV(file, options = {}) {
  // Parse com: detecção de separador (vírgula ou ponto-e-vírgula)
  // Detecção de encoding (UTF-8, ISO-8859-1)
  // Retorna: { headers: [], rows: [[]], totalRows: number, errors: [] }
}
```

### Frontend — ImportPreviewTable.jsx
- Tabela com scroll horizontal
- Headers do CSV na primeira linha (bold)
- Primeiras 20 linhas de dados
- Contador: "Mostrando 20 de {total} registros"
- Colunas obrigatórias com ícone ✅ (preenchida) ou ❌ (vazia)
- Highlight em amarelo para células vazias obrigatórias
- Footer com resumo:
  - "✅ {X} registros válidos prontos para importar"
  - "⚠️ {Y} registros com problemas"
- Botões: "← Voltar" | "Confirmar importação →"

### Detecção de Separador
```js
function detectSeparator(firstLine) {
  const commas = (firstLine.match(/,/g) || []).length
  const semicolons = (firstLine.match(/;/g) || []).length
  return semicolons > commas ? ';' : ','
}
```

### Detecção de Encoding
- Tentar UTF-8 primeiro
- Se caracteres estranhos (Ã, Â, etc.), tentar ISO-8859-1
- Mostrar aviso se encoding problemático detectado

## Critérios de Aceite
- [ ] Após upload, tabela de preview aparece com dados parseados
- [ ] Mostra primeiras 20 linhas + contador total
- [ ] Detecta separador automaticamente (vírgula ou ponto-e-vírgula)
- [ ] Detecta encoding problemático e avisa
- [ ] Colunas obrigatórias vazias destacadas em amarelo
- [ ] Botão "Confirmar" só habilitado se pelo menos 1 registro válido
- [ ] Botão "Voltar" retorna ao step de upload
- [ ] CSV vazio mostra mensagem "Arquivo vazio ou sem dados"

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IMP-02: Preview/Dry-run com Validação Visual.

1. Crie apps/frontend/src/utils/csvParser.js:
   - export parseCSV(fileContent, separator) → { headers, rows, totalRows, errors }
   - export detectSeparator(firstLine) → ',' ou ';'
   - Suporte a campos com aspas e quebra de linha interna

2. Crie apps/frontend/src/components/import/ImportPreviewTable.jsx:
   - Props: { headers, rows, requiredColumns, totalRows }
   - Tabela com scroll horizontal, max 20 linhas
   - Highlight amarelo em células obrigatórias vazias
   - Contador "Mostrando X de Y"
   - Ícone ✅/❌ nos headers obrigatórios

3. Em ImportCSV.jsx, adicione step "preview" entre upload e confirmação:
   - Após upload: parseia CSV client-side com csvParser
   - Mostra ImportPreviewTable
   - Resumo: "{X} válidos, {Y} com problemas"
   - Botões: Voltar | Confirmar importação

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
