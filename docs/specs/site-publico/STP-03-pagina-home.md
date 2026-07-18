# STP-03 — Página Home

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | STP-03 |
| **Tipo** | Feature |
| **Prioridade** | P1 |
| **Impacto** | Alto — primeira impressão, ponto de entrada principal |
| **Esforço** | Médio |

## Contexto
A Home é a landing page do site. Hero cinematográfico com imagem de impacto, manifesto/frase de efeito, depoimentos aprovados (double-gate do Feedback §12), e CTA. SEM seção de portfólio embutida (já existe no menu).

## Escopo
- **Frontend:** `HomePage.jsx` dentro do SiteLayout
- **Seções:** Hero (imagem + título + frase) → Manifesto (texto curto) → Depoimentos (carrossel) → CTA final
- **Lambda:** `getDepoimentosPublicos` — retorna feedbacks com `autoriza_publico=true` E `marcado_depoimento=true`
- **API Gateway:** `GET /public/depoimentos`
- **DynamoDB:** query na tabela Feedback filtrando double-gate

## Fora de Escopo (NÃO TOCAR)
- Portfólio embutido na home (decisão: não tem)
- Formulário de contato na home
- Módulo Feedback (§12) — só consome dados
- CMS de edição da home (STP-09)

## Spec Técnica

### Lambda getDepoimentosPublicos
- Query: GSI onde `autoriza_publico = true` AND `marcado_depoimento = true`
- Retorna: array de { nome_cliente (primeiro nome), estrelas, comentario, data }
- Limit: 10 (mais recentes)
- Sem autenticação (público)

### Estrutura da Página
```
<Hero>
  - Imagem de fundo (vem de PaginaInstitucional.blocos[tipo=hero])
  - Título overlay (nome do estúdio)
  - Frase de efeito (editável via CMS depois)
</Hero>
<Manifesto>
  - Texto curto (2-3 parágrafos) sobre a filosofia do fotógrafo
</Manifesto>
<Depoimentos>
  - Carrossel horizontal com estrelas + texto + nome
  - Se nenhum depoimento aprovado: seção não renderiza
</Depoimentos>
<CTAFinal>
  - Frase de chamada + botão "Solicitar Orçamento" → login/cadastro
</CTAFinal>
```

### DynamoDB Access Pattern
```
GSI: GSI-DEPOIMENTOS
  PK: TENANT#1
  SK: FEEDBACK#DEPOIMENTO#<created_at>
  Condition: autoriza_publico = true AND marcado_depoimento = true
```

## Critérios de Aceite
- Hero renderiza com imagem + título + frase
- Depoimentos só aparecem se existir ao menos 1 com double-gate true
- Zero depoimentos → seção oculta (não mostra "nenhum depoimento")
- CTA direciona para fluxo de cadastro/login → orçamento
- Responsivo: hero adapta, depoimentos empilham em mobile

## Prompt Pronto para o Kiro CLI
```
Implemente a spec STP-03 (Página Home do site público).

Crie:
1. src/pages/public/HomePage.jsx — Hero + Manifesto + Depoimentos + CTA
2. src/functions/site/getDepoimentosPublicos/index.mjs — query Feedback double-gate
3. Rota GET /public/depoimentos no template.yaml

Hero: imagem de fundo full-width, título + frase overlay com gradiente.
Depoimentos: carrossel, estrelas, texto, nome (primeiro nome só). Seção oculta se array vazio.
CTA: botão laranja #EA580C → rota de login/orçamento.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
