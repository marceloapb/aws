import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 transform transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setOpen(false)} />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6">
          <button onClick={() => setOpen(true)} className="lg:hidden p-2 rounded-md hover:bg-gray-100">
            <Menu size={20} />
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

          <div className="ml-auto flex items-center gap-3">
            {/* Mobile search icon */}
            <button onClick={() => setSearchOpen(true)} className="sm:hidden p-2 rounded-md hover:bg-gray-100">
              <Search size={20} className="text-gray-500" />
            </button>
            {/* Notification bell */}
            <button className="relative p-2 rounded-md hover:bg-gray-100" onClick={() => window.location.href='/admin/notificacoes'}>
              <Bell size={20} className="text-gray-500" />
              {counts.notificacoes > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center px-1 text-[10px] font-bold bg-red-500 text-white rounded-full">
                  {counts.notificacoes > 99 ? '99+' : counts.notificacoes}
                </span>
              )}
            </button>
            <span className="hidden md:inline text-sm text-gray-600">Olá, <strong>{user?.email?.split('@')[0]}</strong></span>
            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)} className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-medium hover:ring-2 hover:ring-orange-300 transition-all">
                {(user?.email || 'U').charAt(0).toUpperCase()}
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-10 z-50 w-64 bg-white rounded-xl border shadow-lg py-2">
                    <div className="px-4 py-3 border-b">
                      <p className="text-sm font-medium text-gray-900">{user?.email?.split('@')[0]}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Perfil: {user?.role === 'admin' ? 'Administrador' : 'Cliente'}</p>
                    </div>
                    <button onClick={() => { setProfileOpen(false); window.location.href='/admin/meu-perfil'; }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <UserIcon size={14} /> Meus Dados
                    </button>
                    <button onClick={() => { setProfileOpen(false); window.location.href='/admin/trocar-senha'; }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <Lock size={14} /> Trocar Senha
                    </button>
                    <div className="border-t mt-1 pt-1">
                      <button onClick={() => { setProfileOpen(false); logout(); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                        <LogOut size={14} /> Sair
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-16 lg:pb-6">
          <div className="max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom Navigation (mobile only) */}
      <BottomNav />

      {/* Global Search Modal */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
