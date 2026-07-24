# Módulo Contratos — Specs

## Decisões de Design (§8 + §26)
- Contrato gerado automaticamente ao orçamento ser aceito
- Aceite eletrônico em 3 passos (identidade → leitura → aceite)
- Snapshot no momento da geração (orçamento imutável)
- PDF gerado pós-aceite como prova legal
- Aditivos para renegociação pós-aceite
- Prazo de assinatura parametrizável (default 7 dias)
- Follow-up automático via régua de mensagens

## Fora de Escopo (confirmado)
- Assinatura digital certificada (ICP-Brasil) — backlog
- Integração com DocuSign/ClickSign
- Reconhecimento de firma
- Contratos de terceiros (só contratos MBF)

## Dependências entre specs:

- **Fase 1 (P0):** CT-01 → CT-02 → CT-03
- **Fase 2 (P1):** CT-04 → CT-05 → CT-06
- **Fase 3 (P1):** CT-07 | CT-08 | CT-09 (paralelas)
- **Fase 4 (P2):** CT-10 → CT-11 → CT-12 → CT-13
- **Fase 5 — Assinatura Eletrônica (P0/P1):** SIG-02 → SIG-05 → SIG-07 (OTP flow) | SIG-03 → SIG-04 (Audit + Manifesto) | SIG-01 + SIG-06 (Selo + Integridade, pós CT-06)

## Lista de Specs

### Contratos (CT)

| ID | Arquivo | Prioridade | Título |
|---|---|---|---|
| CT-01 | [CT-01-modelo-dados.md](./CT-01-modelo-dados.md) | P0 | Modelo de Dados (DynamoDB) |
| CT-02 | [CT-02-crud-modelos.md](./CT-02-crud-modelos.md) | P0 | CRUD Modelos de Contrato |
| CT-03 | [CT-03-geracao-automatica.md](./CT-03-geracao-automatica.md) | P0 | Geração Automática |
| CT-04 | [CT-04-visualizacao-cliente.md](./CT-04-visualizacao-cliente.md) | P1 | Visualização Cliente |
| CT-05 | [CT-05-aceite-eletronico.md](./CT-05-aceite-eletronico.md) | P1 | Aceite Eletrônico |
| CT-06 | [CT-06-geracao-pdf.md](./CT-06-geracao-pdf.md) | P1 | Geração PDF |
| CT-07 | [CT-07-expiracao.md](./CT-07-expiracao.md) | P1 | Expiração / Prazo Parametrizável |
| CT-08 | [CT-08-notificacoes.md](./CT-08-notificacoes.md) | P1 | Notificações |
| CT-09 | [CT-09-followup.md](./CT-09-followup.md) | P1 | Follow-up Contrato Não Assinado |
| CT-10 | [CT-10-crud-aditivo.md](./CT-10-crud-aditivo.md) | P2 | CRUD Aditivo |
| CT-11 | [CT-11-aceite-aditivo.md](./CT-11-aceite-aditivo.md) | P2 | Aceite do Aditivo |
| CT-12 | [CT-12-recalculo-financeiro.md](./CT-12-recalculo-financeiro.md) | P2 | Recálculo Financeiro |
| CT-13 | [CT-13-reembolso.md](./CT-13-reembolso.md) | P2 | Pendência de Reembolso |

### Assinatura Eletrônica (SIG)

| ID | Arquivo | Prioridade | Título |
|---|---|---|---|
| SIG-01 | [SIG-01-selo-visual-assinatura.md](./SIG-01-selo-visual-assinatura.md) | P1 | Selo Visual de Assinatura |
| SIG-02 | [SIG-02-fluxo-otp-cliente.md](./SIG-02-fluxo-otp-cliente.md) | P0 | Fluxo OTP Cliente |
| SIG-03 | [SIG-03-audit-log-assinatura.md](./SIG-03-audit-log-assinatura.md) | P0 | Audit Log de Assinatura |
| SIG-04 | [SIG-04-manifesto-pdf.md](./SIG-04-manifesto-pdf.md) | P1 | Manifesto PDF (Prova Técnica) |
| SIG-05 | [SIG-05-fallback-canal-otp.md](./SIG-05-fallback-canal-otp.md) | P1 | Fallback de Canal OTP |
| SIG-06 | [SIG-06-hash-sha256-object-lock.md](./SIG-06-hash-sha256-object-lock.md) | P1 | Hash SHA-256 + Object Lock |
| SIG-07 | [SIG-07-otp-input-mobile-first.md](./SIG-07-otp-input-mobile-first.md) | P1 | OTP Input Mobile-First |
