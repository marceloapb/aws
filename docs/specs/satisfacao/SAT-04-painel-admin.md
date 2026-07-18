# SAT-04: Painel Admin — Resumo + Lista

## Metadados
- **ID:** SAT-04
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** SAT-03

## Contexto
Tela admin para visualizar todos os feedbacks recebidos: média geral, distribuição por estrelas, lista com filtros, e ações de curadoria.

## Escopo
- `apps/backend/src/handlers/satisfacao/listarFeedbacks.js` — NOVO
- `apps/frontend/src/pages/admin/Feedbacks.jsx` — NOVO
- API: GET /admin/feedbacks

## Fora de Escopo (NÃO TOCAR)
- Tela cliente (SAT-03)
- Curadoria (SAT-05 — tela separada)
- Pesquisa de recusa (SAT-06/07)

## Spec Técnica

### API — GET /admin/feedbacks
Query params: `status`, `estrelas_min`, `estrelas_max`, `periodo`, `page`

```json
{
  "resumo": {
    "media_geral": 4.7,
    "total_feedbacks": 42,
    "respondidos": 38,
    "pendentes": 4,
    "distribuicao": {
      "5": 28,
      "4": 7,
      "3": 2,
      "2": 1,
      "1": 0
    }
  },
  "items": [
    {
      "id": "fb_001",
      "cliente_nome": "Ana Carolina",
      "tipo_evento": "Casamento",
      "estrelas": 5,
      "comentario": "Fotos incríveis!",
      "autoriza_publico": true,
      "marcado_depoimento": false,
      "respondido_em": "2026-07-20T14:30:00Z"
    }
  ],
  "pagination": { "page": 1, "total_pages": 3, "total_items": 42 }
}
```

### Frontend — Feedbacks.jsx
- **Cards resumo:** Média ⭐, Total, Respondidos, Pendentes
- **Barra de distribuição:** Visual das estrelas (barras horizontais)
- **Filtros:** Status, Estrelas (min/max), Período
- **Lista:** Cards com nome, evento, estrelas, comentário, data
- **Ações por item:**
  - 👁 Ver detalhes
  - ⭐ Marcar como depoimento (atalho para SAT-05)
  - 📋 Copiar comentário
- **Ordenação:** Mais recentes, Melhores, Piores

### Regras
- Média calculada apenas dos respondidos
- Pendentes: link enviado mas não respondeu
- Exibir tempo desde envio ("há 3 dias")

## Critérios de Aceite
- [ ] Cards resumo com média e distribuição
- [ ] Lista com filtros funcionando
- [ ] Paginação
- [ ] Ações: ver, marcar depoimento, copiar
- [ ] Ordenação
- [ ] Barra de distribuição visual

## Prompt Pronto para o Kiro CLI

```
Implemente a spec SAT-04: Painel Admin Feedbacks.

1. Crie handlers/satisfacao/listarFeedbacks.js: GET com filtros + resumo.
2. Crie pages/admin/Feedbacks.jsx: cards, distribuição, lista.
3. Filtros: status, estrelas, período.
4. Paginação.
5. Ações: ver, marcar depoimento, copiar.
6. SAM: rota GET /admin/feedbacks.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
