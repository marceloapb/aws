# ALB-11: Prorrogação Paga

## Metadados
- **ID:** ALB-11
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Alto
- **Dependência:** ALB-10

## Contexto
Quando o álbum expira (ou está próximo de expirar), o cliente pode comprar uma prorrogação. Faixas configuráveis (1, 3, 6, 12 meses) com preços definidos pelo admin. Pagamento online reativa automaticamente; pagamento offline fica "em análise".

## Escopo
- `apps/backend/src/handlers/album/prorrogacao.js` — NOVO
- `apps/frontend/src/pages/cliente/ProrrogacaoPage.jsx` — NOVO
- `apps/frontend/src/pages/admin/AlbumDetalhe.jsx` — histórico de prorrogações
- API: GET /c/:slug/prorrogacao/opcoes, POST /c/:slug/prorrogacao

## Fora de Escopo (NÃO TOCAR)
- Gateway de pagamento (módulo CFG já tem)
- Expiração automática (ALB-10)
- Outros módulos

## Spec Técnica

### Faixas de Prorrogação (configurável em ConfigEmpresa)
```json
{
  "prorrogacao_faixas": [
    { "meses": 1, "preco": 49.90, "ativo": true },
    { "meses": 3, "preco": 119.90, "ativo": true },
    { "meses": 6, "preco": 199.90, "ativo": true },
    { "meses": 12, "preco": 349.90, "ativo": false }
  ]
}
```

### Fluxo
```
1. Cliente acessa álbum expirado/próximo de expirar
2. Vê opções de prorrogação com preços
3. Escolhe faixa e clica "Prorrogar"
4. Se pagamento online (gateway): pagamento processado → reativação automática
5. Se pagamento offline (PIX/transferência): status 'em_analise' → admin aprova → reativa
```

### Backend — prorrogacao.js
```js
// GET /c/:slug/prorrogacao/opcoes
// Retorna faixas ativas com preços

// POST /c/:slug/prorrogacao
// Body: { faixa_meses: 3, metodo_pagamento: 'pix' }
// Ações:
//   1. Criar registro de prorrogação no DynamoDB
//   2. Se gateway online: criar cobrança → webhook confirma → reativar
//   3. Se offline: status 'pendente' → notificar admin
//   4. Se aprovado: expira_em += faixa_meses
```

### Entidade PRORROGACAO
```json
{
  "PK": "ALBUM#alb_001",
  "SK": "PRORROGACAO#pror_001",
  "id": "pror_001",
  "album_id": "alb_001",
  "faixa_meses": 3,
  "valor": 119.90,
  "status": "aprovada",
  "metodo_pagamento": "pix",
  "data_solicitacao": "2026-10-01T10:00:00Z",
  "data_aprovacao": "2026-10-01T10:05:00Z",
  "expira_em_anterior": "2026-10-01T00:00:00Z",
  "expira_em_novo": "2027-01-01T00:00:00Z"
}
```

### Frontend — ProrrogacaoPage.jsx
- Cards com faixas e preços
- Seleção de método de pagamento
- Integração com gateway (ou PIX estático)
- Mensagem de sucesso/pendência
- Redirect para álbum após aprovação

### Frontend — AlbumDetalhe.jsx (admin)
- Histórico de prorrogações (tabela)
- Aprovar prorrogações pendentes
- Badge: "Prorrogado até {data}"

## Critérios de Aceite
- [ ] Faixas configuráveis (1/3/6/12 meses)
- [ ] Preços editáveis pelo admin
- [ ] Toggle ativo/inativo por faixa
- [ ] Pagamento online reativa automaticamente
- [ ] Pagamento offline fica pendente
- [ ] Admin pode aprovar/rejeitar
- [ ] expira_em atualizado corretamente
- [ ] Histórico de prorrogações visível
- [ ] Álbum reativado após aprovação

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ALB-11: Prorrogação Paga.

1. Crie handlers/album/prorrogacao.js: listar opções, criar solicitação, aprovar, reativar.
2. Crie pages/cliente/ProrrogacaoPage.jsx: cards de faixas, pagamento, feedback.
3. Em AlbumDetalhe.jsx: histórico de prorrogações, aprovar pendentes.
4. Entidade PRORROGACAO no DynamoDB.
5. SAM: rotas GET/POST /c/{slug}/prorrogacao.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
