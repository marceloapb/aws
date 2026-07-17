import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Camera, Plus, Edit2, Trash2, X, CheckSquare, ClipboardList } from 'lucide-react';

const ACCENT = '#EA580C';

const STATUS_OPTIONS = [
  { value: 'disponivel', label: 'Disponível', color: 'bg-green-100 text-green-700' },
  { value: 'em_uso', label: 'Em Uso', color: 'bg-blue-100 text-blue-700' },
  { value: 'manutencao', label: 'Manutenção', color: 'bg-yellow-100 text-yellow-700' },
];

export default function Equipamentos() {
  const { authFetch } = useAuth();
  const [equipamentos, setEquipamentos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', serialNumber: '', status: 'disponivel' });
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistForm, setChecklistForm] = useState({ eventType: '', eventId: '' });
  const [checklists, setChecklists] = useState([]);
  const [generatedChecklist, setGeneratedChecklist] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    loadEquipamentos();
    loadChecklists();
    loadEvents();
  }, []);

  const loadEquipamentos = async () => {
    try {
      const res = await authFetch('/admin/equipamentos');
      const data = await res.json();
      if (Array.isArray(data)) setEquipamentos(data);
    } catch {}
  };

  const loadChecklists = async () => {
    try {
      const res = await authFetch('/admin/equipamentos/checklists');
      const data = await res.json();
      if (Array.isArray(data)) setChecklists(data);
    } catch {}
  };

  const loadEvents = async () => {
    try {
      const res = await authFetch('/admin/agenda');
      const data = await res.json();
      if (Array.isArray(data)) setEvents(data);
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const path = editing ? `/admin/equipamentos/${editing.id}` : '/admin/equipamentos';
    await authFetch(path, { method, body: JSON.stringify(form) });
    setShowModal(false);
    setEditing(null);
    setForm({ name: '', category: '', serialNumber: '', status: 'disponivel' });
    loadEquipamentos();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este equipamento?')) return;
    await authFetch(`/admin/equipamentos/${id}`, { method: 'DELETE' });
    loadEquipamentos();
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name, category: item.category, serialNumber: item.serialNumber || '', status: item.status });
    setShowModal(true);
  };

  const handleGenerateChecklist = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch(`/equipamentos/checklists/generate`, {
        method: 'POST',
        body: JSON.stringify({ eventType: checklistForm.eventType, eventId: checklistForm.eventId }),
      });
      const data = await res.json();
      setGeneratedChecklist(data);
    } catch {}
  };

  const getStatusBadge = (status) => {
    const opt = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${opt.color}`}>{opt.label}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Camera size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Equipamentos</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChecklist(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ClipboardList size={16} /> Gerar Checklist
          </button>
          <button
            onClick={() => { setEditing(null); setForm({ name: '', category: '', serialNumber: '', status: 'disponivel' }); setShowModal(true); }}
            style={{ background: ACCENT }}
            className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90"
          >
            <Plus size={16} /> Novo Equipamento
          </button>
        </div>
      </div>

      {/* Equipment List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {equipamentos.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhum equipamento cadastrado</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nº Série</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {equipamentos.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{item.serialNumber || '—'}</td>
                  <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
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

      {/* Checklists por tipo */}
      {checklists.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckSquare size={18} style={{ color: ACCENT }} /> Checklists por Tipo de Evento
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {checklists.map((cl) => (
              <div key={cl.id || cl.eventType} className="border border-gray-200 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900">{cl.eventType}</p>
                <p className="text-xs text-gray-500 mt-1">{(cl.items || []).length} itens</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal CRUD */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? 'Editar' : 'Novo'} Equipamento</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required
                  placeholder="Ex: Câmera, Lente, Iluminação"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Série</label>
                <input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none">
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <button type="submit" style={{ background: ACCENT }}
                className="w-full py-2.5 text-white rounded-lg font-medium hover:opacity-90">
                {editing ? 'Salvar' : 'Criar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gerar Checklist */}
      {showChecklist && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Gerar Checklist</h2>
              <button onClick={() => { setShowChecklist(false); setGeneratedChecklist(null); }} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleGenerateChecklist} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Evento</label>
                <select value={checklistForm.eventType} onChange={(e) => setChecklistForm({ ...checklistForm, eventType: e.target.value })} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none">
                  <option value="">Selecione...</option>
                  <option value="casamento">Casamento</option>
                  <option value="ensaio">Ensaio</option>
                  <option value="aniversario">Aniversário</option>
                  <option value="corporativo">Corporativo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Evento</label>
                <select value={checklistForm.eventId} onChange={(e) => setChecklistForm({ ...checklistForm, eventId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none">
                  <option value="">Selecione um evento (opcional)...</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title} - {ev.date}</option>
                  ))}
                </select>
              </div>
              <button type="submit" style={{ background: ACCENT }}
                className="w-full py-2.5 text-white rounded-lg font-medium hover:opacity-90">
                Gerar Checklist
              </button>
            </form>

            {generatedChecklist && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Checklist Gerado</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(generatedChecklist.items || []).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckSquare size={14} className="text-gray-400 flex-shrink-0" />
                      <span>{item.name || item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
