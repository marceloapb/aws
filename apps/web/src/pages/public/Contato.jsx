import { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';

export default function Contato() {
  const { photographerId } = useParams();
  const [searchParams] = useSearchParams();
  const pacoteInteresse = searchParams.get('pacote') || '';

  const [form, setForm] = useState({ nome: '', email: '', telefone: '', mensagem: '', pacoteInteresse });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/public/contato', { ...form, photographerId });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-2">Mensagem enviada!</h2>
          <p className="text-gray-600 mb-6">Entraremos em contato em breve.</p>
          <Link to={`/site/${photographerId}`} className="text-blue-600 hover:underline">← Voltar ao site</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-6">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Contato</h1>
          <Link to={`/site/${photographerId}`} className="text-blue-600 hover:underline">← Voltar</Link>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input type="text" required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input type="tel" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          </div>
          {pacoteInteresse && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pacote de interesse</label>
              <input type="text" value={form.pacoteInteresse} onChange={e => setForm({ ...form, pacoteInteresse: e.target.value })} className="w-full border rounded-lg px-3 py-2 bg-gray-50" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem *</label>
            <textarea required rows={4} value={form.mensagem} onChange={e => setForm({ ...form, mensagem: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50">
            {loading ? 'Enviando...' : 'Enviar mensagem'}
          </button>
        </form>
      </div>
    </div>
  );
}
