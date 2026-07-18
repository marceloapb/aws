# Site Público — Specs Atômicas

Módulo §25 do doc mestre. Substitui o Wix por vitrine pública dentro do sistema.

## Decisões Estruturais
- Dark cinematográfico (#0b0a09) + laranja #EA580C como assinatura
- 5 páginas separadas (não SPA rolável): Início, Portfólio, Novidades, Sobre, Contato
- Dois caminhos de captação: WhatsApp pessoal (fora do sistema) + Orçamento (exige login)
- Multi-tenant desde o início (logo/redes/nome vêm de ConfigSite)
- CMS edita texto/imagem sem deploy; layout fixo
- Portfólio e Novidades reusam §15 e blog (fonte única)

## Entidades
```
PaginaInstitucional  id, tipo(home/sobre/contato), blocos[]
ConfigSite           logo_url, nome, redes[], whatsapp_pessoal, tenant_id
```

## Tabela de Specs

| ID | Tipo | Título | Prioridade | Impacto | Esforço |
|----|------|--------|------------|---------|--------|
| STP-01 | Feature | ConfigSite + Multi-tenant | P0 | Alto | Baixo |
| STP-02 | Feature | Navegação + Layout Shell | P0 | Alto | Médio |
| STP-03 | Feature | Página Home | P1 | Alto | Médio |
| STP-04 | Feature | Página Portfólio (reusa §15) | P1 | Alto | Baixo |
| STP-05 | Feature | Página Novidades (reusa blog) | P1 | Médio | Baixo |
| STP-06 | Feature | Página Sobre | P2 | Médio | Baixo |
| STP-07 | Feature | Página Contato | P1 | Alto | Baixo |
| STP-08 | Feature | Botão Flutuante Orçamento | P1 | Alto | Baixo |
| STP-09 | Feature | CMS de Conteúdo | P2 | Médio | Médio |
| STP-10 | Melhoria | SEO + Meta Tags + Sitemap | P2 | Médio | Médio |
| STP-11 | Melhoria | Migração Domínio + Redirects Wix | P3 | Alto | Alto |

## Ordem de Execução
- **Fase 1 (P0 — fundação):** STP-01 → STP-02
- **Fase 2 (P1 — páginas core):** STP-03 + STP-04 + STP-05 + STP-07 + STP-08 (paralelas, dependem de STP-02)
- **Fase 3 (P2 — polish):** STP-06 → STP-09 → STP-10
- **Fase 4 (P3 — corte final):** STP-11
