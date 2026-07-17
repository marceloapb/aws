import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import GlobalSearch from './search/GlobalSearch';
import { useAuth } from '../contexts/AuthContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { Menu, Search, Bell } from 'lucide-react';

export default function Layout() {
  const [open, setOpen] = React.useState(false);
  const { user } = useAuth();
  const { isOpen: searchOpen, setIsOpen: setSearchOpen } = useKeyboardShortcuts();

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
          <button onClick={() => setOpen(true)} className="hidden md:block lg:hidden p-2 rounded-md hover:bg-gray-100">
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
            <button className="relative p-2 rounded-md hover:bg-gray-100" onClick={() => window.location.href='/admin/whatsapp'}>
              <Bell size={20} className="text-gray-500" />
            </button>
            <span className="hidden sm:inline text-sm text-gray-600">Olá, <strong>{user?.email?.split('@')[0]}</strong></span>
            <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-medium">
              {(user?.email || 'U').charAt(0).toUpperCase()}
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
