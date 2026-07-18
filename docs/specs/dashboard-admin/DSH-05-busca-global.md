# DSH-05: Busca Global (Topbar)

## Metadados
- **ID:** DSH-05
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** DSH-01

## Contexto
Campo de busca na topbar que pesquisa em todos os módulos: clientes, orçamentos, contratos, eventos, álbuns. Resultado agrupado por tipo com link direto. Debounce de 300ms.

## Escopo
- `apps/backend/src/handlers/busca/global.js` — NOVO
- `apps/frontend/src/components/Topbar/BuscaGlobal.jsx` — NOVO
- API: GET /admin/busca?q=termo

## Fora de Escopo (NÃO TOCAR)
- Elasticsearch/OpenSearch (overkill para MVP)
- Busca full-text avançada (futuro)
- Filtros avançados

## Spec Técnica

### API — GET /admin/busca?q=termo
Query params: `q` (mínimo 3 chars), `limit` (default 5 por tipo)

```json
{
  "query": "ana",
  "resultados": {
    "clientes": [
      { "id": "cli_001", "titulo": "Ana Carolina Silva", "subtitulo": "ana@email.com", "url": "/admin/clientes/cli_001" }
    ],
    "orcamentos": [
      { "id": "orc_001", "titulo": "Casamento Ana & Pedro", "subtitulo": "R$ 5.500 · Pendente", "url": "/admin/orcamentos/orc_001" }
    ],
    "contratos": [],
    "eventos": [
      { "id": "evt_001", "titulo": "Casamento Ana & Pedro", "subtitulo": "25/07/2026 · Villa Garden", "url": "/admin/agenda/evt_001" }
    ],
    "albuns": []
  },
  "total": 3
}
```

### Backend — Estratégia de Busca
```js
async function buscaGlobal(tenantId, query, limit = 5) {
  const termo = query.toLowerCase().trim()
  if (termo.length < 3) return { resultados: {}, total: 0 }
  
  // Buscar em paralelo em cada domínio
  const [clientes, orcamentos, contratos, eventos, albuns] = await Promise.all([
    buscarClientes(tenantId, termo, limit),
    buscarOrcamentos(tenantId, termo, limit),
    buscarContratos(tenantId, termo, limit),
    buscarEventos(tenantId, termo, limit),
    buscarAlbuns(tenantId, termo, limit)
  ])
  
  const resultados = { clientes, orcamentos, contratos, eventos, albuns }
  const total = Object.values(resultados).reduce((sum, arr) => sum + arr.length, 0)
  
  return { query, resultados, total }
}

// Busca por contains no nome/título (DynamoDB filter)
async function buscarClientes(tenantId, termo, limit) {
  const result = await dynamo.query({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    FilterExpression: 'contains(nome_lower, :termo) OR contains(email, :termo)',
    ExpressionAttributeValues: {
      ':pk': `TENANT#${tenantId}`,
      ':sk': 'CLIENTE#',
      ':termo': termo
    },
    Limit: limit
  }).promise()
  
  return result.Items.map(item => ({
    id: item.id,
    titulo: item.nome,
    subtitulo: item.email,
    url: `/admin/clientes/${item.id}`
  }))
}
```

### Frontend — BuscaGlobal.jsx
```jsx
function BuscaGlobal() {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // Debounce 300ms
  useEffect(() => {
    if (query.length < 3) { setResultados(null); return }
    const timer = setTimeout(() => buscar(query), 300)
    return () => clearTimeout(timer)
  }, [query])
  
  return (
    <div className="busca-global">
      <input
        type="text"
        placeholder="Buscar clientes, orçamentos, eventos..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="busca-input"
      />
      {resultados && (
        <div className="busca-dropdown">
          {Object.entries(resultados.resultados).map(([tipo, items]) => (
            items.length > 0 && (
              <div key={tipo} className="busca-grupo">
                <h4 className="busca-grupo-titulo">{labelPorTipo(tipo)}</h4>
                {items.map(item => (
                  <Link key={item.id} to={item.url} className="busca-item">
                    <span className="busca-item-titulo">{item.titulo}</span>
                    <span className="busca-item-sub">{item.subtitulo}</span>
                  </Link>
                ))}
              </div>
            )
          ))}
          {resultados.total === 0 && (
            <p className="busca-vazio">Nenhum resultado para "{query}"</p>
          )}
        </div>
      )}
    </div>
  )
}

function labelPorTipo(tipo) {
  const labels = {
    clientes: '👥 Clientes',
    orcamentos: '💰 Orçamentos',
    contratos: '📋 Contratos',
    eventos: '📅 Eventos',
    albuns: '📸 Álbuns'
  }
  return labels[tipo] || tipo
}
```

### Atalho de Teclado
- `Ctrl+K` ou `Cmd+K`: foca no campo de busca
- `Esc`: fecha dropdown
- `↑↓`: navegar resultados
- `Enter`: abrir resultado selecionado

### Regras
- Mínimo 3 caracteres para buscar
- Debounce 300ms
- Máximo 5 resultados por tipo
- Busca por nome, email, título (contains, case-insensitive)
- Queries paralelas (Promise.all)
- Dropdown fecha ao clicar fora
- Atalho Ctrl+K / Cmd+K

### Performance
- DynamoDB filter expression (não ideal para full-text)
- Para MVP é suficiente (< 1000 registros por módulo)
- Futuro: GSI com campo `busca_texto` concatenado ou OpenSearch

## Critérios de Aceite
- [ ] Busca com debounce 300ms
- [ ] Mínimo 3 chars
- [ ] Resultados agrupados por tipo
- [ ] Link direto para o item
- [ ] Atalho Ctrl+K
- [ ] "Nenhum resultado" se vazio
- [ ] Fecha ao clicar fora

## Prompt Pronto para o Kiro CLI

```
Implemente a spec DSH-05: Busca Global.

1. Crie handlers/busca/global.js: GET /admin/busca?q=termo.
2. Crie components/Topbar/BuscaGlobal.jsx.
3. Buscar em 5 domínios (paralelo): clientes, orçamentos, contratos, eventos, álbuns.
4. Debounce 300ms, min 3 chars.
5. Dropdown com resultados agrupados.
6. Atalho Ctrl+K.
7. SAM: rota GET.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
