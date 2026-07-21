import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import usePendingCounts from '../hooks/usePendingCounts';
import { LayoutDashboard, Calendar, Package, FileText, CreditCard, Image, Settings, FolderOpen, LogOut, Camera, X, Users, Star, Receipt, FilePlus, Wrench, Instagram, MessageCircle, Upload, HardDrive, Zap, ScrollText, Plug, Mail, MapPin } from 'lucide-react';

const ACCENT = '#EA580C';

const adminSections = [
  {
    label: 'Principal',
    links: [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin/agenda', icon: Calendar, label: 'Agenda' },
    ],
  },
  {
    label: 'Comercial',
    links: [
      { to: '/admin/catalogo', icon: Package, label: 'Produtos e Serviços' },
      { to: '/admin/orcamentos', icon: FileText, label: 'Orçamentos' },
      { to: '/admin/contratos', icon: FolderOpen, label: 'Contratos' },
      { to: '/admin/financeiro', icon: CreditCard, label: 'Financeiro' },
      { to: '/admin/notas-fiscais', icon: Receipt, label: 'Notas Fiscais', end: true },
      { to: '/admin/nfse/config', icon: Receipt, label: 'Config NFS-e' },
      { to: '/admin/aditivos', icon: FilePlus, label: 'Aditivos' },
    ],
  },
  {
    label: 'Produção',
    links: [
      { to: '/admin/albuns', icon: Image, label: 'Álbuns', end: true },
      { to: '/admin/albuns/config', icon: Settings, label: 'Config Álbuns' },
      { to: '/admin/equipamentos', icon: Wrench, label: 'Equipamentos' },
      { to: '/admin/clientes', icon: Users, label: 'Clientes' },
    ],
  },
  {
    label: 'Marketing',
    links: [
      { to: '/admin/feedback', icon: Star, label: 'Feedback' },
      { to: '/admin/instagram', icon: Instagram, label: 'Instagram' },
      { to: '/admin/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
      { to: '/admin/followup', icon: Zap, label: 'Follow-up' },
    ],
  },
  {
    label: 'Integrações',
    links: [
      { to: '/admin/integracoes', icon: Plug, label: 'Painel Integrações', end: true },
      { to: '/admin/gateway', icon: CreditCard, label: 'Gateway Pagamento' },
      { to: '/admin/integracoes/logs', icon: ScrollText, label: 'Logs' },
    ],
  },
  {
    label: 'Sistema',
    links: [
      { to: '/admin/storage', icon: HardDrive, label: 'Armazenamento' },
      { to: '/admin/import', icon: Upload, label: 'Import/Export' },
      { to: '/admin/config', icon: Settings, label: 'Configurações' },
    ],
  },
];

const clienteLinks = [
  { to: '/cliente/orcamentos', icon: FileText, label: 'Meus Orçamentos' },
  { to: '/cliente/contratos', icon: FolderOpen, label: 'Meus Contratos' },
  { to: '/cliente/albuns', icon: Image, label: 'Minhas Fotos' },
];

export default function Sidebar({ onClose }) {
  const { user, logout, authFetch } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const counts = usePendingCounts();
  const [logoUrl, setLogoUrl] = useState(null);
  const [empresaNome, setEmpresaNome] = useState('');

  useEffect(() => {
    // Buscar logo da empresa para exibir no sidebar (fundo escuro → prioriza logoDark)
    authFetch('/admin/configuracoes')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          const data = json.data;
          const darkKey = data.logoDarkKey;
          const lightKey = data.logoKey;
          const logoKeyToUse = darkKey || lightKey;
          if (data.tradeName) setEmpresaNome(data.tradeName);
          if (logoKeyToUse) {
            authFetch('/admin/fotos/view-url', { method: 'POST', body: JSON.stringify({ key: logoKeyToUse }) })
              .then(r => r.json())
              .then(res => { if (res.success) setLogoUrl(res.data.url); })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, []);

  // Map de badges por rota
  const badgeMap = {
    '/admin/orcamentos': counts.orcamentos,
    '/admin/contratos': counts.contratos,
    '/admin/financeiro': counts.financeiro,
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-full bg-sidebar text-white hidden lg:flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt={empresaNome || 'Logo'} className="h-8 w-auto max-w-[160px] object-contain" />
          ) : (
            <>
              <Camera size={24} style={{ color: ACCENT }} />
              <span className="font-bold text-lg">{empresaNome || 'MBFoto'}</span>
            </>
          )}
        </div>
        <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-sidebar-hover">
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {isAdmin ? (
          adminSections.map(section => (
            <div key={section.label} className="mb-3">
              <p className="px-3 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">{section.label}</p>
              {section.links.map(({ to, icon: Icon, label, end: endProp }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/admin' || endProp}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive ? 'bg-accent text-white' : 'text-gray-300 hover:bg-sidebar-hover hover:text-white'
                    }`
                  }
                >
                  <Icon size={18} />
                  <span className="flex-1">{label}</span>
                  {badgeMap[to] > 0 && (
                    <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                      {badgeMap[to] > 99 ? '99+' : badgeMap[to]}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))
        ) : (
          <div className="space-y-1">
            {clienteLinks.map(({ to, icon: Icon, label }) => (
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
          </div>
        )}
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
