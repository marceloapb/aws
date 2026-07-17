import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Mail, Shield, Calendar } from 'lucide-react';

const ACCENT = '#EA580C';

export default function MeuPerfil() {
  const { user } = useAuth();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <User size={24} style={{ color: ACCENT }} />
        <h1 className="text-2xl font-bold text-gray-900">Meus Dados</h1>
      </div>

      <div className="bg-white rounded-xl border p-6 max-w-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-orange-500 text-white flex items-center justify-center text-2xl font-bold">
            {(user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{user?.email?.split('@')[0]}</p>
            <p className="text-sm text-gray-500">{user?.role === 'admin' ? 'Administrador' : 'Cliente'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 py-3 border-b">
            <Mail size={16} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-3 border-b">
            <Shield size={16} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Perfil de Acesso</p>
              <p className="text-sm font-medium text-gray-900">{user?.role === 'admin' ? 'Administrador' : 'Cliente'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-3 border-b">
            <Calendar size={16} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">ID do Usuário</p>
              <p className="text-sm font-mono text-gray-600">{user?.sub || user?.id || '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
