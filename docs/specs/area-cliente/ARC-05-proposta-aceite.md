# ARC-05 — Proposta (Visualizar + Aceitar)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | ARC-05 |
| **Tipo** | Feature |
| **Prioridade** | P0 |
| **Impacto** | Crítico — fecha a venda, converte lead em cliente |
| **Esforço** | Alto |

## Contexto
O cliente recebe link (e-mail/WhatsApp) para visualizar a proposta. Ao abrir, vê: pacote escolhido, itens inclusos, valor, condições de pagamento, validade. Pode ACEITAR (com confirmação) ou SOLICITAR ALTERAÇÃO (mensagem livre). Aceite gera evento no sistema e dispara geração de contrato.

## Escopo
- **Frontend:** `PropostaPage.jsx` (aba dentro do EventoDetalhe)
- **Lambda:** `getPropostaCliente` — retorna proposta traduzida para o cliente
- **Lambda:** `aceitarProposta` — registra aceite + dispara contrato
- **Lambda:** `solicitarAlteracaoProposta` — registra mensagem + notifica admin
- **API Gateway:** `GET /cliente/eventos/:id/proposta`, `POST /cliente/eventos/:id/proposta/aceitar`, `POST /cliente/eventos/:id/proposta/alterar`
- **EventBridge:** evento `PropostaAceita` → trigger geração de contrato

## Fora de Escopo (NÃO TOCAR)
- Criação/edição da proposta (admin, §6 Captação)
- Geração do contrato (§8, disparado por evento)
- Cálculo de preço/desconto
- Negociação via chat

## Spec Técnica

### Lambda getPropostaCliente
- Auth: JWT cliente
- Valida: proposta pertence ao cliente logado
- Retorna (traduzido):
```json
{
  "id": "prop123",
  "evento_id": "ev123",
  "status": "aguardando_aprovacao",
  "pacote": {
    "nome": "Premium Casamento",
    "itens": ["8h de cobertura", "2 fotógrafos", "Álbum 30x30 20 páginas", "500 fotos editadas"],
    "adicionais": ["Drone", "Making of noiva"]
  },
  "valor_total": 8500.00,
  "condicoes_pagamento": "3x entrada + 5x até o evento",
  "validade": "2026-08-01",
  "mensagem_fotografo": "Será uma honra registrar este momento!",
  "created_at": "2026-07-15T10:00:00Z"
}
```
- NUNCA retorna: margem, custo interno, notas do admin

### Lambda aceitarProposta
- Auth: JWT cliente
- Valida: status = aguardando_aprovacao, dentro da validade
- Ação:
  1. Atualiza status → `aceita`
  2. Registra aceite: data, IP, user-agent (prova)
  3. Emite evento EventBridge `PropostaAceita` { evento_id, proposta_id, cliente_id }
  4. Retorna 200 + confirmação
- Idempotência: se já aceita, retorna 200 sem reprocessar

### Lambda solicitarAlteracaoProposta
- Auth: JWT cliente
- Body: { mensagem: "Gostaria de trocar o álbum por..." }
- Ação: registra mensagem, muda status para `alteracao_solicitada`, notifica admin (SQS)

### Estrutura da Página
```
<PropostaPage>
  <StatusBanner>
    - "Proposta aguardando sua aprovação" (amarelo)
    - "Proposta aceita em 15/07/2026" (verde) — se já aceita
    - "Proposta expirada" (vermelho) — se passou validade
  </StatusBanner>
  <DetalhePacote>
    - Nome do pacote
    - Lista de itens inclusos (checkmarks)
    - Adicionais
  </DetalhePacote>
  <Valores>
    - Valor total (destaque)
    - Condições de pagamento
  </Valores>
  <MensagemFotografo>
    - Texto personalizado (se houver)
  </MensagemFotografo>
  <Acoes>
    - Botão "Aceitar Proposta" (laranja, destaque) → modal confirmação
    - Link "Solicitar alteração" (secundário) → modal com textarea
  </Acoes>
  <ModalConfirmacao>
    - "Ao aceitar, você confirma o pacote e condições acima. Deseja prosseguir?"
    - Botões: Confirmar / Cancelar
  </ModalConfirmacao>
</PropostaPage>
```

## Critérios de Aceite
- Cliente vê todos os itens do pacote sem dados internos
- Aceite exige confirmação (modal) — não é 1-click acidental
- Aceite registra data + IP + user-agent como prova
- Aceite é idempotente (repetir não quebra)
- Proposta expirada → botões desabilitados + banner vermelho
- Proposta já aceita → mostra data do aceite, sem botões de ação
- Alteração solicitada → admin recebe notificação

## Prompt Pronto para o Kiro CLI
```
Implemente a spec ARC-05 (Proposta — Visualizar + Aceitar).

Crie:
1. src/functions/cliente/getPropostaCliente/index.mjs — retorna proposta traduzida (sem dados internos)
2. src/functions/cliente/aceitarProposta/index.mjs — aceite com prova (IP, user-agent) + EventBridge
3. src/functions/cliente/solicitarAlteracaoProposta/index.mjs — registra mensagem + notifica admin
4. Rotas GET/POST no template.yaml: /cliente/eventos/:id/proposta, .../aceitar, .../alterar
5. src/pages/cliente/PropostaPage.jsx — banner status + pacote + valores + botões + modal

Aceite: idempotente, registra IP+user-agent, emite evento PropostaAceita no EventBridge.
Expirada: botões disabled. Já aceita: mostra data, sem ações.
NUNCA retornar: margem, custo, notas admin.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
