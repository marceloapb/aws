import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

const menuItems = [
  { path: '/admin', label: 'Dashboard', icon: '📊' },
  { path: '/admin/agenda', label: 'Agenda', icon: '📅' },
  { path: '/admin/clientes', label: 'Clientes', icon: '👥' },
  { path: '/admin/orcamentos', label: 'Orçamentos', icon: '💰' },
  { path: '/admin/cobrancas', label: 'Cobranças', icon: '💳' },
  { path: '/admin/albuns', label: 'Álbuns', icon: '📸' },
  { path: '/admin/contratos', label: 'Contratos', icon: '📄' },
  { path: '/admin/instagram', label: 'Instagram', icon: '📱' },
  { path: '/admin/google-calendar', label: 'Google Calendar', icon: '🗓️' },
  { path: '/admin/whatsapp', label: 'WhatsApp', icon: '💬' },
  { path: '/admin/fotografos', label: 'Fotógrafos', icon: '📷' },
  { path: '/admin/equipamentos', label: 'Equipamentos', icon: '🎒' },
  { path: '/admin/pendencias', label: 'Pendências', icon: '✅' },
  { path: '/admin/configuracoes', label: 'Configurações', icon: '⚙️' },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-200">
          <h1 className={`font-bold text-primary-600 ${sidebarOpen ? 'text-xl' : 'text-center text-sm'}`}>
            {sidebarOpen ? '📷 Horizons' : '📷'}
          </h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-1 transition-colors ${isActive ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                <span>{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200">
          {sidebarOpen && <p className="text-xs text-gray-500 mb-2">{user?.email}</p>}
          <button onClick={logout} className="text-sm text-red-600 hover:text-red-800">
            {sidebarOpen ? 'Sair' : '🚪'}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700">☰</button>
        </header>
        <div className="p-6"><Outlet /></div>
      </main>
    </div>
  );
}
