# IMP-06: Importação Parcial (válidos importam, inválidos reportam)

## Metadados
- **ID:** IMP-06
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** IMP-03, IMP-05

## Contexto
Atualmente o comportamento é "tudo ou nada" — se houver erros, nada é importado. O admin precisa poder importar os registros válidos e receber relatório dos inválidos para corrigir e reimportar depois.

## Escopo
- `apps/frontend/src/pages/admin/ImportCSV.jsx` — lógica de importação parcial
- `apps/frontend/src/components/import/ImportResultPanel.jsx` — NOVO
- API: `POST /admin/import/batch` — ajustar para retornar parcial
- Lambda: `batchImport` — processar válidos, retornar rejeitados

## Fora de Escopo (NÃO TOCAR)
- Validação (IMP-03)
- Relatório de erros pré-importação (IMP-05)
- Detecção de duplicatas (IMP-04)
- Rollback (futuro)

## Spec Técnica

### Fluxo
1. Validação separa: validRows[] e invalidRows[]
2. Admin vê resumo: "✅ 85 válidos | ❌ 15 com erros"
3. Admin escolhe:
   - "Importar apenas válidos (85)" → importa parcial
   - "Corrigir CSV e reimportar" → cancela
4. Após importação parcial:
   - Mostra resultado: "✅ 83 importados | ⚠️ 2 falharam no backend"
   - Gera CSV com os que falharam (para reimportação)

### API — POST /admin/import/batch
```json
// Request
{
  "entidade": "clientes",
  "rows": [...validRows],
  "options": { "skip_duplicates": true }
}

// Response
{
  "imported": 83,
  "failed": [
    { "row": 12, "error": "Erro ao gravar no DynamoDB", "data": {...} },
    { "row": 45, "error": "Timeout", "data": {...} }
  ],
  "total_time_ms": 2340
}
```

### Lambda — batchImport
- Recebe array de rows válidas
- Processa em batches de 25 (limite BatchWriteItem do DynamoDB)
- Para cada item que falha: captura erro, adiciona ao array `failed`
- Não faz rollback dos bem-sucedidos
- Retorna summary com imported count + failed array

### Frontend — ImportResultPanel.jsx
- Card de resultado pós-importação:
  - ✅ "{X} registros importados com sucesso"
  - ⚠️ "{Y} registros falharam" (se Y > 0)
  - Lista dos falhados com motivo
  - Botão "📥 Baixar registros que falharam" (CSV pronto para corrigir)
  - Botão "Importar outro arquivo" (reset)
  - Botão "Ver registros importados" (navega para lista da entidade)

## Critérios de Aceite
- [ ] Admin pode importar apenas registros válidos
- [ ] Registros inválidos NÃO são enviados ao backend
- [ ] Se backend falha em alguns, mostra quais falharam
- [ ] CSV de falhados disponível para download
- [ ] Resumo pós-importação mostra contagens corretas
- [ ] Botão "Ver registros importados" navega corretamente
- [ ] Processamento em batches de 25

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IMP-06: Importação Parcial.

1. Crie apps/frontend/src/components/import/ImportResultPanel.jsx:
   - Props: { imported, failed, entidade }
   - Card com resultado: "{X} importados, {Y} falharam"
   - Se failed > 0: lista + botão download CSV dos falhados
   - Botões: "Importar outro" (reset) | "Ver registros" (navigate)

2. Backend POST /admin/import/batch:
   - Body: { entidade, rows[], options }
   - Lambda batchImport: processa em batches de 25 via BatchWriteItem
   - Captura erros individuais sem parar o batch
   - Retorna { imported, failed[], total_time_ms }

3. Em ImportCSV.jsx:
   - Após confirmação, enviar apenas validRows para POST /admin/import/batch
   - Mostrar ImportResultPanel com o response
   - Gerar CSV de failed rows para download

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
