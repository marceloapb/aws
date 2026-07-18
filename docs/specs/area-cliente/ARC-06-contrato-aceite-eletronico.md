# ARC-06 — Contrato (Visualizar + Aceite Eletrônico)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | ARC-06 |
| **Tipo** | Feature |
| **Prioridade** | P1 |
| **Impacto** | Alto — formaliza a relação, validade jurídica |
| **Esforço** | Médio |

## Contexto
Após aceite da proposta, o sistema gera contrato (§8). O cliente visualiza o contrato na área logada e faz aceite eletrônico (checkbox "Li e concordo" + botão assinar). Registra: data, IP, hash do documento, user-agent. Contrato assinado → status progride.

## Escopo
- **Frontend:** `ContratoPage.jsx` (aba no EventoDetalhe)
- **Lambda:** `getContratoCliente` — retorna contrato renderizado (HTML) para o cliente
- **Lambda:** `assinarContrato` — registra assinatura eletrônica
- **API Gateway:** `GET /cliente/eventos/:id/contrato`, `POST /cliente/eventos/:id/contrato/assinar`
- **DynamoDB:** registro de assinatura com hash SHA-256 do conteúdo

## Fora de Escopo (NÃO TOCAR)
- Geração do contrato (§8 — template + merge de dados)
- Edição de cláusulas (admin)
- Assinatura digital com certificado (ICP-Brasil) — aqui é aceite eletrônico simples
- PDF download (futuro, pode ser adicionado depois)

## Spec Técnica

### Lambda getContratoCliente
- Auth: JWT cliente
- Valida: contrato pertence ao evento do cliente
- Retorna:
```json
{
  "id": "ctr123",
  "evento_id": "ev123",
  "status": "pendente_assinatura",
  "conteudo_html": "<h1>Contrato de Prestação de Serviços...</h1>...",
  "hash_conteudo": "sha256:abc123...",
  "gerado_em": "2026-07-16T10:00:00Z",
  "assinado_em": null
}
```
- Se já assinado: inclui dados da assinatura (data, mas não IP — privacidade)

### Lambda assinarContrato
- Auth: JWT cliente
- Body: { aceite: true, hash_verificado: "sha256:abc123..." }
- Valida:
  1. Status = pendente_assinatura
  2. Hash do body = hash do contrato atual (garante que leu a versão correta)
- Ação:
  1. Registra assinatura: data, IP, user-agent, hash, cognito_sub
  2. Atualiza status → `assinado`
  3. Emite evento EventBridge `ContratoAssinado`
- Idempotência: já assinado → 200 sem reprocessar

### Estrutura da Página
```
<ContratoPage>
  <StatusBanner>
    - "Contrato aguardando sua assinatura" (amarelo)
    - "Contrato assinado em 16/07/2026" (verde)
  </StatusBanner>
  <ConteudoContrato>
    - Renderiza HTML do contrato em container scrollável
    - Fonte legível, fundo claro (exceção ao dark theme para leitura)
  </ConteudoContrato>
  <AceiteSection> (só se pendente)
    - Checkbox: "Li e concordo com todos os termos acima"
    - Botão "Assinar Contrato" (disabled até checkbox marcado)
  </AceiteSection>
  <ComprovanteBanner> (se já assinado)
    - "Assinado eletronicamente em {data} — ID: {hash[:8]}"
  </ComprovanteBanner>
</ContratoPage>
```

## Critérios de Aceite
- Contrato exibido integralmente antes da assinatura
- Checkbox obrigatório antes de habilitar botão
- Hash do conteúdo validado no backend (cliente não assina versão diferente)
- Assinatura registra IP + user-agent + data + hash
- Assinatura é idempotente
- Contrato já assinado → mostra comprovante, sem ações
- Contrato inexistente → mensagem "Contrato será gerado após aceite da proposta"

## Prompt Pronto para o Kiro CLI
```
Implemente a spec ARC-06 (Contrato — Visualizar + Aceite Eletrônico).

Crie:
1. src/functions/cliente/getContratoCliente/index.mjs — retorna contrato HTML + hash
2. src/functions/cliente/assinarContrato/index.mjs — valida hash + registra assinatura + EventBridge
3. Rotas GET e POST /cliente/eventos/:id/contrato[/assinar] no template.yaml
4. src/pages/cliente/ContratoPage.jsx — exibe contrato + checkbox + botão assinar

Hash SHA-256 do conteúdo validado no backend. Assinatura: IP + user-agent + data + hash + sub.
Idempotente. Emite evento ContratoAssinado.
Container de leitura: fundo claro (exceção dark theme).

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
