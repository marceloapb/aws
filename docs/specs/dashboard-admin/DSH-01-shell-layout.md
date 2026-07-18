# DSH-01: Shell Layout (Sidebar + Topbar + Routing)

## Metadados
- **ID:** DSH-01
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** Nenhuma (fundação)

## Contexto
O Shell é a casca do sistema admin: sidebar com navegação, topbar com busca/notificações/perfil, e área de conteúdo (Outlet do React Router). Todos os módulos são renderizados dentro dele.

## Escopo
- `apps/frontend/src/layouts/AdminLayout.jsx` — NOVO
- `apps/frontend/src/components/Sidebar.jsx` — NOVO
- `apps/frontend/src/components/Topbar.jsx` — NOVO
- `apps/frontend/src/routes/adminRoutes.js` — NOVO
- React Router v6 (Outlet pattern)

## Fora de Escopo (NÃO TOCAR)
- Conteúdo dos módulos (telas internas)
- Notificações (DSH-04)
- Busca (DSH-05)
- Responsividade (DSH-06)

## Spec Técnica

### AdminLayout.jsx
```jsx
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

function AdminLayout() {
  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main">
        <Topbar />
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
```

### Sidebar.jsx
```jsx
const menuItems = [
  { icon: '📊', label: 'Dashboard', path: '/admin' },
  { icon: '📅', label: 'Agenda', path: '/admin/agenda' },
  { icon: '💰', label: 'Orçamentos', path: '/admin/orcamentos' },
  { icon: '📋', label: 'Contratos', path: '/admin/contratos' },
  { icon: '👥', label: 'Clientes', path: '/admin/clientes' },
  { icon: '📸', label: 'Álbuns', path: '/admin/albuns' },
  { icon: '💳', label: 'Financeiro', path: '/admin/financeiro' },
  { icon: '🛒', label: 'Produtos e Serviços', path: '/admin/produtos' },
  { icon: '📷', label: 'Equipamentos', path: '/admin/equipamentos' },
  { icon: '📱', label: 'WhatsApp', path: '/admin/whatsapp' },
  { icon: '📸', label: 'Instagram', path: '/admin/instagram' },
  { icon: '⚙️', label: 'Configurações', path: '/admin/configuracoes' },
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src="/logo.svg" alt="MBF" className="sidebar-logo" />
        <span className="sidebar-title">MBF Fotos</span>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <NavLink key={item.path} to={item.path} className="sidebar-item">
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span>v1.0.0</span>
      </div>
    </aside>
  )
}
```

### Topbar.jsx
```jsx
function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="menu-toggle">☰</button>
        <h1 className="page-title">{/* Dinâmico por rota */}</h1>
      </div>
      <div className="topbar-right">
        <div className="topbar-search">
          {/* Placeholder para DSH-05 */}
        </div>
        <button className="topbar-notifications">
          🔔 {/* Placeholder para DSH-04 */}
        </button>
        <div className="topbar-profile">
          <span>Admin</span>
        </div>
      </div>
    </header>
  )
}
```

### adminRoutes.js
```js
import AdminLayout from '../layouts/AdminLayout'
import Dashboard from '../pages/admin/Dashboard'
// ... lazy imports

const adminRoutes = {
  path: '/admin',
  element: <AdminLayout />,
  children: [
    { index: true, element: <Dashboard /> },
    { path: 'agenda', element: <Agenda /> },
    { path: 'orcamentos', element: <Orcamentos /> },
    { path: 'contratos', element: <Contratos /> },
    { path: 'clientes', element: <Clientes /> },
    { path: 'albuns', element: <Albuns /> },
    { path: 'financeiro', element: <Financeiro /> },
    { path: 'produtos', element: <Produtos /> },
    { path: 'equipamentos', element: <Equipamentos /> },
    { path: 'whatsapp', element: <WhatsApp /> },
    { path: 'instagram', element: <Instagram /> },
    { path: 'configuracoes', element: <Configuracoes /> },
  ]
}
```

### CSS Layout
```css
.admin-layout {
  display: flex;
  min-height: 100vh;
}
.sidebar {
  width: 250px;
  background: #1a1a2e;
  color: white;
  position: fixed;
  height: 100vh;
  overflow-y: auto;
}
.admin-main {
  margin-left: 250px;
  flex: 1;
}
.topbar {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  background: white;
  z-index: 100;
}
.admin-content {
  padding: 24px;
}
```

### Regras
- Sidebar fixa à esquerda (250px desktop)
- Topbar sticky no topo
- Outlet para conteúdo dinâmico
- NavLink com classe active para item atual
- Lazy loading dos módulos
- Protected route (verificar auth Cognito)

## Critérios de Aceite
- [ ] Sidebar renderiza com todos os módulos
- [ ] NavLink destaca item ativo
- [ ] Topbar com placeholders
- [ ] Outlet renderiza módulo correto por rota
- [ ] Protected route (redirecionar se não autenticado)
- [ ] Lazy loading funciona

## Prompt Pronto para o Kiro CLI

```
Implemente a spec DSH-01: Shell Layout Admin.

1. Crie layouts/AdminLayout.jsx: sidebar + topbar + Outlet.
2. Crie components/Sidebar.jsx: menu com 12 itens + NavLink.
3. Crie components/Topbar.jsx: placeholders para busca/notificações.
4. Crie routes/adminRoutes.js: React Router v6 com lazy loading.
5. CSS: sidebar 250px fixa, topbar sticky, content padding 24px.
6. Protected route com verificação Cognito.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
