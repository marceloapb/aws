# SAT-01: Modelo de Dados (DynamoDB)

## Metadados
- **ID:** SAT-01
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Baixo
- **Dependência:** Nenhuma

## Contexto
Definir as entidades do módulo Pesquisa de Satisfação: FEEDBACK (avaliação pós-entrega) e PESQUISA_RECUSA (motivo da recusa de orçamento).

## Escopo
- `apps/backend/src/models/satisfacao.js` — NOVO
- DynamoDB: 2 entidades principais

## Fora de Escopo (NÃO TOCAR)
- Disparo automático (SAT-02)
- Tela cliente (SAT-03)
- Módulos Álbum/Orçamento

## Spec Técnica

### Entidade 1: FEEDBACK
```json
{
  "PK": "TENANT#t123",
  "SK": "FEEDBACK#fb_001",
  "id": "fb_001",
  "album_id": "alb_001",
  "cliente_id": "cli_001",
  "orcamento_id": "orc_001",
  "estrelas": 5,
  "comentario": "Fotos incríveis! Superou todas as expectativas.",
  "autoriza_publico": true,
  "marcado_depoimento": false,
  "depoimento_aprovado": false,
  "nome_exibicao": "Ana C.",
  "tipo_evento": "Casamento",
  "respondido_em": "2026-07-20T14:30:00Z",
  "link_token": "xxx",
  "status": "respondido",
  "created_at": "2026-07-17T10:00:00Z"
}
```

### Entidade 2: PESQUISA_RECUSA
```json
{
  "PK": "TENANT#t123",
  "SK": "PESQUISA_RECUSA#pr_001",
  "id": "pr_001",
  "orcamento_id": "orc_005",
  "cliente_id": "cli_003",
  "motivo_principal": "preco",
  "motivos_selecionados": ["preco", "prazo_entrega"],
  "comentario_aberto": "Achei o valor acima do que esperava",
  "respondido_em": "2026-07-18T09:00:00Z",
  "link_token": "yyy",
  "status": "respondido",
  "created_at": "2026-07-17T15:00:00Z"
}
```

### Motivos Pré-definidos de Recusa
| Código | Label |
|---|---|
| preco | Preço acima do esperado |
| prazo_entrega | Prazo de entrega longo |
| disponibilidade | Fotógrafo indisponível na data |
| outro_profissional | Escolhi outro profissional |
| desistiu_evento | Desisti/adiei o evento |
| atendimento | Não me senti bem atendido |
| portfolio | Estilo não combinou comigo |
| outro | Outro motivo |

### Status
| Status | Descrição |
|---|---|
| pendente | Enviado, aguardando resposta |
| respondido | Cliente respondeu |
| expirado | Não respondeu no prazo |

### Helpers CRUD
```js
module.exports = {
  criarFeedback(tenantId, data) {},
  getFeedback(tenantId, feedbackId) {},
  listarFeedbacks(tenantId, filtros) {},
  atualizarFeedback(tenantId, feedbackId, data) {},
  criarPesquisaRecusa(tenantId, data) {},
  getPesquisaRecusa(tenantId, pesquisaId) {},
  listarPesquisasRecusa(tenantId, filtros) {},
  getMediaEstrelas(tenantId) {},
  getDepoimentosAprovados(tenantId) {},
  getMotivosRecusaAgregados(tenantId, periodo) {}
}
```

## Critérios de Aceite
- [ ] 2 entidades criadas no model
- [ ] Helpers CRUD para cada
- [ ] Motivos pré-definidos como constante
- [ ] Média de estrelas calculável
- [ ] Depoimentos filtráveis por aprovação

## Prompt Pronto para o Kiro CLI

```
Implemente a spec SAT-01: Modelo de Dados Satisfação.

1. Crie models/satisfacao.js: helpers CRUD para FEEDBACK e PESQUISA_RECUSA.
2. Entidades: FEEDBACK (estrelas, comentário, autoriza_publico, marcado_depoimento).
3. PESQUISA_RECUSA (motivos pré-definidos + aberto).
4. Helpers: média estrelas, depoimentos aprovados, motivos agregados.
5. Motivos como constante exportável.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
