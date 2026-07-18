# ARC-04 — Meus Eventos (Listagem)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | ARC-04 |
| **Tipo** | Feature |
| **Prioridade** | P1 |
| **Impacto** | Alto — eixo de navegação do cliente |
| **Esforço** | Baixo |

## Contexto
Lista todos os eventos (orçamentos) do cliente, com status traduzido e acesso ao detalhe. Cada card mostra: tipo do evento, data, status amigável, e badge de pendência. Ao clicar, abre o detalhe do evento (com abas: proposta, contrato, pagamentos, álbum, feedback).

## Escopo
- **Frontend:** `MeusEventosPage.jsx`
- **Lambda:** `getEventosCliente` — lista orçamentos/eventos do cliente logado
- **API Gateway:** `GET /cliente/eventos`
- **Cards:** tipo + data + status traduzido + badge pendência

## Fora de Escopo (NÃO TOCAR)
- Detalhe do evento (ARC-05 a ARC-09)
- Criação de novo orçamento (feito pelo site público → Captação §6)
- Eventos de outros clientes

## Spec Técnica

### Lambda getEventosCliente
- Auth: JWT cliente
- Query: GSI-CLIENTE PK=CLIENTE#<sub>, SK begins_with EVENTO#
- Retorna array ordenado por data desc:
```json
[
  {
    "id": "ev123",
    "tipo": "Casamento",
    "titulo": "Casamento Ana & João",
    "data_evento": "2026-09-15",
    "status_cliente": "Proposta aguardando sua aprovação",
    "tem_pendencia": true,
    "thumb_url": "https://cdn.../event-thumb.jpg"
  }
]
```

### Mapeamento de Status (interno → cliente)
| Status Interno | Status Cliente |
|---|---|
| proposta_enviada | Proposta aguardando sua aprovação |
| proposta_aceita | Proposta aceita ✓ |
| contrato_pendente | Contrato pronto para assinatura |
| contrato_assinado | Contrato assinado ✓ |
| em_producao | Evento confirmado |
| entrega_parcial | Fotos disponíveis |
| entrega_final | Álbum completo disponível |
| finalizado | Concluído ✓ |

### Estrutura da Página
```
<MeusEventosPage>
  <Header> "Meus Eventos" </Header>
  <EventosList>
    - Cards: thumb + tipo + título + data + status badge
    - Badge vermelha se tem_pendencia = true
    - Click → /cliente/eventos/:id
  </EventosList>
  <Empty> "Nenhum evento ainda. Solicite um orçamento!" + CTA </Empty>
</MeusEventosPage>
```

## Critérios de Aceite
- Lista apenas eventos do cliente logado
- Status SEMPRE traduzido (nunca mostra código interno)
- Badge de pendência visível quando há ação do cliente
- Ordenação: mais recente primeiro
- Lista vazia → CTA para solicitar orçamento
- Responsivo: cards full-width mobile, grid 2 cols desktop

## Prompt Pronto para o Kiro CLI
```
Implemente a spec ARC-04 (Meus Eventos — Listagem).

Crie:
1. src/functions/cliente/getEventosCliente/index.mjs — lista eventos do cliente logado
2. Rota GET /cliente/eventos no template.yaml (auth JWT cliente)
3. src/pages/cliente/MeusEventosPage.jsx — grid de cards com status traduzido + badge

Query: GSI-CLIENTE PK=CLIENTE#<sub> SK begins_with EVENTO#.
Status: traduz interno→amigável. Badge vermelha se pendência.
Empty state: CTA para solicitar orçamento.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
