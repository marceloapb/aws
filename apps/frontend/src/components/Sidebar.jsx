import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Package, FileText, CreditCard, Image, Settings, FolderOpen, LogOut, Camera, X, Users } from 'lucide-react';

const ACCENT = '#EA580C';

const adminLinks = [
  { to: '/admin/agenda', icon: Calendar, label: 'Agenda' },
  { to: '/admin/catalogo', icon: Package, label: 'Catálogo' },
  { to: '/admin/orcamentos', icon: FileText, label: 'Orçamentos' },
  { to: '/admin/contratos', icon: FolderOpen, label: 'Contratos' },
  { to: '/admin/financeiro', icon: CreditCard, label: 'Financeiro' },
  { to: '/admin/albuns', icon: Image, label: 'Álbuns' },
  { to: '/admin/config', icon: Settings, label: 'Configurações' },
];

const clienteLinks = [
  { to: '/cliente/orcamentos', icon: FileText, label: 'Meus Orçamentos' },
  { to: '/cliente/contratos', icon: FolderOpen, label: 'Meus Contratos' },
  { to: '/cliente/albuns', icon: Image, label: 'Minhas Fotos' },
];

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user?.role === 'admin' ? adminLinks : clienteLinks;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-full bg-sidebar text-white flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Camera size={24} style={{ color: ACCENT }} />
          <span className="font-bold text-lg">MBFoto</span>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-sidebar-hover">
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-accent text-white' : 'text-gray-300 hover:bg-sidebar-hover hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-sidebar-hover hover:text-white w-full">
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </div>
  );
}
