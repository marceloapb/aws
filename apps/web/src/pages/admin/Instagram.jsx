import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { formatarData } from '../../lib/formatters.js';
import PageHeader from '../../components/PageHeader.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function Instagram() {
  const [publicacoes, setPublicacoes] = useState([]);
  const [albuns, setAlbuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ album_id: '', caption: '', agendar_para: '' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [pubRes, albRes] = await Promise.all([
        api.get('/admin/instagram/publicacoes'),
        api.get('/admin/albuns'),
      ]);
      setPublicacoes(pubRes.data || []);
      setAlbuns(albRes.data || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.post('/admin/instagram/agendar', form);
      setShowModal(false);
      setForm({ album_id: '', caption: '', agendar_para: '' });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function publicarAgora(id) {
    try {
      await api.post(`/admin/instagram/publicar/${id}`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader
        title="Instagram"
        subtitle="Publicações automáticas"
        actions={
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 text-sm font-medium">
            + Nova Publicação
          </button>
        }
      />

      <div className="space-y-3">
        {publicacoes.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-4xl mb-2">📱</p>
            <p className="text-gray-500">Nenhuma publicação agendada</p>
          </div>
        ) : publicacoes.map((pub) => (
          <div key={pub.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {pub.thumbnail_url && <img src={pub.thumbnail_url} alt="" className="w-12 h-12 rounded object-cover" />}
              <div>
                <p className="font-medium text-sm">{pub.caption?.substring(0, 60)}...</p>
                <p className="text-xs text-gray-500">
                  {pub.tipo === 'carrossel' ? `🎠 Carrossel (${pub.total_fotos} fotos)` : '📷 Foto única'}
                  {pub.agendar_para && ` • Agendado: ${formatarData(pub.agendar_para)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={pub.status} />
              {pub.status === 'agendado' && (
                <button onClick={() => publicarAgora(pub.id)} className="px-2 py-1 bg-pink-600 text-white rounded text-xs">
                  Publicar Agora
                </button>
              )}
              {pub.instagram_permalink && (
                <a href={pub.instagram_permalink} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-600 hover:underline">Ver no IG ↗</a>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Nova Publicação Instagram</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Álbum *</label>
                <select value={form.album_id} onChange={(e) => setForm({ ...form, album_id: e.target.value })} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option value="">Selecione...</option>
                  {albuns.map((a) => <option key={a.id} value={a.id}>{a.titulo} ({a.total_fotos} fotos)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Legenda *</label>
                <textarea value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} required rows={4} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Escreva a legenda..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Agendar para (opcional)</label>
                <input type="datetime-local" value={form.agendar_para} onChange={(e) => setForm({ ...form, agendar_para: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-pink-600 rounded-md">Agendar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
