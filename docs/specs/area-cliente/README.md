# Área do Cliente — Specs Atômicas

Portal logado do cliente. Eixo = evento (orçamento). Visão: Painel → Meus Eventos → Evento (abas).

## Decisões Estruturais
- Auth via Cognito User Pool (grupo `cliente`, separado do admin)
- HTTP API + JWT authorizer (zero custo ocioso)
- Tradução interno→cliente na Lambda (nunca expõe campos internos: trava 70%, régua, status admin)
- Single-table DynamoDB com GSI-CLIENTE (PK=CLIENTE#id, SK por tipo)
- Presigned URLs para foto de perfil e álbum (S3 privado)
- Eixo de navegação = evento (1 orçamento = 1 evento)

## Tabela de Specs

| ID | Tipo | Título | Prioridade | Impacto | Esforço |
|----|------|--------|------------|---------|--------|
| ARC-01 | Feature | Autenticação Cliente (Cognito) | P0 | Alto | Médio |
| ARC-02 | Feature | Shell / Navegação / Middleware Auth | P0 | Alto | Baixo |
| ARC-03 | Feature | Painel (Dashboard do Cliente) | P1 | Alto | Médio |
| ARC-04 | Feature | Meus Eventos (Listagem) | P1 | Alto | Baixo |
| ARC-05 | Feature | Proposta (Visualizar + Aceitar) | P0 | Crítico | Alto |
| ARC-06 | Feature | Contrato (Visualizar + Aceite Eletrônico) | P1 | Alto | Médio |
| ARC-07 | Feature | Pagamentos (Cobranças + Link) | P1 | Alto | Médio |
| ARC-08 | Feature | Álbum (Acesso Vitrine + Download) | P2 | Médio | Médio |
| ARC-09 | Feature | Feedback (Avaliação + Autorização) | P2 | Médio | Baixo |
| ARC-10 | Feature | Meus Dados (Perfil + Foto) | P2 | Médio | Baixo |

## Ordem de Execução
- **Fase 1 (P0 — fundação):** ARC-01 → ARC-02 → ARC-05
- **Fase 2 (P1 — core):** ARC-04 + ARC-03 (paralelas) → ARC-06 → ARC-07
- **Fase 3 (P2 — complemento):** ARC-08 + ARC-09 + ARC-10 (paralelas)
