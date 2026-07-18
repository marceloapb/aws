# DSH-03: Widget Pendências (Ação Requerida)

## Metadados
- **ID:** DSH-03
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** DSH-01

## Contexto
Bloco no dashboard com itens que precisam de ação do admin. 5 tipos de pendência definidos na doc (§14): orçamentos pendentes, contratos aguardando aceite, pagamentos atrasados, álbuns prontos para revisão, feedbacks não lidos. Cada item é clicável e leva ao módulo.

## Escopo
- `apps/backend/src/handlers/dashboard/pendencias.js` — NOVO
- `apps/frontend/src/components/dashboard/Pendencias.jsx` — NOVO
- API: GET /admin/dashboard/pendencias

## Fora de Escopo (NÃO TOCAR)
- Próximos eventos (DSH-02)
- Resolução das pendências (cada módulo resolve a sua)
- Notificações (DSH-04)

## Spec Técnica

### API — GET /admin/dashboard/pendencias
```json
{
  "total": 7,
  "categorias": [
    {
      "tipo": "orcamento_pendente",
      "label": "Orçamentos Pendentes",
      "icone": "💰",
      "count": 3,
      "cor": "orange",
      "url": "/admin/orcamentos?status=pendente",
      "items": [
        { "id": "orc_001", "titulo": "Casamento Ana - R$ 5.500", "dias_pendente": 3 },
        { "id": "orc_002", "titulo": "Ensaio Maria - R$ 800", "dias_pendente": 1 },
        { "id": "orc_003", "titulo": "Aniversário João - R$ 1.200", "dias_pendente": 5 }
      ]
    },
    {
      "tipo": "contrato_aguardando",
      "label": "Contratos Aguardando Aceite",
      "icone": "📋",
      "count": 1,
      "cor": "blue",
      "url": "/admin/contratos?status=aguardando",
      "items": [
        { "id": "ct_001", "titulo": "Contrato Casamento Ana", "dias_pendente": 2 }
      ]
    },
    {
      "tipo": "pagamento_atrasado",
      "label": "Pagamentos Atrasados",
      "icone": "💳",
      "count": 2,
      "cor": "red",
      "url": "/admin/financeiro?status=atrasado",
      "items": [
        { "id": "pag_001", "titulo": "Parcela 2/3 - Ana (venceu há 3 dias)", "dias_atrasado": 3 },
        { "id": "pag_002", "titulo": "Parcela 1/1 - João (venceu há 1 dia)", "dias_atrasado": 1 }
      ]
    },
    {
      "tipo": "album_revisao",
      "label": "Álbuns para Revisão",
      "icone": "📸",
      "count": 1,
      "cor": "purple",
      "url": "/admin/albuns?status=revisao",
      "items": [
        { "id": "alb_001", "titulo": "Álbum Ensaio Maria", "dias_pendente": 7 }
      ]
    },
    {
      "tipo": "feedback_nao_lido",
      "label": "Feedbacks Não Lidos",
      "icone": "⭐",
      "count": 0,
      "cor": "green",
      "url": "/admin/feedbacks",
      "items": []
    }
  ]
}
```

### Backend — Agregação Cross-Domínio
```js
async function getPendencias(tenantId) {
  // Executar queries em paralelo (Promise.all)
  const [orcamentos, contratos, pagamentos, albuns, feedbacks] = await Promise.all([
    getOrcamentosPendentes(tenantId),
    getContratosAguardando(tenantId),
    getPagamentosAtrasados(tenantId),
    getAlbunsRevisao(tenantId),
    getFeedbacksNaoLidos(tenantId)
  ])
  
  const categorias = [
    {
      tipo: 'orcamento_pendente',
      label: 'Orçamentos Pendentes',
      icone: '💰',
      cor: 'orange',
      url: '/admin/orcamentos?status=pendente',
      count: orcamentos.length,
      items: orcamentos.slice(0, 5)
    },
    {
      tipo: 'contrato_aguardando',
      label: 'Contratos Aguardando Aceite',
      icone: '📋',
      cor: 'blue',
      url: '/admin/contratos?status=aguardando',
      count: contratos.length,
      items: contratos.slice(0, 5)
    },
    {
      tipo: 'pagamento_atrasado',
      label: 'Pagamentos Atrasados',
      icone: '💳',
      cor: 'red',
      url: '/admin/financeiro?status=atrasado',
      count: pagamentos.length,
      items: pagamentos.slice(0, 5)
    },
    {
      tipo: 'album_revisao',
      label: 'Álbuns para Revisão',
      icone: '📸',
      cor: 'purple',
      url: '/admin/albuns?status=revisao',
      count: albuns.length,
      items: albuns.slice(0, 5)
    },
    {
      tipo: 'feedback_nao_lido',
      label: 'Feedbacks Não Lidos',
      icone: '⭐',
      cor: 'green',
      url: '/admin/feedbacks',
      count: feedbacks.length,
      items: feedbacks.slice(0, 5)
    }
  ]
  
  return {
    total: categorias.reduce((sum, c) => sum + c.count, 0),
    categorias: categorias.filter(c => c.count > 0)
  }
}
```

### Frontend — Pendencias.jsx
```jsx
function Pendencias({ dados }) {
  if (dados.total === 0) {
    return (
      <div className="widget pendencias">
        <div className="widget-header"><h2>✅ Tudo em dia!</h2></div>
        <p>Nenhuma pendência no momento.</p>
      </div>
    )
  }
  
  return (
    <div className="widget pendencias">
      <div className="widget-header">
        <h2>⚡ Pendências ({dados.total})</h2>
      </div>
      <div className="widget-body">
        {dados.categorias.map(cat => (
          <div key={cat.tipo} className={`pendencia-grupo pendencia-${cat.cor}`}>
            <div className="pendencia-header">
              <span>{cat.icone} {cat.label}</span>
              <span className="pendencia-badge">{cat.count}</span>
            </div>
            <ul className="pendencia-items">
              {cat.items.map(item => (
                <li key={item.id}>
                  <Link to={`${cat.url}&id=${item.id}`}>{item.titulo}</Link>
                </li>
              ))}
            </ul>
            <Link to={cat.url} className="pendencia-ver-todos">
              Ver todos →
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Regras
- Queries em paralelo (performance)
- Mostrar apenas categorias com count > 0
- Máximo 5 items por categoria (link "ver todos")
- Se total = 0: mensagem positiva ("Tudo em dia!")
- Ordenar por urgência (vermelho > laranja > azul > purple > green)
- Cada item é clicável → leva ao módulo filtrado
- Cache: 60s (dados mudam com frequência)

## Critérios de Aceite
- [ ] 5 categorias de pendências
- [ ] Queries paralelas
- [ ] Categorias com count=0 ocultadas
- [ ] Max 5 items por categoria
- [ ] "Tudo em dia" se total=0
- [ ] Links funcionam (deep link pro módulo)
- [ ] Cores por categoria

## Prompt Pronto para o Kiro CLI

```
Implemente a spec DSH-03: Widget Pendências.

1. Crie handlers/dashboard/pendencias.js: GET /admin/dashboard/pendencias.
2. Crie components/dashboard/Pendencias.jsx.
3. 5 queries paralelas (Promise.all).
4. Filtrar categorias count > 0.
5. Max 5 items por categoria + link "ver todos".
6. Se total=0: "Tudo em dia!".
7. SAM: rota GET.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
