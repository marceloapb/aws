import React, { useState, useEffect, createContext, useContext } from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Camera, Instagram, Facebook, Youtube, Mail, LogIn } from 'lucide-react';
import FloatingCTA from '../../components/FloatingCTA';
import SEOHead from '../../components/SEOHead';

const API = process.env.REACT_APP_API_URL || '';

const SiteConfigContext = createContext(null);
export const useSiteConfig = () => useContext(SiteConfigContext);

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/sobre', label: 'A Empresa' },
  { to: '/portfolio', label: 'Portfólio' },
  { to: '/novidades', label: 'Novidades' },
  { to: '/contato', label: 'Fale Conosco' },
];

const SOCIAL_ICONS = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  email: Mail,
};

// Custom SVG icons for social networks not in lucide
const WhatsAppIcon = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TikTokIcon = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.88 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .56.04.82.11V9.4a6.29 6.29 0 00-.82-.05A6.34 6.34 0 003.15 15.7a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.42a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.85z"/>
  </svg>
);

export default function SiteLayout() {
  const [config, setConfig] = useState(() => {
    // Initialize from localStorage cache for instant display
    const cachedLogo = localStorage.getItem('mbf_logo_dark_url') || localStorage.getItem('mbf_logo_url');
    const cachedNome = localStorage.getItem('mbf_empresa_nome');
    if (cachedLogo || cachedNome) {
      return { logo_dark_url: localStorage.getItem('mbf_logo_dark_url') || '', logo_url: localStorage.getItem('mbf_logo_url') || '', nome: cachedNome || '' };
    }
    return null;
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    fetch(`${API}/public/site/config`)
      .then(r => r.json())
      .then(data => {
        const d = data.data || data;
        setConfig(d);
        if (d.logo_url) localStorage.setItem('mbf_logo_url', d.logo_url);
        if (d.logo_dark_url) localStorage.setItem('mbf_logo_dark_url', d.logo_dark_url);
        if (d.nome) localStorage.setItem('mbf_empresa_nome', d.nome);
      })
      .catch(() => {});
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const nome = config?.nome || 'Marcelo Bloise Fotografia';
  // Site tem fundo escuro — prioriza logo para fundo escuro, com fallback para o padrão
  const logoUrl = config?.logo_dark_url || config?.logo_url;
  
  // redes_sociais vem como objeto { instagram, whatsapp, tiktok, ... } do cadastro da empresa
  // redes vem como array [{ tipo, url }] do CMS — normalizar para objeto
  const redesSociais = (() => {
    // Prioriza redes_sociais (cadastro da empresa)
    if (config?.redes_sociais && Object.keys(config.redes_sociais).length > 0) {
      return config.redes_sociais;
    }
    // Fallback: redes do CMS (array format)
    if (Array.isArray(config?.redes)) {
      const obj = {};
      for (const r of config.redes) {
        if (r.tipo && r.url) obj[r.tipo] = r.url;
      }
      return obj;
    }
    // Fallback: redes como objeto direto
    if (config?.redes && typeof config.redes === 'object' && !Array.isArray(config.redes)) {
      return config.redes;
    }
    return {};
  })();

  return (
    <SiteConfigContext.Provider value={config}>
      <SEOHead />
      <div className="min-h-screen bg-stone-950 text-stone-50 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50">
          {/* Orange top border */}
          <div className="h-[3px] bg-[#EA580C]" />
          {/* Main navbar */}
          <div className="bg-gradient-to-b from-stone-900 to-stone-950 border-b border-stone-700/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">

              {/* Left: Navigation Links */}
              <nav className="hidden md:flex items-center gap-0.5">
                {NAV_LINKS.map(link => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/'}
                    className={({ isActive }) =>
                      `px-3 py-1.5 rounded text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[#EA580C] text-white shadow-md shadow-orange-900/30'
                          : 'text-stone-300 hover:text-white hover:bg-stone-800'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>

              {/* Center: Logo */}
              <Link to="/" className="absolute left-1/2 -translate-x-1/2 flex items-center shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt={nome} className="h-10 w-auto" />
                ) : (
                  <span className="text-xl font-bold italic text-white tracking-wide">
                    <span className="text-white">Marcel</span>
                    <span className="text-[#EA580C] text-2xl font-extrabold">o</span>
                    <span className="text-white"> B</span>
                    <span className="text-[#EA580C] text-2xl font-extrabold">l</span>
                    <span className="text-white">oise</span>
                    <span className="text-stone-400 text-xs ml-1 not-italic font-normal">Fotografia</span>
                  </span>
                )}
              </Link>

              {/* Right: Social Icons + Entrar */}
              <div className="hidden md:flex items-center gap-3">
                {/* Social icons */}
                <div className="flex items-center gap-2">
                  {redesSociais.whatsapp && (
                    <a href={redesSociais.whatsapp} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-[#EA580C] transition-colors" aria-label="WhatsApp">
                      <WhatsAppIcon size={17} />
                    </a>
                  )}
                  {redesSociais.instagram && (
                    <a href={redesSociais.instagram} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-[#EA580C] transition-colors" aria-label="Instagram">
                      <Instagram size={17} />
                    </a>
                  )}
                  {redesSociais.tiktok && (
                    <a href={redesSociais.tiktok} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-[#EA580C] transition-colors" aria-label="TikTok">
                      <TikTokIcon size={17} />
                    </a>
                  )}
                  {/* Fallback: show icons even if redes not configured */}
                  {!redesSociais.whatsapp && !redesSociais.instagram && !redesSociais.tiktok && (
                    <>
                      <a href="#" className="text-stone-400 hover:text-[#EA580C] transition-colors" aria-label="WhatsApp">
                        <WhatsAppIcon size={17} />
                      </a>
                      <a href="#" className="text-stone-400 hover:text-[#EA580C] transition-colors" aria-label="Instagram">
                        <Instagram size={17} />
                      </a>
                      <a href="#" className="text-stone-400 hover:text-[#EA580C] transition-colors" aria-label="TikTok">
                        <TikTokIcon size={17} />
                      </a>
                    </>
                  )}
                </div>

                {/* Entrar button */}
                <Link to="/login" className="ml-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-[#EA580C] text-white hover:opacity-90 transition-opacity">
                  <LogIn size={14} /> Entrar
                </Link>
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMenuOpen(true)}
                className="md:hidden p-2 text-stone-300 hover:text-stone-50"
                aria-label="Abrir menu"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Drawer */}
        {menuOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-0 h-full w-72 bg-stone-900 border-l border-stone-700 flex flex-col animate-slide-in-right">
              <div className="flex items-center justify-between px-4 h-14 border-b border-stone-700">
                <span className="font-bold text-white">{nome.split(' ').slice(0, 2).join(' ')}</span>
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
                          ? 'bg-[#EA580C] text-white'
                          : 'text-stone-300 hover:text-stone-50 hover:bg-stone-800/50'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
                <div className="mt-4 pt-4 border-t border-stone-700">
                  <Link to="/login" className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-[#EA580C] text-white hover:opacity-90 transition-opacity">
                    <LogIn size={16} /> Entrar
                  </Link>
                </div>
                {/* Social icons mobile */}
                <div className="mt-4 flex items-center justify-center gap-4">
                  <a href={redesSociais.whatsapp || '#'} className="text-stone-400 hover:text-[#EA580C] transition-colors" aria-label="WhatsApp">
                    <WhatsAppIcon size={20} />
                  </a>
                  <a href={redesSociais.instagram || '#'} className="text-stone-400 hover:text-[#EA580C] transition-colors" aria-label="Instagram">
                    <Instagram size={20} />
                  </a>
                  <a href={redesSociais.tiktok || '#'} className="text-stone-400 hover:text-[#EA580C] transition-colors" aria-label="TikTok">
                    <TikTokIcon size={20} />
                  </a>
                </div>
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
                  <>
                    <Camera size={20} className="text-[#EA580C]" />
                    <span className="font-semibold">{nome}</span>
                  </>
                )}
              </div>

              {/* Social Icons */}
              {Object.keys(redesSociais).length > 0 && (
                <div className="flex items-center gap-3">
                  {Object.entries(redesSociais).map(([key, url]) => {
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
