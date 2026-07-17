# Specs de Configurações (CFG-01 a CFG-12)

## Visão Geral
Especificações técnicas para as telas de Configurações do sistema MBF.

## Tabela Consolidada

| ID | Tipo | Título | Prioridade | Impacto | Esforço |
|---|---|---|---|---|---|
| CFG-01 | Readequação | Rota dedicada /configuracoes/gateway | P1 | Alto | Baixo |
| CFG-02 | Feature | Grade de provedores com toggle + selo | P1 | Alto | Médio |
| CFG-03 | Feature | Modal de credenciais dinâmico por provedor | P1 | Alto | Médio |
| CFG-04 | Feature | Matriz de capacidades visual por provedor | P2 | Médio | Baixo |
| CFG-05 | Melhoria | WhatsApp — campos faltantes | P1 | Alto | Baixo |
| CFG-06 | Melhoria | Google Calendar — Calendar ID + OAuth | P2 | Médio | Baixo |
| CFG-07 | Feature | Webhook URL + log de eventos | P2 | Médio | Médio |
| CFG-08 | Melhoria | Instagram — permissões, App Review | P3 | Baixo | Baixo |
| CFG-09 | Feature | Dados da Empresa — formulário completo | P1 | Alto | Médio |
| CFG-10 | Feature | Prazos e Políticas — parametrização | P1 | Alto | Baixo |
| CFG-11 | Feature | Condições de Pagamento | P1 | Alto | Médio |
| CFG-12 | Feature | Backup e Sistema — LGPD + manutenção | P2 | Médio | Médio |

## Ordem de Execução Recomendada

### Fase 1 — Fundação (paralelo)
- CFG-01 (Rota Gateway)
- CFG-09 (Dados da Empresa)
- CFG-10 (Prazos e Políticas)
- CFG-05 (WhatsApp campos)

### Fase 2 — Gateway completo (sequencial)
- CFG-02 (Grade provedores) → depende CFG-01
- CFG-03 (Modal credenciais) → depende CFG-02
- CFG-04 (Matriz capacidades) → depende CFG-02
- CFG-07 (Webhook log) → depende CFG-01

### Fase 3 — Complementos (paralelo)
- CFG-11 (Condições pagamento) → depende CFG-10
- CFG-06 (Google Calendar)
- CFG-08 (Instagram)
- CFG-12 (Backup e Sistema)

## Referência
- `SPEC-15-configuracoes-admin.md` (backend)
- `SPEC-37-configuracoes-frontend-completo.md` (frontend)
- `SPEC-27-gateway-pagamento-adapter.md` (adapter pattern)
- `UX-02-configuracoes-hierarquia.md`
