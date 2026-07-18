# DSH-06: Responsividade (Drawer Mobile)

## Metadados
- **ID:** DSH-06
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** DSH-01

## Contexto
Em telas pequenas (< 768px), a sidebar vira um drawer deslizante (hamburguer menu). Topbar mostra botão ☰ para abrir/fechar. Conteúdo ocupa 100% da largura.

## Escopo
- Modificar: `apps/frontend/src/layouts/AdminLayout.jsx`
- Modificar: `apps/frontend/src/components/Sidebar.jsx`
- CSS: media queries + transições

## Fora de Escopo (NÃO TOCAR)
- Funcionalidades da sidebar (itens de menu, badges)
- Topbar conteúdo (busca, notificações)
- Backend

## Spec Técnica

### Breakpoints
| Largura | Comportamento |
|---|---|
| ≥ 1024px | Sidebar fixa (250px), conteúdo ao lado |
| 768-1023px | Sidebar colapsada (60px, só ícones) |
| < 768px | Sidebar oculta, drawer deslizante |

### AdminLayout (responsivo)
```jsx
function AdminLayout() {
  const [drawerAberto, setDrawerAberto] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(max-width: 1023px)')
  
  return (
    <div className="admin-layout">
      {/* Overlay para fechar drawer */}
      {isMobile && drawerAberto && (
        <div className="drawer-overlay" onClick={() => setDrawerAberto(false)} />
      )}
      
      <Sidebar
        colapsada={isTablet && !isMobile}
        drawer={isMobile}
        aberto={drawerAberto}
        onClose={() => setDrawerAberto(false)}
      />
      
      <div className="admin-main">
        <Topbar onMenuClick={() => setDrawerAberto(!drawerAberto)} showMenuBtn={isMobile} />
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

### Sidebar (modo drawer)
```jsx
function Sidebar({ colapsada, drawer, aberto, onClose }) {
  const classes = [
    'sidebar',
    colapsada && 'sidebar-colapsada',
    drawer && 'sidebar-drawer',
    drawer && aberto && 'sidebar-drawer-aberto'
  ].filter(Boolean).join(' ')
  
  return (
    <aside className={classes}>
      {drawer && (
        <button className="drawer-close" onClick={onClose}>✕</button>
      )}
      {/* ... menu items ... */}
      {menuItems.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          className="sidebar-item"
          onClick={drawer ? onClose : undefined} // Fechar drawer ao navegar
        >
          <span className="sidebar-icon">{item.icon}</span>
          {!colapsada && <span className="sidebar-label">{item.label}</span>}
        </NavLink>
      ))}
    </aside>
  )
}
```

### CSS — Media Queries
```css
/* Desktop (≥ 1024px) */
.sidebar {
  width: 250px;
  position: fixed;
  height: 100vh;
}
.admin-main {
  margin-left: 250px;
}

/* Tablet (768-1023px) */
@media (max-width: 1023px) {
  .sidebar-colapsada {
    width: 60px;
  }
  .sidebar-colapsada .sidebar-label {
    display: none;
  }
  .admin-main {
    margin-left: 60px;
  }
}

/* Mobile (< 768px) */
@media (max-width: 767px) {
  .sidebar-drawer {
    position: fixed;
    z-index: 1000;
    width: 280px;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  .sidebar-drawer-aberto {
    transform: translateX(0);
  }
  .drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
  }
  .admin-main {
    margin-left: 0;
  }
}
```

### Hook — useMediaQuery
```js
function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  )
  
  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])
  
  return matches
}
```

### Regras
- Mobile-first approach
- Transição suave (0.3s ease)
- Fechar drawer ao navegar (click em item)
- Fechar drawer ao clicar no overlay
- Botão ☰ visível apenas em mobile
- Tooltip nos ícones em modo colapsado (tablet)
- Touch-friendly: itens de menu com padding generoso (48px height)

## Critérios de Aceite
- [ ] Desktop: sidebar 250px fixa
- [ ] Tablet: sidebar 60px (só ícones)
- [ ] Mobile: drawer deslizante
- [ ] Overlay escuro ao abrir drawer
- [ ] Fechar ao navegar
- [ ] Transição suave
- [ ] Botão ☰ em mobile

## Prompt Pronto para o Kiro CLI

```
Implemente a spec DSH-06: Responsividade Mobile.

1. Modifique AdminLayout.jsx: hook useMediaQuery + drawer state.
2. Modifique Sidebar.jsx: props colapsada/drawer/aberto.
3. 3 breakpoints: ≥1024 (full), 768-1023 (colapsada), <768 (drawer).
4. Overlay + transição 0.3s.
5. Fechar drawer ao navegar.
6. Botão ☰ na topbar (só mobile).

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
