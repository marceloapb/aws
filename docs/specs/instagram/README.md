# Módulo Instagram — Specs

## Decisões de Design (§6)
- Graph API v21.0 (Instagram Business)
- OAuth + long-lived token (60 dias) com refresh automático
- Publicação via Container → Publish (fluxo assíncrono da Meta)
- URLs assinadas S3 para envio de mídia
- Stories com IA: LLM agnóstico (Claude/GPT) + gerador de arte agnóstico
- Carrossel: max 10 imagens por post
- Insights coletados via cron (1h) para economia de API calls

## Fora de Escopo (confirmado)
- Reels (depende de vídeo)
- DMs (usar WhatsApp)
- Instagram Shopping
- Ads (Gerenciador da Meta)
- Comentários (roadmap futuro)

## Dependências entre specs:

- **Fase 1 (P0):** IG-01 → IG-02 → IG-10 → IG-03
- **Fase 2 (P1):** IG-04, IG-05, IG-18 | IG-06, IG-07 | IG-08, IG-09
- **Fase 3 (P2):** IG-13 → IG-14 → IG-15 → IG-11 → IG-12 → IG-16
- **Fase 4 (P3):** IG-17

## Lista de Specs

| ID | Arquivo | Prioridade | Título |
|---|---|---|---|
| IG-01 | [IG-01-conexao-oauth.md](./IG-01-conexao-oauth.md) | P0 | Conexão OAuth + Token |
| IG-02 | [IG-02-modelo-dados.md](./IG-02-modelo-dados.md) | P0 | Modelo de Dados Instagram |
| IG-03 | [IG-03-publicar-post.md](./IG-03-publicar-post.md) | P0 | Publicar Post Único (Feed) |
| IG-04 | [IG-04-publicar-carrossel.md](./IG-04-publicar-carrossel.md) | P1 | Publicar Carrossel |
| IG-05 | [IG-05-agendamento.md](./IG-05-agendamento.md) | P1 | Agendamento de Posts |
| IG-06 | [IG-06-central-publicacoes.md](./IG-06-central-publicacoes.md) | P1 | Central de Publicações |
| IG-07 | [IG-07-retry-fallback.md](./IG-07-retry-fallback.md) | P1 | Retry + Fallback |
| IG-08 | [IG-08-insights-conta.md](./IG-08-insights-conta.md) | P1 | Insights da Conta |
| IG-09 | [IG-09-insights-post.md](./IG-09-insights-post.md) | P1 | Insights por Post |
| IG-10 | [IG-10-url-assinada.md](./IG-10-url-assinada.md) | P0 | URL Assinada Temporária |
| IG-11 | [IG-11-story-template.md](./IG-11-story-template.md) | P2 | Stories com IA — Template |
| IG-12 | [IG-12-story-ia-livre.md](./IG-12-story-ia-livre.md) | P2 | Stories com IA — Modo Livre |
| IG-13 | [IG-13-adapter-llm.md](./IG-13-adapter-llm.md) | P2 | Adapter LLM Agnóstico |
| IG-14 | [IG-14-adapter-arte.md](./IG-14-adapter-arte.md) | P2 | Adapter Gerador de Arte |
| IG-15 | [IG-15-crud-templates-story.md](./IG-15-crud-templates-story.md) | P2 | CRUD Templates de Story |
| IG-16 | [IG-16-metricas-story.md](./IG-16-metricas-story.md) | P2 | Métricas de Story |
| IG-17 | [IG-17-dashboard-custos-ia.md](./IG-17-dashboard-custos-ia.md) | P3 | Dashboard Custos IA |
| IG-18 | [IG-18-refresh-token.md](./IG-18-refresh-token.md) | P1 | Refresh Token Automático |
