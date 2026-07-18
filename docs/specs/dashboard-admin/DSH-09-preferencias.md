# DSH-09: Preferências do Dashboard (Ordem/Visibilidade)

## Metadados
- **ID:** DSH-09
- **Tipo:** Feature
- **Prioridade:** P3
- **Impacto:** Baixo
- **Esforço:** Baixo
- **Dependência:** DSH-02, DSH-03

## Contexto
Admin pode personalizar o dashboard: reordenar widgets, ocultar widgets que não usa, e escolher qual widget fica em destaque. Preferências salvas no perfil do admin.

## Escopo
- `apps/backend/src/handlers/dashboard/preferencias.js` — NOVO
- `apps/frontend/src/components/dashboard/DashboardConfig.jsx` — NOVO
- API: GET /admin/dashboard/preferencias, PUT /admin/dashboard/preferencias

## Fora de Escopo (NÃO TOCAR)
- Conteúdo dos widgets (DSH-02, DSH-03)
- Drag-and-drop sofisticado (futuro)
- Temas/cores (futuro)

## Spec Técnica

### Entidade PREFERENCIAS_DASHBOARD
```json
{
  "PK": "TENANT#t123",
  "SK": "PREF_DASHBOARD",
  "widgets": [
    { "id": "proximos_eventos", "visivel": true, "ordem": 1 },
    { "id": "pendencias", "visivel": true, "ordem": 2 },
    { "id": "faturamento_mes", "visivel": true, "ordem": 3 },
    { "id": "eventos_mes", "visivel": false, "ordem": 4 }
  ],
  "atualizado_em": "2026-07-17T10:00:00Z"
}
```

### API — GET /admin/dashboard/preferencias
```json
{
  "widgets": [
    { "id": "proximos_eventos", "label": "Próximos Eventos", "visivel": true, "ordem": 1 },
    { "id": "pendencias", "label": "Pendências", "visivel": true, "ordem": 2 },
    { "id": "faturamento_mes", "label": "Faturamento do Mês", "visivel": true, "ordem": 3 },
    { "id": "eventos_mes", "label": "Eventos do Mês", "visivel": false, "ordem": 4 }
  ]
}
```

### API — PUT /admin/dashboard/preferencias
```json
// Input
{
  "widgets": [
    { "id": "pendencias", "visivel": true, "ordem": 1 },
    { "id": "proximos_eventos", "visivel": true, "ordem": 2 },
    { "id": "faturamento_mes", "visivel": false, "ordem": 3 }
  ]
}

// Response
{ "sucesso": true }
```

### Frontend — DashboardConfig.jsx
```jsx
function DashboardConfig({ widgets, onSalvar }) {
  const [config, setConfig] = useState(widgets)
  
  const toggleVisibilidade = (id) => {
    setConfig(prev => prev.map(w => 
      w.id === id ? { ...w, visivel: !w.visivel } : w
    ))
  }
  
  const moverWidget = (id, direcao) => {
    // Mover para cima ou para baixo na lista
    const index = config.findIndex(w => w.id === id)
    const newIndex = direcao === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= config.length) return
    
    const newConfig = [...config]
    ;[newConfig[index], newConfig[newIndex]] = [newConfig[newIndex], newConfig[index]]
    setConfig(newConfig.map((w, i) => ({ ...w, ordem: i + 1 })))
  }
  
  return (
    <div className="dashboard-config">
      <h3>⚙️ Personalizar Dashboard</h3>
      <ul>
        {config.map(widget => (
          <li key={widget.id} className="config-item">
            <label>
              <input
                type="checkbox"
                checked={widget.visivel}
                onChange={() => toggleVisibilidade(widget.id)}
              />
              {widget.label}
            </label>
            <div className="config-arrows">
              <button onClick={() => moverWidget(widget.id, 'up')}>↑</button>
              <button onClick={() => moverWidget(widget.id, 'down')}>↓</button>
            </div>
          </li>
        ))}
      </ul>
      <button onClick={() => onSalvar(config)}>Salvar Preferências</button>
    </div>
  )
}
```

### Dashboard com Preferências
```jsx
function Dashboard() {
  const [prefs, setPrefs] = useState(null)
  const [configAberto, setConfigAberto] = useState(false)
  
  const widgetsVisiveis = prefs?.widgets
    ?.filter(w => w.visivel)
    ?.sort((a, b) => a.ordem - b.ordem)
  
  const widgetMap = {
    proximos_eventos: <ProximosEventos />,
    pendencias: <Pendencias />,
    faturamento_mes: <FaturamentoMes />,
    eventos_mes: <EventosMes />
  }
  
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <button onClick={() => setConfigAberto(true)}>⚙️ Personalizar</button>
      </div>
      <div className="dashboard-widgets">
        {widgetsVisiveis?.map(w => (
          <div key={w.id}>{widgetMap[w.id]}</div>
        ))}
      </div>
      {configAberto && (
        <DashboardConfig widgets={prefs.widgets} onSalvar={salvarPrefs} />
      )}
    </div>
  )
}
```

### Regras
- Default: todos visíveis, ordem padrão
- Admin pode reordenar com setas ↑↓
- Admin pode ocultar widgets
- Salvar preferências no DynamoDB
- Se preferência não existe: usar default
- Mínimo 1 widget visível (não permitir ocultar todos)
- Botão "Restaurar Padrão"

## Critérios de Aceite
- [ ] Reordenar widgets (↑↓)
- [ ] Ocultar/exibir widgets (checkbox)
- [ ] Salvar no backend
- [ ] Carregar preferências ao abrir dashboard
- [ ] Default se não configurado
- [ ] Mínimo 1 widget visível
- [ ] Botão "Restaurar Padrão"

## Prompt Pronto para o Kiro CLI

```
Implemente a spec DSH-09: Preferências do Dashboard.

1. Crie handlers/dashboard/preferencias.js: GET + PUT.
2. Crie components/dashboard/DashboardConfig.jsx: reordenar + toggle.
3. Entidade PREF_DASHBOARD no DynamoDB.
4. Default: todos visíveis, ordem padrão.
5. Mínimo 1 widget visível.
6. Dashboard renderiza widgets conforme preferências.
7. SAM: rotas GET + PUT.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
