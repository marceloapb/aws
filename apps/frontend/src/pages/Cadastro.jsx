import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Camera } from 'lucide-react';

const ACCENT = '#EA580C';

export default function Cadastro() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Senhas não conferem');
    if (form.password.length < 6) return setError('Senha deve ter pelo menos 6 caracteres');
    try {
      await register(form.name, form.email, form.password, form.phone);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Cadastro realizado!</h2>
          <p className="text-gray-500 mt-2">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Camera size={32} style={{ color: ACCENT }} />
            <span className="text-2xl font-bold text-gray-900">MBFoto</span>
          </div>
          <p className="text-gray-500 text-sm">Crie sua conta de cliente</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
            <input name="name" value={form.name} onChange={handleChange} required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="(11) 99999-9999"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
            <input type="password" name="confirm" value={form.confirm} onChange={handleChange} required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none" />
          </div>

          <button type="submit" disabled={loading} style={{ background: ACCENT }}
            className="w-full py-2.5 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
            {loading ? 'Cadastrando...' : 'Criar conta'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Já tem conta? <Link to="/login" className="font-medium" style={{ color: ACCENT }}>Fazer login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
