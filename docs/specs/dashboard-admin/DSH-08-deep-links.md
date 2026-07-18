# DSH-08: Deep Links e Navegação Contextual

## Metadados
- **ID:** DSH-08
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** DSH-01

## Contexto
Todo item clicável no dashboard (pendências, eventos, notificações) deve levar diretamente à tela/registro correto via deep link. Suportar URLs diretas (bookmarkable) para cada recurso do sistema.

## Escopo
- `apps/frontend/src/routes/adminRoutes.js` — Modificar
- Padrão de rotas parametrizadas

## Fora de Escopo (NÃO TOCAR)
- Lógica das telas destino
- Shell/Layout (DSH-01)
- Backend

## Spec Técnica

### Padrão de URLs
```
/admin                          → Dashboard
/admin/orcamentos               → Lista orçamentos
/admin/orcamentos/:id           → Detalhe orçamento
/admin/orcamentos?status=pendente → Lista filtrada
/admin/clientes/:id             → Detalhe cliente
/admin/clientes/:id/orcamentos  → Orçamentos do cliente
/admin/agenda/:id               → Detalhe evento
/admin/contratos/:id            → Detalhe contrato
/admin/financeiro?status=atrasado → Pagamentos atrasados
/admin/albuns/:id               → Detalhe álbum
/admin/whatsapp/:conversa_id    → Conversa específica
/admin/configuracoes/:aba       → Aba específica de config
```

### Rotas Parametrizadas
```js
const adminRoutes = {
  path: '/admin',
  element: <AdminLayout />,
  children: [
    { index: true, element: <Dashboard /> },
    // Orçamentos
    { path: 'orcamentos', element: <Orcamentos /> },
    { path: 'orcamentos/:id', element: <OrcamentoDetalhe /> },
    // Clientes
    { path: 'clientes', element: <Clientes /> },
    { path: 'clientes/:id', element: <ClienteDetalhe /> },
    { path: 'clientes/:id/orcamentos', element: <ClienteOrcamentos /> },
    // Agenda
    { path: 'agenda', element: <Agenda /> },
    { path: 'agenda/:id', element: <EventoDetalhe /> },
    // Contratos
    { path: 'contratos', element: <Contratos /> },
    { path: 'contratos/:id', element: <ContratoDetalhe /> },
    // Financeiro
    { path: 'financeiro', element: <Financeiro /> },
    { path: 'financeiro/:id', element: <PagamentoDetalhe /> },
    // Álbuns
    { path: 'albuns', element: <Albuns /> },
    { path: 'albuns/:id', element: <AlbumDetalhe /> },
    // WhatsApp
    { path: 'whatsapp', element: <WhatsApp /> },
    { path: 'whatsapp/:conversa_id', element: <Conversa /> },
    // Instagram
    { path: 'instagram', element: <Instagram /> },
    // Equipamentos
    { path: 'equipamentos', element: <Equipamentos /> },
    { path: 'equipamentos/:id', element: <EquipamentoDetalhe /> },
    // Configurações
    { path: 'configuracoes', element: <Configuracoes /> },
    { path: 'configuracoes/:aba', element: <Configuracoes /> },
    // 404
    { path: '*', element: <NotFound /> }
  ]
}
```

### Navegação Contextual (helper)
```js
// Hook para navegação com contexto
function useNavegar() {
  const navigate = useNavigate()
  
  return {
    paraOrcamento: (id) => navigate(`/admin/orcamentos/${id}`),
    paraCliente: (id) => navigate(`/admin/clientes/${id}`),
    paraEvento: (id) => navigate(`/admin/agenda/${id}`),
    paraContrato: (id) => navigate(`/admin/contratos/${id}`),
    paraPagamento: (id) => navigate(`/admin/financeiro/${id}`),
    paraAlbum: (id) => navigate(`/admin/albuns/${id}`),
    paraConversa: (id) => navigate(`/admin/whatsapp/${id}`),
    paraConfigAba: (aba) => navigate(`/admin/configuracoes/${aba}`),
    paraListaFiltrada: (modulo, filtros) => {
      const params = new URLSearchParams(filtros)
      navigate(`/admin/${modulo}?${params.toString()}`)
    }
  }
}
```

### Query Params para Filtros
```jsx
// Na tela de lista, ler filtros da URL
function Orcamentos() {
  const [searchParams] = useSearchParams()
  const statusFiltro = searchParams.get('status') // ex: 'pendente'
  
  // Aplicar filtro ao carregar
  useEffect(() => {
    if (statusFiltro) setFiltros({ status: statusFiltro })
  }, [statusFiltro])
}
```

### Regras
- URLs são bookmarkable (recarregar funciona)
- Query params para filtros de lista
- Path params para IDs de recurso
- 404 amigável para rotas inválidas
- Breadcrumb opcional (derivado da URL)
- History push (back button funciona)

## Critérios de Aceite
- [ ] Toda rota parametrizada funciona
- [ ] Query params filtram listas
- [ ] Reload mantém estado
- [ ] Back button funciona
- [ ] 404 para rotas inválidas
- [ ] Hook useNavegar funciona

## Prompt Pronto para o Kiro CLI

```
Implemente a spec DSH-08: Deep Links.

1. Atualize routes/adminRoutes.js: rotas parametrizadas para todos os módulos.
2. Crie hooks/useNavegar.js: helper de navegação.
3. Rotas :id para detalhe, query params para filtros.
4. 404 page para rotas inválidas.
5. Query params lidos nas telas de lista.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
