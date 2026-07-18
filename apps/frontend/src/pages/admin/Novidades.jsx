import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import {
  Newspaper, Plus, Search, Edit, Trash2, Calendar,
  Image, Clock, Loader2
} from 'lucide-react';

const ACCENT = '#EA580C';

const STATUS_MAP = {
  rascunho: { label: 'Rascunho', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  publicado: { label: 'Publicado', color: 'text-green-700 bg-green-50 border-green-200' },
  agendado: { label: 'Agendado', color: 'text-blue-700 bg-blue-50 border-blue-200' },
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function truncate(text, max = 100) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export default function Novidades() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Schedule modal
  const [scheduleTarget, setScheduleTarget] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduling, setScheduling] = useState(false);

  // Debounce ref
  const debounceRef = useRef(null);

  const loadPosts = useCallback(async (pageNum = 1, searchTerm = '') => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      let url;
      if (searchTerm.trim()) {
        url = `/admin/novidades/busca?q=${encodeURIComponent(searchTerm)}&page=${pageNum}`;
      } else {
        url = `/admin/novidades?page=${pageNum}`;
      }

      const res = await authFetch(url);
      const json = await res.json();

      if (res.ok) {
        const data = json.data || json.posts || json || [];
        const items = Array.isArray(data) ? data : [];
        if (pageNum === 1) {
          setPosts(items);
        } else {
          setPosts(prev => [...prev, ...items]);
        }
        setHasMore(json.hasMore || json.has_more || items.length >= 20);
        setPage(pageNum);
      } else {
        toast.error(json.message || 'Erro ao carregar posts');
      }
    } catch {
      toast.error('Erro de conexão ao carregar posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [authFetch, toast]);

  useEffect(() => {
    loadPosts(1, '');
  }, []);

  // Debounced search
  const handleSearchChange = (value) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadPosts(1, value);
    }, 500);
  };

  const handleLoadMore = () => {
    loadPosts(page + 1, search);
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await authFetch(`/admin/novidades/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== deleteTarget.id));
        toast.success('Post excluído com sucesso');
      } else {
        const json = await res.json();
        toast.error(json.message || 'Erro ao excluir post');
      }
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Schedule
  const handleSchedule = async () => {
    if (!scheduleTarget || !scheduleDate) return;
    try {
      setScheduling(true);
      const res = await authFetch(`/admin/novidades/${scheduleTarget.id}/agendar`, {
        method: 'POST',
        body: JSON.stringify({ publicar_em: scheduleDate }),
      });
      if (res.ok) {
        setPosts(prev => prev.map(p =>
          p.id === scheduleTarget.id ? { ...p, status: 'agendado', publicar_em: scheduleDate } : p
        ));
        toast.success('Post agendado com sucesso');
      } else {
        const json = await res.json();
        toast.error(json.message || 'Erro ao agendar post');
      }
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setScheduling(false);
      setScheduleTarget(null);
      setScheduleDate('');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: ACCENT + '15' }}>
            <Newspaper size={22} style={{ color: ACCENT }} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Novidades</h1>
          {posts.length > 0 && (
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
              {posts.length}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/admin/novidades/novo')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium text-sm shadow-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: ACCENT }}
        >
          <Plus size={18} />
          Novo Post
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar posts por título ou conteúdo..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:border-transparent"
          style={{ '--tw-ring-color': ACCENT + '40' }}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <Newspaper size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-1">Nenhum post encontrado</h3>
          <p className="text-sm text-gray-400 mb-4">
            {search ? 'Tente buscar por outro termo.' : 'Crie seu primeiro post para começar.'}
          </p>
          {!search && (
            <button
              onClick={() => navigate('/admin/novidades/novo')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: ACCENT }}
            >
              <Plus size={16} />
              Criar Post
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Posts list */}
          <div className="space-y-3">
            {posts.map(post => {
              const status = STATUS_MAP[post.status] || STATUS_MAP.rascunho;
              const date = post.publicado_em || post.criado_em || post.createdAt;
              return (
                <div
                  key={post.id}
                  onClick={() => navigate(`/admin/novidades/${post.id}/editar`)}
                  className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm cursor-pointer transition-all group"
                >
                  {/* Thumbnail */}
                  {post.capa_url ? (
                    <div className="hidden sm:block w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      <img
                        src={post.capa_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="hidden sm:flex w-20 h-20 rounded-lg bg-gray-50 items-center justify-center flex-shrink-0">
                      <Image size={24} className="text-gray-300" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                        {post.titulo || 'Sem título'}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border whitespace-nowrap ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {truncate(post.resumo)}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(date)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/novidades/${post.id}/editar`); }}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    {post.status === 'rascunho' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setScheduleTarget(post); }}
                        className="p-2 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600"
                        title="Agendar"
                      >
                        <Calendar size={16} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(post); }}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Carregando...
                  </>
                ) : (
                  'Carregar mais'
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir Post"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {deleting && <Loader2 size={14} className="animate-spin" />}
              Excluir
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Tem certeza que deseja excluir o post <strong>"{deleteTarget?.titulo}"</strong>?
          Esta ação não pode ser desfeita.
        </p>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        isOpen={!!scheduleTarget}
        onClose={() => { setScheduleTarget(null); setScheduleDate(''); }}
        title="Agendar Publicação"
        size="sm"
        footer={
          <>
            <button
              onClick={() => { setScheduleTarget(null); setScheduleDate(''); }}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSchedule}
              disabled={scheduling || !scheduleDate}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
              style={{ backgroundColor: ACCENT }}
            >
              {scheduling && <Loader2 size={14} className="animate-spin" />}
              Agendar
            </button>
          </>
        }
      >
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Selecione a data e hora para publicar <strong>"{scheduleTarget?.titulo}"</strong>.
          </p>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data e hora de publicação
          </label>
          <input
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': ACCENT + '40' }}
          />
        </div>
      </Modal>
    </div>
  );
}
