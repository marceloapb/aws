import React, { useState, useEffect, createContext, useContext } from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Camera, Instagram, Facebook, Youtube, Mail, LogIn } from 'lucide-react';
import FloatingCTA from '../../components/FloatingCTA';

const API = process.env.REACT_APP_API_URL || '';

const SiteConfigContext = createContext(null);
export const useSiteConfig = () => useContext(SiteConfigContext);

const NAV_LINKS = [
  { to: '/', label: 'Início' },
  { to: '/portfolio', label: 'Portfólio' },
  { to: '/novidades', label: 'Novidades' },
  { to: '/sobre', label: 'Sobre' },
  { to: '/contato', label: 'Contato' },
];

const SOCIAL_ICONS = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  email: Mail,
};

export default function SiteLayout() {
  const [config, setConfig] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    fetch(`${API}/public/site/config`)
      .then(r => r.json())
      .then(data => setConfig(data.data || data))
      .catch(() => {});
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const nome = config?.nome || 'MBFoto';
  // Site tem fundo escuro — prioriza logo para fundo escuro, com fallback para o padrão
  const logoUrl = config?.logo_dark_url || config?.logo_url;
  const redes = config?.redes || {};

  return (
    <SiteConfigContext.Provider value={config}>
      <div className="min-h-screen bg-stone-950 text-stone-50 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-stone-950/90 backdrop-blur-md border-b border-stone-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt={nome} className="h-8 w-auto" />
              ) : (
                <Camera size={28} className="text-[#EA580C]" />
              )}
              <span className="text-lg font-bold">{nome}</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-[#EA580C] bg-stone-900'
                        : 'text-stone-300 hover:text-stone-50 hover:bg-stone-900/50'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <Link to="/login" className="ml-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#EA580C] text-white hover:opacity-90 transition-opacity">
                <LogIn size={14} /> Entrar
              </Link>
            </nav>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden p-2 text-stone-300 hover:text-stone-50"
              aria-label="Abrir menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </header>

        {/* Mobile Drawer */}
        {menuOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-0 h-full w-72 bg-stone-900 border-l border-stone-800 flex flex-col animate-slide-in-right">
              <div className="flex items-center justify-between px-4 h-16 border-b border-stone-800">
                <span className="font-bold">{nome}</span>
                <button onClick={() => setMenuOpen(false)} className="p-2 text-stone-300 hover:text-stone-50">
                  <X size={24} />
                </button>
              </div>
              <nav className="flex flex-col p-4 gap-1">
                {NAV_LINKS.map(link => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/'}
                    className={({ isActive }) =>
                      `px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-[#EA580C] bg-stone-800'
                          : 'text-stone-300 hover:text-stone-50 hover:bg-stone-800/50'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
                <Link to="/login" className="mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-[#EA580C] text-white hover:opacity-90 transition-opacity">
                  <LogIn size={16} /> Entrar
                </Link>
              </nav>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1">
          <Outlet context={{ config }} />
        </main>

        {/* Footer */}
        <footer className="border-t border-stone-800 bg-stone-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Logo + name */}
              <div className="flex items-center gap-2">
                {logoUrl ? (
                  <img src={logoUrl} alt={nome} className="h-6 w-auto" />
                ) : (
                  <Camera size={20} className="text-[#EA580C]" />
                )}
                <span className="font-semibold">{nome}</span>
              </div>

              {/* Social Icons */}
              {Object.keys(redes).length > 0 && (
                <div className="flex items-center gap-3">
                  {Object.entries(redes).map(([key, url]) => {
                    if (!url) return null;
                    const Icon = SOCIAL_ICONS[key] || Mail;
                    return (
                      <a
                        key={key}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 rounded-full bg-stone-800 flex items-center justify-center text-stone-400 hover:text-[#EA580C] hover:bg-stone-700 transition-colors"
                        aria-label={key}
                      >
                        <Icon size={18} />
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Copyright */}
              <p className="text-sm text-stone-500">
                © {new Date().getFullYear()} {nome}. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>

        {/* Floating CTA */}
        <FloatingCTA />
      </div>
    </SiteConfigContext.Provider>
  );
}
