# SAT-09: Exibição Pública de Depoimentos (Home/Site)

## Metadados
- **ID:** SAT-09
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** SAT-05

## Contexto
Exibir depoimentos aprovados (dupla trava) na página pública do fotógrafo. Seção na home com carrossel de depoimentos + estrelas. API pública (sem auth) para o site consumir.

## Escopo
- `apps/backend/src/handlers/satisfacao/depoimentosPublicos.js` — NOVO
- `apps/frontend/src/pages/public/Depoimentos.jsx` — NOVO
- API: GET /public/depoimentos/:tenantSlug

## Fora de Escopo (NÃO TOCAR)
- Curadoria admin (SAT-05)
- Feedback form (SAT-03)
- Site builder (módulo separado)

## Spec Técnica

### API — GET /public/depoimentos/:tenantSlug
```json
{
  "fotografo": {
    "nome": "Marcelo APB Fotografia",
    "media_geral": 4.8,
    "total_avaliacoes": 42
  },
  "destaques": [
    {
      "nome_exibicao": "Ana C.",
      "tipo_evento": "Casamento",
      "estrelas": 5,
      "comentario": "Fotos incríveis! Superou todas as expectativas.",
      "destaque": true
    }
  ],
  "depoimentos": [
    {
      "nome_exibicao": "Maria L.",
      "tipo_evento": "Ensaio",
      "estrelas": 5,
      "comentario": "Profissional incrível, super atencioso."
    }
  ]
}
```

### Frontend — Seção Depoimentos
- **Header:** "O que dizem nossos clientes" + média ⭐ (4.8/5)
- **Carrossel:** Cards de depoimentos
  - Estrelas (⭐⭐⭐⭐⭐)
  - Comentário (truncado em 150 chars, expandir no click)
  - Nome de exibição
  - Tipo de evento (badge)
- **Destaques:** Primeiro no carrossel, com visual diferenciado
- **Responsive:** 1 card mobile, 3 desktop
- **Cache:** Response cacheada 1h (CloudFront)

### SEO
- Schema.org: Review + AggregateRating
```json
{
  "@type": "LocalBusiness",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 4.8,
    "reviewCount": 42
  }
}
```

### Regras
- API pública (sem auth)
- Só retorna depoimentos com dupla trava (autoriza_publico + marcado_depoimento + ativo)
- Ordenação: destaques primeiro, depois por data
- Cache CloudFront: 1h (invalidar ao mudar curadoria)
- LGPD: nome parcial apenas ("Ana C.", nunca nome completo)

## Critérios de Aceite
- [ ] API pública retorna depoimentos aprovados
- [ ] Dupla trava respeitada
- [ ] Carrossel responsivo
- [ ] Destaques primeiro
- [ ] Média geral exibida
- [ ] Cache 1h
- [ ] Schema.org para SEO
- [ ] Nome parcial (LGPD)

## Prompt Pronto para o Kiro CLI

```
Implemente a spec SAT-09: Exibição Pública de Depoimentos.

1. Crie handlers/satisfacao/depoimentosPublicos.js: GET público.
2. Crie pages/public/Depoimentos.jsx: carrossel.
3. Dupla trava: só retornar se autoriza + marcado + ativo.
4. Destaques primeiro, depois por data.
5. Schema.org AggregateRating.
6. SAM: rota pública + CloudFront cache 1h.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
