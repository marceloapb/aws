# IMP-09: Barra de Progresso Real (polling)

## Metadados
- **ID:** IMP-09
- **Tipo:** Melhoria
- **Prioridade:** P3
- **Impacto:** Baixo
- **Esforço:** Médio
- **Dependência:** IMP-06

## Contexto
Para CSVs grandes (100+ registros), a importação demora alguns segundos. O admin precisa de feedback visual de progresso real, não apenas um spinner genérico.

## Escopo
- `apps/frontend/src/pages/admin/ImportCSV.jsx` — barra de progresso
- `apps/frontend/src/components/import/ImportProgressBar.jsx` — NOVO
- API: `GET /admin/import/status/:jobId` — NOVO
- Lambda: `getImportStatus` — NOVO
- DynamoDB: atualizar IMPORT_LOG com progresso

## Fora de Escopo (NÃO TOCAR)
- WebSocket (complexo demais, polling é suficiente)
- Importação em si (IMP-06)
- Histórico (IMP-07)

## Spec Técnica

### Fluxo
1. Admin confirma importação → POST /admin/import/batch retorna { jobId }
2. Frontend inicia polling: GET /admin/import/status/:jobId a cada 2s
3. Response: { status, processed, total, current_batch, errors_so_far }
4. Frontend atualiza barra de progresso em tempo real
5. Quando status = 'completed': para polling, mostra resultado

### API
| Método | Path | Response |
|---|---|---|
| GET | /admin/import/status/:jobId | { status, processed, total, errors_so_far, elapsed_ms } |

### Status possíveis
- `processing` — em andamento
- `completed` — finalizado com sucesso
- `completed_partial` — finalizado com falhas parciais
- `error` — falha geral

### Frontend — ImportProgressBar.jsx
- Barra de progresso animada (width baseado em processed/total)
- Texto: "{processed} de {total} registros processados"
- Texto secundário: "Batch {current_batch} de {total_batches}"
- Se errors_so_far > 0: aviso "⚠️ {X} erros até agora"
- Estimativa de tempo: "~{Y}s restantes"
- Botão "Cancelar" (se possível)

### Backend
- batchImport agora:
  1. Cria IMPORT_LOG com status=processing
  2. Retorna jobId imediatamente
  3. Processa batches atualizando DynamoDB a cada batch
  4. Ao final: atualiza status para completed/completed_partial
- getImportStatus: Query DynamoDB pelo jobId, retorna progresso

## Critérios de Aceite
- [ ] Barra de progresso aparece durante importação
- [ ] Progresso atualiza a cada 2s via polling
- [ ] Mostra contagem processados/total
- [ ] Mostra erros parciais em tempo real
- [ ] Estimativa de tempo restante aproximada
- [ ] Ao completar, para polling e mostra resultado
- [ ] Se conexão cair, pode reabrir página e ver status

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IMP-09: Barra de Progresso Real.

1. Crie apps/frontend/src/components/import/ImportProgressBar.jsx:
   - Props: { jobId }
   - useEffect com polling GET /admin/import/status/:jobId a cada 2000ms
   - Barra visual: width = (processed/total)*100 + '%'
   - Textos: processados/total, batch atual, erros parciais
   - Estimativa tempo: (elapsed_ms / processed) * remaining
   - Parar polling quando status !== 'processing'

2. Backend:
   - Refatorar batchImport para retornar jobId e processar async
   - Atualizar IMPORT_LOG a cada batch com processed count
   - Nova Lambda getImportStatus: GET pelo jobId

3. Em ImportCSV.jsx:
   - Após POST /admin/import/batch: receber jobId
   - Renderizar ImportProgressBar com jobId
   - Quando status = completed: mostrar ImportResultPanel

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
