import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Calendar, FileText, Users, MoreHorizontal, X, Package, FolderOpen, CreditCard, Image, Settings, Star, Wrench, MessageCircle, Receipt, Instagram, HardDrive } from 'lucide-react';

const ACCENT = '#EA580C';

const mainItems = [
  { to: '/admin', icon: Home, label: 'Dashboard', end: true },
  { to: '/admin/agenda', icon: Calendar, label: 'Agenda' },
  { to: '/admin/orcamentos', icon: FileText, label: 'Orçamentos' },
  { to: '/admin/clientes', icon: Users, label: 'Clientes' },
];

const moreItems = [
  { to: '/admin/catalogo', icon: Package, label: 'Produtos' },
  { to: '/admin/contratos', icon: FolderOpen, label: 'Contratos' },
  { to: '/admin/financeiro', icon: CreditCard, label: 'Financeiro' },
  { to: '/admin/notas-fiscais', icon: Receipt, label: 'Notas Fiscais' },
  { to: '/admin/albuns', icon: Image, label: 'Álbuns' },
  { to: '/admin/equipamentos', icon: Wrench, label: 'Equipamentos' },
  { to: '/admin/feedback', icon: Star, label: 'Feedback' },
  { to: '/admin/instagram', icon: Instagram, label: 'Instagram' },
  { to: '/admin/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
  { to: '/admin/storage', icon: HardDrive, label: 'Armazenamento' },
  { to: '/admin/config', icon: Settings, label: 'Configurações' },
];

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const isActive = (path, end) => {
    if (end) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const isMoreActive = moreItems.some(item => isActive(item.to));

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl p-4 pb-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Mais módulos</h3>
              <button onClick={() => setMoreOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {moreItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-gray-100 transition-colors"
                  style={isActive(to) ? { color: ACCENT } : { color: '#6b7280' }}
                >
                  <Icon size={22} />
                  <span className="text-xs text-center leading-tight">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] lg:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          {mainItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
              style={isActive(to, end) ? { color: ACCENT } : { color: '#6b7280' }}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
            style={isMoreActive && !moreOpen ? { color: ACCENT } : { color: '#6b7280' }}
          >
            <MoreHorizontal size={20} />
            <span className="text-[10px] font-medium">Mais</span>
          </button>
        </div>
      </nav>
    </>
  );
}
