# Área do Cliente — Specs & Ordem de Execução

## Estrutura

```
docs/specs/area-cliente/
├── README.md                              ← este arquivo
├── GSI-00-global-secondary-indexes.md     ← FUNDAÇÃO (executar primeiro)
├── ARC-01-autenticacao-cliente.md
├── ARC-02-shell-navegacao-auth.md
├── ARC-03-painel-dashboard.md
├── ARC-04-meus-eventos.md
├── ARC-05-proposta-aceite.md
├── ARC-06-contrato-aceite-eletronico.md
├── ARC-07-pagamentos.md
├── ARC-08-album-vitrine-download.md
├── ARC-09-feedback-avaliacao.md
└── ARC-10-meus-dados-perfil.md
```

---

## Ordem de Execução

### Fase 0 — Fundação (bloqueante)

| # | Spec | Título | Depende de | Esforço |
|---|------|--------|------------|--------|
| 0 | GSI-00 | Global Secondary Indexes | — | Baixo (IaC only) |

> ⚠️ Sem os GSIs, nenhuma spec abaixo consegue fazer queries eficientes.

---

### Fase 1 — Backend Admin (pré-requisito da Área do Cliente)

Estas specs estão em `docs/specs/` (raiz) e subpastas `contratos/`, `orcamentos/`, `financeiro/`:

| # | Spec | Título | Depende de | Esforço |
|---|------|--------|------------|--------|
| 1 | CLI-04 | Contratos CRUD + aceite | GSI-00 | Médio (5 handlers) |
| 2 | CLI-05 | Orçamentos CRUD + conversão | GSI-00 | Médio (5 handlers) |
| 3 | CLI-06 | Financeiro / Pagamentos | GSI-00, CLI-04 | Médio-Alto (6 handlers) |
| 4 | CLI-15 | Eventos / Agenda | GSI-00 | Médio (4 handlers) |
| 5 | CLI-14 | Seleção de Fotos (vitrine) | GSI-00 | Médio (3 handlers) |

---

### Fase 2 — Área do Cliente (frontend + backend público)

Ordem de execução das specs ARC:

| # | Spec | Título | Depende de | Esforço |
|---|------|--------|------------|--------|
| 1 | ARC-01 | Autenticação do Cliente | GSI-00 | Médio |
| 2 | ARC-02 | Shell / Navegação + Auth | ARC-01 | Médio |
| 3 | ARC-03 | Painel Dashboard | ARC-02, CLI-04/05/06 | Baixo |
| 4 | ARC-04 | Meus Eventos | ARC-02, CLI-15 | Baixo |
| 5 | ARC-05 | Proposta + Aceite | ARC-02, CLI-05 | Médio |
| 6 | ARC-06 | Contrato + Aceite Eletrônico | ARC-02, CLI-04 | Médio |
| 7 | ARC-07 | Pagamentos | ARC-02, CLI-06 | Médio |
| 8 | ARC-08 | Álbum Vitrine + Download | ARC-02, CLI-14 | Médio |
| 9 | ARC-09 | Feedback / Avaliação | ARC-02 | Baixo |
| 10 | ARC-10 | Meus Dados / Perfil | ARC-02 | Baixo |

---

## Diagrama de Dependências

```
                    ┌─────────┐
                    │ GSI-00  │
                    └────┬────┘
          ┌──────────────┼──────────────┐
          │              │              │
     ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
     │ CLI-04  │   │ CLI-05  │   │ CLI-15  │
     │Contratos│   │Orçament.│   │ Eventos │
     └────┬────┘   └────┬────┘   └────┬────┘
          │              │              │
     ┌────▼────┐         │              │
     │ CLI-06  │         │              │
     │Financ.  │         │              │
     └────┬────┘         │              │
          │              │              │
     ┌────▼──────────────▼──────────────▼────┐
     │              ARC-01                    │
     │        Autenticação Cliente            │
     └──────────────────┬────────────────────┘
                        │
     ┌──────────────────▼────────────────────┐
     │              ARC-02                    │
     │         Shell + Navegação              │
     └───┬────┬────┬────┬────┬────┬────┬─────┘
         │    │    │    │    │    │    │
       ARC  ARC  ARC  ARC  ARC  ARC  ARC
       -03  -04  -05  -06  -07  -08  -09/10
```

---

## Regras

1. **Nunca pular fase.** A Fase 2 (ARC) depende da Fase 1 (CLI) que depende da Fase 0 (GSI).
2. **Dentro da mesma fase**, specs sem dependência entre si podem ser executadas em paralelo.
3. **ARC-01 e ARC-02 são sequenciais** — o shell depende da autenticação.
4. **ARC-03 a ARC-10 são paralelos** entre si após ARC-02, desde que o backend respectivo (CLI-xx) exista.

---

## Status

| Spec | Status |
|------|--------|
| GSI-00 | 📋 Spec publicada — aguardando execução |
| CLI-04 | 📋 Spec publicada (SPEC-19) — aguardando execução |
| CLI-05 | 📋 Spec publicada (SPEC-17) — aguardando execução |
| CLI-06 | 📋 Spec publicada (SPEC-20) — aguardando execução |
| CLI-14 | 📋 Spec publicada (SPEC-21) — aguardando execução |
| CLI-15 | 📋 Spec publicada (SPEC-18) — aguardando execução |
| ARC-01 | 📋 Spec publicada — aguardando execução |
| ARC-02 | 📋 Spec publicada — aguardando execução |
| ARC-03 | 📋 Spec publicada — aguardando execução |
| ARC-04 | 📋 Spec publicada — aguardando execução |
| ARC-05 | 📋 Spec publicada — aguardando execução |
| ARC-06 | 📋 Spec publicada — aguardando execução |
| ARC-07 | 📋 Spec publicada — aguardando execução |
| ARC-08 | 📋 Spec publicada — aguardando execução |
| ARC-09 | 📋 Spec publicada — aguardando execução |
| ARC-10 | 📋 Spec publicada — aguardando execução |
