import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Instagram as InstagramIcon, Plus, Calendar, Eye, Users, Heart, X, Image } from 'lucide-react';

const ACCENT = '#EA580C';

const STATUS_COLORS = {
  publicado: 'bg-green-100 text-green-700',
  agendado: 'bg-blue-100 text-blue-700',
  rascunho: 'bg-gray-100 text-gray-600',
};

export default function Instagram() {
  const { authFetch } = useAuth();
  const [posts, setPosts] = useState([]);
  const [insights, setInsights] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ photo: '', caption: '', scheduledDate: '' });
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadPosts();
    loadInsights();
    loadAlbums();
  }, []);

  const loadPosts = async () => {
    try {
      const res = await authFetch('/admin/instagram/posts');
      const data = await res.json();
      if (Array.isArray(data)) setPosts(data);
    } catch {}
  };

  const loadInsights = async () => {
    try {
      const res = await authFetch('/admin/instagram/insights');
      const data = await res.json();
      setInsights(data);
    } catch {}
  };

  const loadAlbums = async () => {
    try {
      const res = await authFetch('/admin/albuns');
      const data = await res.json();
      if (Array.isArray(data)) setAlbums(data);
    } catch {}
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    setPublishing(true);
    try {
      const payload = {
        photoUrl: form.photo,
        caption: form.caption,
        ...(form.scheduledDate ? { scheduledDate: form.scheduledDate } : {}),
      };
      await authFetch('/admin/instagram/posts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setShowModal(false);
      setForm({ photo: '', caption: '', scheduledDate: '' });
      loadPosts();
    } catch {}
    setPublishing(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <InstagramIcon size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Instagram</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: ACCENT }}
          className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Plus size={16} /> Nova Publicação
        </button>
      </div>

      {/* Insights */}
      {insights && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Eye size={16} className="text-gray-400" />
              <span className="text-sm text-gray-500">Impressões</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{(insights.impressions || 0).toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} className="text-gray-400" />
              <span className="text-sm text-gray-500">Alcance</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{(insights.reach || 0).toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Heart size={16} className="text-gray-400" />
              <span className="text-sm text-gray-500">Engajamento</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{(insights.engagement || 0).toLocaleString('pt-BR')}</p>
          </div>
        </div>
      )}

      {/* Posts List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {posts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhuma publicação encontrada</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {posts.map((post) => (
              <div key={post.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {post.thumbnail ? (
                    <img src={post.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image size={20} className="text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{post.caption || 'Sem legenda'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {post.date ? new Date(post.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[post.status] || 'bg-gray-100 text-gray-600'}`}>
                  {post.status || 'rascunho'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Nova Publicação */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Nova Publicação</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={handlePublish} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto do Álbum</label>
                <select
                  value={form.photo}
                  onChange={(e) => setForm({ ...form, photo: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="">Selecione uma foto...</option>
                  {albums.map((album) => (
                    <optgroup key={album.id} label={album.name}>
                      {(album.photos || []).map((photo) => (
                        <option key={photo.id || photo.url} value={photo.url}>
                          {photo.name || photo.url}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Legenda</label>
                <textarea
                  value={form.caption}
                  onChange={(e) => setForm({ ...form, caption: e.target.value })}
                  rows={4}
                  placeholder="Escreva a legenda do post..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="flex items-center gap-1"><Calendar size={14} /> Agendar (opcional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduledDate}
                  onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={publishing}
                style={{ background: ACCENT }}
                className="w-full py-2.5 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
              >
                {form.scheduledDate ? 'Agendar' : 'Publicar Agora'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
