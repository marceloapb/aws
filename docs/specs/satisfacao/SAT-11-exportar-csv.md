# SAT-11: Exportar Feedbacks/Motivos (CSV)

## Metadados
- **ID:** SAT-11
- **Tipo:** Feature
- **Prioridade:** P3
- **Impacto:** Baixo
- **Esforço:** Baixo
- **Dependência:** SAT-04, SAT-08

## Contexto
Admin pode exportar dados de feedbacks e pesquisas de recusa em CSV para análise externa (planilha, BI).

## Escopo
- `apps/backend/src/handlers/satisfacao/exportar.js` — NOVO
- API: GET /admin/feedbacks/exportar, GET /admin/pesquisas-recusa/exportar

## Fora de Escopo (NÃO TOCAR)
- Dashboard (SAT-08)
- Painel admin (SAT-04)
- Import (IMP-*)

## Spec Técnica

### API — GET /admin/feedbacks/exportar
Query params: `periodo`, `estrelas_min`

```
Response: Content-Type: text/csv

Cliente,Tipo Evento,Estrelas,Comentário,Autoriza Público,Respondido em
Ana Carolina,Casamento,5,"Fotos incríveis!",Sim,2026-07-20
Maria Lima,Ensaio,4,"Muito bom",Não,2026-07-18
```

### API — GET /admin/pesquisas-recusa/exportar
Query params: `periodo`

```
Response: Content-Type: text/csv

Cliente,Tipo Evento,Valor Orçamento,Motivo Principal,Motivos,Comentário,Respondido em
João Silva,Aniversário,2500,Preço,"preco;prazo_entrega","Achei caro",2026-07-15
```

### Backend
```js
async function exportarFeedbacks(tenantId, filtros) {
  const feedbacks = await listarTodosFeedbacks(tenantId, filtros)
  
  const csv = gerarCSV(feedbacks, [
    { header: 'Cliente', field: 'cliente_nome' },
    { header: 'Tipo Evento', field: 'tipo_evento' },
    { header: 'Estrelas', field: 'estrelas' },
    { header: 'Comentário', field: 'comentario' },
    { header: 'Autoriza Público', field: 'autoriza_publico', transform: v => v ? 'Sim' : 'Não' },
    { header: 'Respondido em', field: 'respondido_em', transform: formatarData }
  ])
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="feedbacks_${Date.now()}.csv"`
    },
    body: csv
  }
}
```

### Frontend
- Botão "Exportar CSV" no painel de feedbacks (SAT-04)
- Botão "Exportar CSV" no dashboard de recusa (SAT-08)
- Download direto (não abre nova aba)

### Regras
- Limitar a 1000 registros por exportação
- Se > 1000: filtrar por período
- Encoding: UTF-8 com BOM (para Excel)
- Escapar vírgulas e aspas no CSV

## Critérios de Aceite
- [ ] Exportar feedbacks em CSV
- [ ] Exportar pesquisas de recusa em CSV
- [ ] Filtros aplicados na exportação
- [ ] UTF-8 com BOM
- [ ] Limite 1000 registros
- [ ] Download direto

## Prompt Pronto para o Kiro CLI

```
Implemente a spec SAT-11: Exportar CSV.

1. Crie handlers/satisfacao/exportar.js: 2 rotas de exportação.
2. GET /admin/feedbacks/exportar: CSV com filtros.
3. GET /admin/pesquisas-recusa/exportar: CSV com filtros.
4. UTF-8 BOM, escapar vírgulas, limite 1000.
5. Content-Disposition: attachment.
6. SAM: 2 rotas GET.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
