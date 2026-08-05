import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import usePendingCounts from '../hooks/usePendingCounts';
import { LayoutDashboard, Calendar, Package, FileText, CreditCard, Image, Settings, FolderOpen, LogOut, Camera, X, Users, Star, Receipt, FilePlus, Wrench, Instagram, MessageCircle, Upload, HardDrive, Zap, ScrollText, Plug, Mail, MapPin, PlusCircle } from 'lucide-react';

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
      { to: '/admin/nfse', icon: Receipt, label: 'NFS-e' },
      { to: '/admin/notas-fiscais', icon: Receipt, label: 'Notas Fiscais', end: true },
      { to: '/admin/aditivos', icon: FilePlus, label: 'Aditivos' },
    ],
  },
  {
    label: 'Produção',
    links: [
      { to: '/admin/albuns', icon: Image, label: 'Álbuns', end: true },
      { to: '/admin/portfolio', icon: Camera, label: 'Portfólio' },
      { to: '/admin/equipamentos', icon: Wrench, label: 'Equipamentos' },
      { to: '/admin/clientes', icon: Users, label: 'Clientes' },
    ],
  },
  {
    label: 'Marketing',
    links: [
      { to: '/admin/feedback', icon: Star, label: 'Feedback' },
      { to: '/admin/instagram', icon: Instagram, label: 'Instagram' },
    ],
  },
  {
    label: 'Comunicação',
    links: [
      { to: '/admin/comunicacao', icon: MessageCircle, label: 'WhatsApp', end: true },
      { to: '/admin/comunicacao/emails', icon: Mail, label: 'E-mail Templates' },
      { to: '/admin/comunicacao/mensagens', icon: MessageCircle, label: 'Mensagens do Sistema' },
      { to: '/admin/comunicacao/regras', icon: Zap, label: 'Regras de Notificação' },
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
  { to: '/cliente', icon: LayoutDashboard, label: 'Painel', end: true },
  { to: '/cliente/eventos', icon: Calendar, label: 'Meus Eventos' },
  { to: '/cliente/orcamentos', icon: FileText, label: 'Orçamentos' },
  { to: '/cliente/contratos', icon: FolderOpen, label: 'Contratos' },
  { to: '/cliente/pagamentos', icon: CreditCard, label: 'Pagamentos' },
  { to: '/cliente/albuns', icon: Image, label: 'Minhas Fotos' },
  { to: '/cliente/dados', icon: Users, label: 'Meus Dados' },
];

export default function Sidebar({ onClose }) {
  const { user, logout, authFetch } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const counts = usePendingCounts();
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('mbf_logo_dark_url') || localStorage.getItem('mbf_logo_url') || null);
  const [empresaNome, setEmpresaNome] = useState(() => localStorage.getItem('mbf_empresa_nome') || '');

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
          if (data.tradeName) {
            setEmpresaNome(data.tradeName);
            localStorage.setItem('mbf_empresa_nome', data.tradeName);
          }
          if (logoKeyToUse) {
            authFetch('/admin/fotos/view-url', { method: 'POST', body: JSON.stringify({ key: logoKeyToUse }) })
              .then(r => r.json())
              .then(res => {
                if (res.success) {
                  setLogoUrl(res.data.url);
                  // Cache: save dark vs light
                  if (darkKey && logoKeyToUse === darkKey) {
                    localStorage.setItem('mbf_logo_dark_url', res.data.url);
                  } else {
                    localStorage.setItem('mbf_logo_url', res.data.url);
                  }
                }
              })
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
    <div className="h-full bg-sidebar text-white flex flex-col">
      {/* Logo */}
      <div className="h-12 lg:h-16 flex items-center justify-center px-3 lg:px-4 border-b border-gray-700 relative">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt={empresaNome || 'Logo'} className="h-6 lg:h-8 w-auto max-w-[140px] lg:max-w-[160px] object-contain" />
          ) : (
            <>
              <Camera size={20} className="lg:w-6 lg:h-6" style={{ color: ACCENT }} />
              <span className="font-bold text-sm lg:text-lg">{empresaNome || 'Marcelo Bloise Fotografia'}</span>
            </>
          )}
        </div>
        <button onClick={onClose} className="lg:hidden absolute right-3 p-1 rounded hover:bg-sidebar-hover">
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 lg:py-4 px-2 lg:px-3 overflow-y-auto">
        {isAdmin ? (
          adminSections.map(section => (
            <div key={section.label} className="mb-2 lg:mb-3">
              <p className="px-2 lg:px-3 mb-0.5 lg:mb-1 text-[10px] lg:text-xs font-semibold text-gray-500 uppercase tracking-wider">{section.label}</p>
              {section.links.map(({ to, icon: Icon, label, end: endProp }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/admin' || endProp}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-1.5 lg:py-2.5 rounded-lg text-xs lg:text-sm transition-colors ${
                      isActive ? 'bg-accent text-white' : 'text-gray-300 hover:bg-sidebar-hover hover:text-white'
                    }`
                  }
                >
                  <Icon size={15} className="lg:w-[18px] lg:h-[18px]" />
                  <span className="flex-1">{label}</span>
                  {badgeMap[to] > 0 && (
                    <span className="min-w-[18px] h-4 lg:min-w-[20px] lg:h-5 flex items-center justify-center px-1 lg:px-1.5 text-[9px] lg:text-[10px] font-bold bg-red-500 text-white rounded-full">
                      {badgeMap[to] > 99 ? '99+' : badgeMap[to]}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))
        ) : (
          <div className="space-y-0.5 lg:space-y-1">
            <NavLink
              to="/cliente/orcamentos"
              state={{ openModal: true }}
              onClick={onClose}
              className="flex items-center justify-center gap-2 mx-1 mb-2 lg:mb-3 px-2 lg:px-3 py-2 lg:py-2.5 rounded-lg text-xs lg:text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ background: ACCENT }}
            >
              <PlusCircle size={15} className="lg:w-[18px] lg:h-[18px]" />
              Solicitar Orçamento
            </NavLink>
            {clienteLinks.map(({ to, icon: Icon, label, end: endProp }) => (
              <NavLink
                key={to}
                to={to}
                end={endProp}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-1.5 lg:py-2.5 rounded-lg text-xs lg:text-sm transition-colors ${
                    isActive ? 'bg-accent text-white' : 'text-gray-300 hover:bg-sidebar-hover hover:text-white'
                  }`
                }
              >
                <Icon size={15} className="lg:w-[18px] lg:h-[18px]" />
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-2 lg:p-3 border-t border-gray-700">
        <button onClick={handleLogout} className="flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-1.5 lg:py-2.5 rounded-lg text-xs lg:text-sm text-gray-300 hover:bg-sidebar-hover hover:text-white w-full">
          <LogOut size={15} className="lg:w-[18px] lg:h-[18px]" />
          Sair
        </button>
      </div>
    </div>
  );
}
