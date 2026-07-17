# CLI-09: Origem do Lead (Como Conheceu)

## Metadados
- **ID:** CLI-09
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** CLI-01

## Contexto
Saber de onde vêm os clientes é essencial para investir em marketing. O campo "como conheceu" já está na CLI-01, mas aqui a spec detalha: relatório de origens, gráfico de conversão por canal, e preenchimento automático quando o lead vem pelo site/Instagram.

## Escopo
- `apps/frontend/src/pages/admin/Clientes.jsx` — coluna origem na tabela
- `apps/frontend/src/pages/admin/ClienteDetalhe.jsx` — badge origem
- Backend: auto-fill origem quando lead vem de formulário
- Relatório: contagem por origem

## Fora de Escopo (NÃO TOCAR)
- ClienteForm.jsx (CLI-01 já adiciona o campo)
- Dashboard principal
- Módulo Instagram

## Spec Técnica

### Origens Pré-definidas
| Origem | Ícone | Auto-detect |
|---|---|---|
| instagram | 📸 | Formulário via link Instagram |
| indicacao | 🤝 | Manual |
| google | 🔍 | UTM param |
| site | 🌐 | Formulário do site |
| whatsapp | 💬 | Manual |
| outro | ❓ | Manual |

### Auto-detect
- Se lead criado via formulário do site: origem = 'site'
- Se tem utm_source=instagram: origem = 'instagram'
- Se tem utm_source=google: origem = 'google'
- Senão: admin preenche manualmente

### Frontend — Clientes.jsx
- Coluna "Origem" com ícone + label
- Filtro por origem (já coberto em CLI-05)

### Relatório (no Dashboard futuro)
- Contagem por origem (pie chart)
- Conversão por origem: leads → clientes (%)

## Critérios de Aceite
- [ ] Coluna origem visível na listagem
- [ ] Badge com ícone no detalhe
- [ ] Auto-detect funciona para site, instagram, google
- [ ] Admin pode alterar origem manualmente
- [ ] Relatório de contagem por origem acessível

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CLI-09: Origem do Lead.

1. Em Clientes.jsx: coluna "Origem" com ícone.
2. Em ClienteDetalhe.jsx: badge de origem.
3. Backend: auto-fill origem baseado em utm_source / formulário.
4. API getClientesStats: incluir contagem por origem.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
