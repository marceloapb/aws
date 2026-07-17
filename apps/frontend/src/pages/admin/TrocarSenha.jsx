import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, Eye, EyeOff } from 'lucide-react';

const ACCENT = '#EA580C';

export default function TrocarSenha() {
  const { authFetch } = useAuth();
  const [form, setForm] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' });
  const [showSenha, setShowSenha] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });

    if (form.novaSenha.length < 8) { setMsg({ type: 'error', text: 'A nova senha deve ter no mínimo 8 caracteres' }); return; }
    if (form.novaSenha !== form.confirmar) { setMsg({ type: 'error', text: 'As senhas não coincidem' }); return; }
    if (!/[A-Z]/.test(form.novaSenha) || !/[0-9]/.test(form.novaSenha) || !/[!@#$%]/.test(form.novaSenha)) {
      setMsg({ type: 'error', text: 'A senha deve conter: maiúscula, número e caractere especial (!@#$%)' }); return;
    }

    setSaving(true);
    try {
      const res = await authFetch('/auth/trocar-senha', {
        method: 'POST',
        body: JSON.stringify({ senhaAtual: form.senhaAtual, novaSenha: form.novaSenha }),
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
        setForm({ senhaAtual: '', novaSenha: '', confirmar: '' });
      } else {
        setMsg({ type: 'error', text: json.message || 'Erro ao alterar senha' });
      }
    } catch { setMsg({ type: 'error', text: 'Erro ao alterar senha' }); }
    setSaving(false);
  };

  const toggle = (field) => setShowSenha(prev => ({ ...prev, [field]: !prev[field] }));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Lock size={24} style={{ color: ACCENT }} />
        <h1 className="text-2xl font-bold text-gray-900">Trocar Senha</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 max-w-md space-y-4">
        {msg.text && (
          <div className={`p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {msg.text}
          </div>
        )}

        {[
          { key: 'senhaAtual', label: 'Senha Atual' },
          { key: 'novaSenha', label: 'Nova Senha' },
          { key: 'confirmar', label: 'Confirmar Nova Senha' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="relative">
              <input
                type={showSenha[key] ? 'text' : 'password'}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200 pr-10"
              />
              <button type="button" onClick={() => toggle(key)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                {showSenha[key] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        ))}

        <p className="text-xs text-gray-400">Mínimo 8 caracteres, com maiúscula, número e caractere especial (!@#$%)</p>

        <button type="submit" disabled={saving} style={{ background: ACCENT }}
          className="w-full px-4 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {saving ? 'Salvando...' : 'Alterar Senha'}
        </button>
      </form>
    </div>
  );
}
