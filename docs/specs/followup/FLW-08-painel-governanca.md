# FLW-08: Painel de Governança (Ciclos Ativos, Progresso, Cancelar)

## Metadados
- **ID:** FLW-08
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** FLW-02, FLW-03

## Contexto
Tela que mostra ao admin todos os ciclos de follow-up em andamento: quais clientes estão sendo cobrados, em qual tentativa estão, qual canal foi usado, e permite cancelar/pausar ciclos individualmente.

## Escopo
- `apps/backend/src/handlers/followup/governanca.js` — NOVO
- `apps/frontend/src/pages/admin/FollowupGovernanca.jsx` — NOVO
- API: GET /admin/followup/governanca

## Fora de Escopo (NÃO TOCAR)
- Config de réguas (FLW-09)
- Motor (FLW-03)
- Log de disparos (FLW-12)

## Spec Técnica

### API — GET /admin/followup/governanca
Query params: `status` (ativo|resolvido|esgotado|cancelado), `dominio`, `limit`, `cursor`

```json
{
  "resumo": {
    "ativos": 12,
    "resolvidos_mes": 8,
    "esgotados_mes": 3,
    "cancelados_mes": 1,
    "taxa_resolucao": 66.7
  },
  "gatilhos": [
    {
      "id": "gat_001",
      "cliente_nome": "Ana Carolina",
      "dominio": "orcamento",
      "recurso_label": "Casamento - R$ 5.500",
      "status": "ativo",
      "tentativa_atual": 2,
      "max_tentativas": 3,
      "ultimo_canal": "email",
      "inicio_inercia": "2026-07-10T10:00:00Z",
      "dias_inercia": 8,
      "proximo_disparo": "2026-07-20T09:00:00Z",
      "progresso": 66
    }
  ],
  "total": 12,
  "cursor": "next_token"
}
```

### Frontend — FollowupGovernanca.jsx
```jsx
function FollowupGovernanca() {
  return (
    <div className="followup-governanca">
      {/* Resumo */}
      <div className="governanca-resumo">
        <Card titulo="Ativos" valor={resumo.ativos} cor="blue" />
        <Card titulo="Resolvidos (mês)" valor={resumo.resolvidos_mes} cor="green" />
        <Card titulo="Esgotados" valor={resumo.esgotados_mes} cor="orange" />
        <Card titulo="Taxa Resolução" valor={`${resumo.taxa_resolucao}%`} cor="green" />
      </div>
      
      {/* Filtros */}
      <div className="governanca-filtros">
        <Select options={['Todos', 'ativo', 'resolvido', 'esgotado', 'cancelado']} />
        <Select options={['Todos', 'orcamento', 'contrato', 'pagamento', 'album', 'feedback']} />
      </div>
      
      {/* Tabela */}
      <table className="governanca-tabela">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Domínio</th>
            <th>Recurso</th>
            <th>Progresso</th>
            <th>Dias</th>
            <th>Próximo</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {gatilhos.map(g => (
            <tr key={g.id}>
              <td>{g.cliente_nome}</td>
              <td><Badge>{g.dominio}</Badge></td>
              <td>{g.recurso_label}</td>
              <td><ProgressBar value={g.progresso} /></td>
              <td>{g.dias_inercia}d</td>
              <td>{formatDate(g.proximo_disparo)}</td>
              <td>
                <button onClick={() => cancelar(g.id)}>❌</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### Regras
- Filtro por status e domínio
- Barra de progresso: tentativa_atual / max_tentativas
- Cancelar: muda status para 'cancelado'
- Taxa de resolução: resolvidos / (resolvidos + esgotados) * 100
- Paginação cursor-based
- Ordenar por dias_inercia DESC (mais antigo primeiro)

## Critérios de Aceite
- [ ] Resumo com 4 cards
- [ ] Filtro por status e domínio
- [ ] Tabela com progresso visual
- [ ] Cancelar gatilho funciona
- [ ] Paginação
- [ ] Taxa de resolução calculada

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FLW-08: Painel de Governança.

1. Crie handlers/followup/governanca.js: GET com filtros.
2. Crie pages/admin/FollowupGovernanca.jsx.
3. 4 cards de resumo (ativos, resolvidos, esgotados, taxa).
4. Tabela com progresso, dias, próximo disparo.
5. Botão cancelar por gatilho.
6. Filtros: status + domínio.
7. SAM: rota GET.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
