import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Package, ClipboardList, CheckSquare, Plus, Trash2, Edit, X } from 'lucide-react';

const ACCENT = '#EA580C';
const CATEGORIAS = ['Câmera', 'Lente', 'Flash', 'Tripod', 'Drone', 'Outros'];
const STATUS_OPTIONS = ['disponível', 'em_uso', 'manutenção'];
const TIPOS_EVENTO = ['Casamento', 'Ensaio', 'Aniversário', 'Corporativo', 'Batizado', 'Outros'];
const STATUS_COLORS = { disponível: 'bg-green-100 text-green-800', em_uso: 'bg-blue-100 text-blue-800', manutenção: 'bg-yellow-100 text-yellow-800' };

export default function Equipamentos() {
  const { authFetch } = useAuth();
  const [tab, setTab] = useState(0);
  const [equipamentos, setEquipamentos] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    const [eq, md, cl] = await Promise.all([
      authFetch('/admin/equipamentos').then(r => r.json()).catch(() => []),
      authFetch('/admin/equipamentos/checklists').then(r => r.json()).catch(() => []),
      authFetch('/admin/equipamentos/checklists?ativos=true').then(r => r.json()).catch(() => []),
    ]);
    setEquipamentos(eq); setModelos(md); setChecklists(cl);
  };

  const salvarEquipamento = async () => {
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/admin/equipamentos/${form.id}` : '/admin/equipamentos';
    await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setModal(null); carregarDados();
  };

  const deletarEquipamento = async (id) => {
    await authFetch(`/admin/equipamentos/${id}`, { method: 'DELETE' });
    carregarDados();
  };

  const salvarModelo = async () => {
    await authFetch('/admin/equipamentos/checklists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setModal(null); carregarDados();
  };

  const gerarChecklist = async () => {
    await authFetch('/admin/equipamentos/checklists/gerar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setModal(null); carregarDados();
  };

  const toggleItem = async (checklistIdx, itemIdx) => {
    const updated = [...checklists];
    updated[checklistIdx].itens[itemIdx].concluido = !updated[checklistIdx].itens[itemIdx].concluido;
    setChecklists(updated);
    await authFetch(`/admin/equipamentos/checklists/${updated[checklistIdx].id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated[checklistIdx]) });
  };

  const tabs = [
    { label: 'Equipamentos', icon: <Package size={18} /> },
    { label: 'Modelos de Checklist', icon: <ClipboardList size={18} /> },
    { label: 'Checklists Ativos', icon: <CheckSquare size={18} /> },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4" style={{ color: ACCENT }}>Inventário & Checklists</h1>
      <div className="flex gap-1 mb-6 border-b">
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${tab === i ? 'border-b-2 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`} style={tab === i ? { borderColor: ACCENT } : {}}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div>
          <button onClick={() => { setForm({ nome: '', categoria: 'Câmera', numero_serie: '', status: 'disponível', valor_estimado: '' }); setModal('equip'); }} className="mb-4 flex items-center gap-2 text-white px-4 py-2 rounded-lg hover:opacity-90" style={{ backgroundColor: ACCENT }}><Plus size={16} /> Novo Equipamento</button>
          <div className="grid gap-3">
            {equipamentos.map(eq => (
              <div key={eq.id} className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
                <div>
                  <span className="font-semibold">{eq.nome}</span>
                  <span className="ml-2 text-sm text-gray-500">{eq.categoria} • {eq.numero_serie}</span>
                  <span className={`ml-3 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[eq.status]}`}>{eq.status.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">R$ {Number(eq.valor_estimado || 0).toLocaleString('pt-BR')}</span>
                  <button onClick={() => { setForm(eq); setModal('equip'); }} className="p-1 text-gray-400 hover:text-blue-600"><Edit size={16} /></button>
                  <button onClick={() => deletarEquipamento(eq.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 1 && (
        <div>
          <button onClick={() => { setForm({ tipo_evento: 'Casamento', itens: [{ descricao: '', obrigatorio: true }] }); setModal('modelo'); }} className="mb-4 flex items-center gap-2 text-white px-4 py-2 rounded-lg hover:opacity-90" style={{ backgroundColor: ACCENT }}><Plus size={16} /> Novo Modelo</button>
          <div className="grid gap-3">
            {modelos.map(m => (
              <div key={m.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="font-semibold">{m.tipo_evento}</div>
                <div className="text-sm text-gray-500 mt-1">{(m.itens || []).length} itens • {(m.itens || []).filter(i => i.obrigatorio).length} obrigatórios</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 2 && (
        <div>
          <button onClick={() => { setForm({ modelo_id: modelos[0]?.id || '', evento_id: '' }); setModal('gerar'); }} className="mb-4 flex items-center gap-2 text-white px-4 py-2 rounded-lg hover:opacity-90" style={{ backgroundColor: ACCENT }}><Plus size={16} /> Gerar Checklist</button>
          <div className="grid gap-3">
            {checklists.map((cl, ci) => {
              const total = (cl.itens || []).length;
              const done = (cl.itens || []).filter(i => i.concluido).length;
              return (
                <div key={cl.id} className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">{cl.evento_nome || `Evento #${cl.evento_id}`}</span>
                    <span className="text-sm font-medium" style={{ color: ACCENT }}>{done}/{total} concluídos</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3"><div className="h-2 rounded-full" style={{ width: `${total ? (done / total) * 100 : 0}%`, backgroundColor: ACCENT }} /></div>
                  <div className="space-y-1">
                    {(cl.itens || []).map((item, ii) => (
                      <label key={ii} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={item.concluido || false} onChange={() => toggleItem(ci, ii)} className="rounded" style={{ accentColor: ACCENT }} />
                        <span className={item.concluido ? 'line-through text-gray-400' : ''}>{item.descricao}</span>
                        {item.obrigatorio && <span className="text-xs text-red-500">*</span>}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{modal === 'equip' ? (form.id ? 'Editar' : 'Novo') + ' Equipamento' : modal === 'modelo' ? 'Novo Modelo de Checklist' : 'Gerar Checklist'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {modal === 'equip' && (
              <div className="space-y-3">
                <input placeholder="Nome" value={form.nome || ''} onChange={e => setForm({ ...form, nome: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                <select value={form.categoria || ''} onChange={e => setForm({ ...form, categoria: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
                <input placeholder="Número de série" value={form.numero_serie || ''} onChange={e => setForm({ ...form, numero_serie: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                <select value={form.status || ''} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
                <input type="number" placeholder="Valor estimado" value={form.valor_estimado || ''} onChange={e => setForm({ ...form, valor_estimado: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                <button onClick={salvarEquipamento} className="w-full text-white py-2 rounded-lg font-medium hover:opacity-90" style={{ backgroundColor: ACCENT }}>Salvar</button>
              </div>
            )}

            {modal === 'modelo' && (
              <div className="space-y-3">
                <select value={form.tipo_evento || ''} onChange={e => setForm({ ...form, tipo_evento: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                  {TIPOS_EVENTO.map(t => <option key={t}>{t}</option>)}
                </select>
                <div className="space-y-2">
                  {(form.itens || []).map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input placeholder="Descrição do item" value={item.descricao} onChange={e => { const itens = [...form.itens]; itens[i].descricao = e.target.value; setForm({ ...form, itens }); }} className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                      <label className="flex items-center gap-1 text-xs whitespace-nowrap"><input type="checkbox" checked={item.obrigatorio} onChange={e => { const itens = [...form.itens]; itens[i].obrigatorio = e.target.checked; setForm({ ...form, itens }); }} />Obrig.</label>
                      <button onClick={() => { const itens = form.itens.filter((_, idx) => idx !== i); setForm({ ...form, itens }); }} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setForm({ ...form, itens: [...(form.itens || []), { descricao: '', obrigatorio: false }] })} className="text-sm underline" style={{ color: ACCENT }}>+ Adicionar item</button>
                <button onClick={salvarModelo} className="w-full text-white py-2 rounded-lg font-medium hover:opacity-90" style={{ backgroundColor: ACCENT }}>Salvar Modelo</button>
              </div>
            )}

            {modal === 'gerar' && (
              <div className="space-y-3">
                <select value={form.modelo_id || ''} onChange={e => setForm({ ...form, modelo_id: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Selecione um modelo</option>
                  {modelos.map(m => <option key={m.id} value={m.id}>{m.tipo_evento}</option>)}
                </select>
                <input placeholder="ID do Evento" value={form.evento_id || ''} onChange={e => setForm({ ...form, evento_id: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                <button onClick={gerarChecklist} className="w-full text-white py-2 rounded-lg font-medium hover:opacity-90" style={{ backgroundColor: ACCENT }}>Gerar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
