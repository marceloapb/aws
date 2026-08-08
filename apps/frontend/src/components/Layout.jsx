import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import GlobalSearch from './search/GlobalSearch';
import { useAuth } from '../contexts/AuthContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import usePendingCounts from '../hooks/usePendingCounts';
import { Menu, Search, Bell, User as UserIcon, Lock, LogOut } from 'lucide-react';

export default function Layout() {
  const [open, setOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const { user, logout } = useAuth();
  const { isOpen: searchOpen, setIsOpen: setSearchOpen } = useKeyboardShortcuts();
  const counts = usePendingCounts();
  const location = useLocation();
  const isClientePortal = location.pathname.startsWith('/cliente');

  return (
    <div className="flex h-screen bg-gray-50 admin-area">
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-56 lg:w-64 transform transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setOpen(false)} />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-12 lg:h-16 bg-white border-b border-gray-200 flex items-center px-3 lg:px-6">
          <button onClick={() => setOpen(true)} className="lg:hidden p-1.5 rounded-md hover:bg-gray-100">
            <Menu size={18} />
          </button>

          {/* Search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 ml-4 text-sm text-gray-400 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-colors"
          >
            <Search size={16} />
            <span>Buscar</span>
            <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded font-mono">⌘K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-2 lg:gap-3">
            {/* Mobile search icon */}
            <button onClick={() => setSearchOpen(true)} className="sm:hidden p-1.5 rounded-md hover:bg-gray-100">
              <Search size={18} className="text-gray-500" />
            </button>
            {/* Notification bell */}
            <button className="relative p-1.5 lg:p-2 rounded-md hover:bg-gray-100" onClick={() => window.location.href='/admin/notificacoes'}>
              <Bell size={18} className="text-gray-500 lg:w-5 lg:h-5" />
              {counts.notificacoes > 0 && (
                <span className="absolute top-0.5 right-0.5 lg:top-1 lg:right-1 min-w-[14px] lg:min-w-[16px] h-3.5 lg:h-4 flex items-center justify-center px-0.5 lg:px-1 text-[9px] lg:text-[10px] font-bold bg-red-500 text-white rounded-full">
                  {counts.notificacoes > 99 ? '99+' : counts.notificacoes}
                </span>
              )}
            </button>
            <span className="hidden md:inline text-sm text-gray-600">Olá, <strong>{user?.email?.split('@')[0]}</strong></span>
            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)} className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs lg:text-sm font-medium hover:ring-2 hover:ring-orange-300 transition-all">
                {(user?.email || 'U').charAt(0).toUpperCase()}
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent" onClick={() => setProfileOpen(false)} />
                  {/* Desktop: dropdown / Mobile: bottom sheet */}
                  <div className="fixed inset-x-0 bottom-0 sm:absolute sm:inset-auto sm:right-0 sm:top-10 z-50 w-full sm:w-64 bg-white rounded-t-2xl sm:rounded-xl border shadow-lg py-2 sm:max-w-[calc(100vw-1rem)] animate-slide-in sm:animate-none">
                    <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-1 mb-2 sm:hidden" />
                    <div className="px-4 py-3 border-b">
                      <p className="text-sm font-medium text-gray-900">{user?.email?.split('@')[0]}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Perfil: {user?.role === 'admin' ? 'Administrador' : 'Cliente'}</p>
                    </div>
                    <button onClick={() => { setProfileOpen(false); window.location.href='/admin/meu-perfil'; }} className="w-full text-left px-4 py-3 sm:py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 sm:gap-2">
                      <UserIcon size={16} className="sm:w-3.5 sm:h-3.5" /> Meus Dados
                    </button>
                    <button onClick={() => { setProfileOpen(false); window.location.href='/admin/trocar-senha'; }} className="w-full text-left px-4 py-3 sm:py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 sm:gap-2">
                      <Lock size={16} className="sm:w-3.5 sm:h-3.5" /> Trocar Senha
                    </button>
                    <div className="border-t mt-1 pt-1">
                      <button onClick={() => { setProfileOpen(false); logout(); }} className="w-full text-left px-4 py-3 sm:py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 sm:gap-2">
                        <LogOut size={16} className="sm:w-3.5 sm:h-3.5" /> Sair
                      </button>
                    </div>
                    {/* Safe area padding for iPhone */}
                    <div className="h-[env(safe-area-inset-bottom)] sm:hidden" />
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 lg:py-6 lg:px-14">
          <div className={isClientePortal ? 'max-w-3xl mx-auto' : ''}>
            <Outlet />
          </div>
        </main>
      </div>



      {/* Global Search Modal */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
