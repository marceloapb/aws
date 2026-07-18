import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * NotificacaoBell — Bell icon with dropdown for header/Layout
 * Polls unread count every 30s, shows last 20 notifications in dropdown
 */
export default function NotificacaoBell() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  // Poll unread count every 30 seconds
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await authFetch('/admin/notificacoes/nao-lidas/count');
      const data = await res.json();
      if (data.success) {
        setUnreadCount(data.data?.count ?? data.count ?? 0);
      }
    } catch {
      // Silently fail on polling errors
    }
  }, [authFetch]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch latest notifications when dropdown opens
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/admin/notificacoes?limit=20');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Mark single notification as read and navigate
  const handleNotificationClick = async (notif) => {
    try {
      await authFetch(`/admin/notificacoes/${notif.id}/lida`, { method: 'PATCH' });
      setNotifications(prev =>
        prev.map(n => (n.id === notif.id ? { ...n, lida: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // Continue with navigation even if marking fails
    }

    setIsOpen(false);

    if (notif.deep_link) {
      navigate(notif.deep_link);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await authFetch('/admin/notificacoes/marcar-todas-lidas', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  };

  // Format relative time
  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Truncate text
  const truncate = (text, maxLength = 80) => {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={bellRef}
        onClick={handleBellClick}
        className="relative p-2 rounded-md hover:bg-gray-100 transition-colors"
        aria-label="Notificações"
      >
        <Bell size={20} className="text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center px-1 text-[10px] font-bold bg-red-500 text-white rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-11 z-50 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-gray-900">Notificações</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
              >
                <Check size={12} />
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-200 mt-2 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                    !notif.lida ? 'bg-blue-50/30' : ''
                  }`}
                >
                  {/* Unread indicator */}
                  <div className="mt-1.5 shrink-0">
                    {!notif.lida ? (
                      <span className="block w-2 h-2 rounded-full bg-blue-500" />
                    ) : (
                      <span className="block w-2 h-2 rounded-full bg-transparent" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight ${!notif.lida ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {notif.titulo}
                    </p>
                    {notif.corpo && (
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {truncate(notif.corpo)}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {timeAgo(notif.created_at || notif.created)}
                    </p>
                  </div>

                  {/* Deep link indicator */}
                  {notif.deep_link && (
                    <ExternalLink size={12} className="text-gray-300 shrink-0 mt-1" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2.5">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/admin/notificacoes');
              }}
              className="w-full text-center text-sm font-medium text-orange-600 hover:text-orange-700 py-1"
            >
              Ver todas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
