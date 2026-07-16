import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Package, Plus, Edit2, Trash2, X } from 'lucide-react';

const ACCENT = '#EA580C';

export default function Catalogo() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', price: '', description: '', type: 'item' });
  const [tab, setTab] = useState('itens');

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    try {
      const res = await authFetch('/catalog');
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const path = editing ? `/catalog/${editing.id}` : '/catalog';
    await authFetch(path, { method, body: JSON.stringify({ ...form, price: Number(form.price) }) });
    setShowModal(false);
    setEditing(null);
    setForm({ name: '', category: '', price: '', description: '', type: 'item' });
    loadItems();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este item?')) return;
    await authFetch(`/catalog/${id}`, { method: 'DELETE' });
    loadItems();
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name, category: item.category, price: item.price, description: item.description || '', type: item.type || 'item' });
    setShowModal(true);
  };

  const filtered = items.filter(i => tab === 'itens' ? i.type !== 'package' : i.type === 'package');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Catálogo</h1>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', category: '', price: '', description: '', type: tab === 'itens' ? 'item' : 'package' }); setShowModal(true); }}
          style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Novo {tab === 'itens' ? 'Item' : 'Pacote'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        {['itens', 'pacotes'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'itens' ? 'Itens' : 'Pacotes'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhum {tab === 'itens' ? 'item' : 'pacote'} cadastrado</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Preço</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">R$ {Number(item.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 ml-1"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? 'Editar' : 'Novo'} {form.type === 'item' ? 'Item' : 'Pacote'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <input value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none" placeholder="Ex: Casamento, Ensaio" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                <input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none resize-none" />
              </div>
              <button type="submit" style={{ background: ACCENT }}
                className="w-full py-2.5 text-white rounded-lg font-medium hover:opacity-90">
                {editing ? 'Salvar' : 'Criar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
