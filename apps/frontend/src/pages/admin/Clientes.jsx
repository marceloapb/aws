import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Plus, Search, MessageCircle, Eye } from 'lucide-react';

const ACCENT = '#EA580C';

export default function Clientes() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await authFetch('/admin/clientes');
      const json = await res.json();
      if (json.success) {
        setClientes(json.data || []);
        setPagination(json.pagination || {});
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = clientes.filter(c =>
    (c.nome || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.telefone || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatPhone = (phone) => {
    if (!phone) return '-';
    return phone.replace(/\D/g, '');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <span className="text-sm text-gray-500">({filtered.length})</span>
        </div>
        <button
          onClick={() => navigate('/admin/clientes/novo')}
          style={{ background: ACCENT }}
          className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome, email ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {search ? 'Nenhum cliente encontrado para essa busca.' : 'Nenhum cliente cadastrado.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Telefone</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">WhatsApp</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cidade</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Último Job</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total Jobs</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.email || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.telefone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.whatsapp || c.telefone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {c.endereco?.cidade || c.cidade || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {c.ultimo_job ? new Date(c.ultimo_job).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-center">
                      {c.total_jobs || 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {(c.whatsapp || c.telefone) && (
                          <a
                            href={`https://wa.me/${formatPhone(c.whatsapp || c.telefone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-600"
                            title="WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </a>
                        )}
                        <button
                          onClick={() => navigate(`/admin/clientes/${c.id}`)}
                          className="p-1.5 rounded-lg hover:bg-orange-50"
                          style={{ color: ACCENT }}
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
