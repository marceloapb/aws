# ARC-03 — Painel (Dashboard do Cliente)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | ARC-03 |
| **Tipo** | Feature |
| **Prioridade** | P1 |
| **Impacto** | Alto — visão rápida de pendências e próximos passos |
| **Esforço** | Médio |

## Contexto
Primeiro contato do cliente ao logar. Mostra: saudação personalizada, eventos com ação pendente (aceitar proposta, assinar contrato, pagar parcela), próximo evento no calendário, e atalhos rápidos. Tradução interna→cliente (status amigáveis).

## Escopo
- **Frontend:** `PainelPage.jsx`
- **Lambda:** `getDashboardCliente` — agrega dados de vários domínios para o cliente logado
- **API Gateway:** `GET /cliente/dashboard`
- **Dados agregados:** eventos com pendência, próximo evento, último álbum entregue

## Fora de Escopo (NÃO TOCAR)
- Detalhes de cada evento (ARC-04/05/06/07)
- Notificações push/email (módulo Follow-up)
- Calendário completo (admin-only)

## Spec Técnica

### Lambda getDashboardCliente
- Auth: JWT cliente (extrai sub do token)
- Query DynamoDB: GSI-CLIENTE PK=CLIENTE#<sub>
- Agrega:
```json
{
  "saudacao": "Olá, Marcelo!",
  "pendencias": [
    { "tipo": "proposta", "evento": "Casamento Ana & João", "acao": "Aceitar proposta", "link": "/cliente/eventos/ev123/proposta" },
    { "tipo": "pagamento", "evento": "Ensaio Família Silva", "acao": "Parcela vencendo em 3 dias", "link": "/cliente/eventos/ev456/pagamentos" }
  ],
  "proximo_evento": {
    "titulo": "Casamento Ana & João",
    "data": "2026-09-15",
    "dias_restantes": 59
  },
  "ultimo_album": {
    "titulo": "Ensaio Família Silva",
    "thumb_url": "https://cdn.../thumb.jpg",
    "link": "/cliente/eventos/ev456/album"
  }
}
```
- Tradução de status: `proposta_enviada` → "Aceitar proposta"; `parcela_pendente` → "Parcela vencendo em X dias"

### Estrutura da Página
```
<PainelPage>
  <Saudacao> "Olá, {primeiro_nome}!" </Saudacao>
  <CardsPendencias>
    - Lista de cards com ícone + texto + botão CTA
    - Vazio → "Tudo em dia! 🎉"
  </CardsPendencias>
  <ProximoEvento>
    - Card destaque com nome + data + countdown
    - Ausente → não renderiza
  </ProximoEvento>
  <UltimoAlbum>
    - Thumbnail + título + "Ver álbum"
    - Ausente → não renderiza
  </UltimoAlbum>
</PainelPage>
```

## Critérios de Aceite
- Saudação usa primeiro nome do cliente
- Pendências listam apenas ações que o CLIENTE precisa tomar
- Status internos NUNCA aparecem (traduzidos para linguagem amigável)
- Zero pendências → mensagem positiva
- Próximo evento mostra countdown em dias
- Responsivo: cards empilham em mobile

## Prompt Pronto para o Kiro CLI
```
Implemente a spec ARC-03 (Painel / Dashboard do Cliente).

Crie:
1. src/functions/cliente/getDashboardCliente/index.mjs — agrega pendências, próximo evento, último álbum
2. Rota GET /cliente/dashboard no template.yaml (auth JWT cliente)
3. src/pages/cliente/PainelPage.jsx — saudação + cards pendências + próximo evento + último álbum

Query: GSI-CLIENTE PK=CLIENTE#<sub>. Traduz status interno→linguagem cliente.
Pendências: proposta pendente, contrato pendente, pagamento próximo.
Zero pendências = "Tudo em dia! 🎉".

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
