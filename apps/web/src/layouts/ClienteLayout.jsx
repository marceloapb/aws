import { Link, Outlet, useLocation } from 'react-router-dom';

const menuItems = [
  { path: '/portal', label: 'Início', icon: '🏠' },
  { path: '/portal/albuns', label: 'Meus Álbuns', icon: '📸' },
  { path: '/portal/contratos', label: 'Contratos', icon: '📄' },
  { path: '/portal/pagamentos', label: 'Pagamentos', icon: '💳' },
  { path: '/portal/orcamentos', label: 'Orçamentos', icon: '💰' },
];

export default function ClienteLayout() {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary-600">📷 Horizons</h1>
          <nav className="flex gap-4">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}
                  className={`text-sm px-3 py-2 rounded-md ${isActive ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:text-gray-900'}`}>
                  {item.icon} {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6"><Outlet /></main>
    </div>
  );
}
