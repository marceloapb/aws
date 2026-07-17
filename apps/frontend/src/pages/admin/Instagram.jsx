import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Instagram as InstagramIcon, Image, Calendar, Eye, Users, Heart, TrendingUp, Hash, Send } from 'lucide-react';

const ACCENT = '#EA580C';
const TABS = ['Feed/Posts', 'Nova Publicação', 'Insights'];
const STATUS_MAP = { publicado: 'bg-green-100 text-green-700', agendado: 'bg-blue-100 text-blue-700', erro: 'bg-red-100 text-red-700' };
const HASHTAGS_SUGERIDAS = ['#fotografia', '#ensaio', '#retrato', '#lifestyle', '#amor', '#brasil', '#photographer'];

export default function Instagram() {
  const { authFetch } = useAuth();
  const [tab, setTab] = useState(0);
  const [posts, setPosts] = useState([]);
  const [insights, setInsights] = useState(null);
  const [albuns, setAlbuns] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [caption, setCaption] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [expandedPost, setExpandedPost] = useState(null);

  useEffect(() => {
    authFetch('/admin/instagram').then(r => r.json()).then(d => Array.isArray(d) && setPosts(d)).catch(() => {});
    authFetch('/admin/instagram/insights').then(r => r.json()).then(setInsights).catch(() => {});
    authFetch('/admin/albuns').then(r => r.json()).then(d => Array.isArray(d) && setAlbuns(d)).catch(() => {});
  }, []);

  const handlePublish = async (agendar) => {
    if (!selectedPhoto || !caption.trim()) return;
    setPublishing(true);
    try {
      await authFetch('/admin/instagram/publicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrl: selectedPhoto, caption,
          ...(agendar && scheduleDate ? { scheduledDate: scheduleDate } : {}),
        }),
      });
      setSelectedPhoto(null); setCaption(''); setScheduleDate('');
      const res = await authFetch('/admin/instagram');
      const data = await res.json();
      if (Array.isArray(data)) setPosts(data);
      setTab(0);
    } catch {}
    setPublishing(false);
  };

  const addHashtag = (tag) => {
    if (caption.length + tag.length + 1 <= 2200)
      setCaption(prev => prev + (prev ? ' ' : '') + tag);
  };

  const allPhotos = albuns.flatMap(a =>
    (a.fotos || a.photos || []).map(f => ({ ...f, albumName: a.nome || a.name }))
  );

  // ─── Feed/Posts ──────────────────────────────────────────────
  const renderFeed = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {posts.length === 0 && <p className="col-span-full text-center text-gray-400 py-12">Nenhuma publicação encontrada</p>}
      {posts.map(post => (
        <div key={post.id} onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
          <div className="aspect-square bg-gray-100 relative">
            {post.thumbnail || post.photoUrl
              ? <img src={post.thumbnail || post.photoUrl} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Image size={32} className="text-gray-300" /></div>}
            <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_MAP[post.status] || 'bg-gray-100 text-gray-600'}`}>
              {post.status || 'rascunho'}
            </span>
          </div>
          <div className="p-3">
            <p className="text-sm text-gray-800 line-clamp-2">{post.caption || 'Sem legenda'}</p>
            <p className="text-xs text-gray-400 mt-1">
              {post.date ? new Date(post.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
            </p>
            {expandedPost === post.id && (
              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-xs text-gray-500">Impressões</p><p className="text-sm font-bold">{post.impressions ?? '—'}</p></div>
                <div><p className="text-xs text-gray-500">Alcance</p><p className="text-sm font-bold">{post.reach ?? '—'}</p></div>
                <div><p className="text-xs text-gray-500">Engajamento</p><p className="text-sm font-bold">{post.engagement ?? '—'}</p></div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // ─── Nova Publicação ─────────────────────────────────────────
  const renderPublicar = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        {/* Seleção de foto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Selecionar Foto</label>
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {allPhotos.length === 0 && <p className="col-span-4 text-sm text-gray-400 text-center py-4">Nenhum álbum encontrado</p>}
            {allPhotos.map((photo, i) => (
              <div key={photo.id || i} onClick={() => setSelectedPhoto(photo.url)}
                className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition ${
                  selectedPhoto === photo.url ? 'border-orange-500 ring-2 ring-orange-200' : 'border-transparent hover:border-gray-300'}`}>
                <img src={photo.url || photo.thumbnail} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
        {/* Caption */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
          <textarea value={caption} onChange={e => e.target.value.length <= 2200 && setCaption(e.target.value)}
            rows={5} placeholder="Escreva a legenda..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none" />
          <p className="text-xs text-gray-400 text-right">{caption.length}/2200</p>
        </div>
        {/* Hashtags sugeridas */}
        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-2"><Hash size={14} /> Hashtags sugeridas</label>
          <div className="flex flex-wrap gap-2">
            {HASHTAGS_SUGERIDAS.map(tag => (
              <button key={tag} type="button" onClick={() => addHashtag(tag)}
                className="px-3 py-1 text-xs rounded-full border border-gray-300 hover:border-orange-400 hover:bg-orange-50 transition">
                {tag}
              </button>
            ))}
          </div>
        </div>
        {/* Agendamento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
            <Calendar size={14} /> Agendar (opcional)
          </label>
          <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
        </div>
        {/* Botões */}
        <div className="flex gap-3">
          <button onClick={() => handlePublish(false)} disabled={publishing || !selectedPhoto || !caption.trim()}
            style={{ background: ACCENT }}
            className="flex-1 py-2.5 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            <Send size={16} /> Publicar Agora
          </button>
          <button onClick={() => handlePublish(true)} disabled={publishing || !selectedPhoto || !caption.trim() || !scheduleDate}
            style={{ borderColor: ACCENT, color: ACCENT }}
            className="flex-1 py-2.5 border-2 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2">
            <Calendar size={16} /> Agendar
          </button>
        </div>
      </div>
      {/* Preview mockup */}
      <div className="flex justify-center">
        <div className="w-80 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 p-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500" />
            <span className="text-sm font-medium">seu_perfil</span>
          </div>
          <div className="aspect-square bg-gray-100">
            {selectedPhoto
              ? <img src={selectedPhoto} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Image size={48} className="text-gray-300" /></div>}
          </div>
          <div className="p-3">
            <div className="flex gap-3 mb-2">
              <Heart size={20} className="text-gray-700" />
              <Send size={20} className="text-gray-700" />
            </div>
            <p className="text-sm">
              <span className="font-medium">seu_perfil </span>
              {caption || 'Sua legenda aqui...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Insights ────────────────────────────────────────────────
  const renderInsights = () => {
    const kpis = [
      { icon: Image, label: 'Total Posts', value: insights?.totalPosts ?? posts.length },
      { icon: Eye, label: 'Alcance Total', value: insights?.totalReach ?? 0 },
      { icon: TrendingUp, label: 'Engajamento Médio', value: insights?.avgEngagement ?? 0 },
      { icon: Users, label: 'Seguidores', value: insights?.followers ?? 0 },
    ];
    const last7 = (insights?.last7 || posts.slice(0, 7)).map(p => ({
      label: p.date ? new Date(p.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—',
      value: p.engagement || p.reach || 0,
    }));
    const maxVal = Math.max(...last7.map(p => p.value), 1);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className="text-gray-400" />
                <span className="text-sm text-gray-500">{label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
              </p>
            </div>
          ))}
        </div>
        {/* Gráfico de barras puro CSS */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Performance — Últimos 7 Posts</h3>
          <div className="flex items-end gap-3 h-40">
            {last7.length === 0 && <p className="text-gray-400 text-sm w-full text-center">Sem dados disponíveis</p>}
            {last7.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-gray-700">{item.value}</span>
                <div className="w-full rounded-t-md" style={{ height: `${(item.value / maxVal) * 100}%`, background: ACCENT, minHeight: 4 }} />
                <span className="text-xs text-gray-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <InstagramIcon size={24} style={{ color: ACCENT }} />
        <h1 className="text-2xl font-bold text-gray-900">Instagram</h1>
      </div>
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === i ? 'border-orange-600 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 0 && renderFeed()}
      {tab === 1 && renderPublicar()}
      {tab === 2 && renderInsights()}
    </div>
  );
}
