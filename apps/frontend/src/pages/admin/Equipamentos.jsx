import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Package, ClipboardList, CheckSquare, Plus, Trash2, Edit, X, Wrench, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

const ACCENT = '#EA580C';
const CATEGORIAS = ['Câmera', 'Lente', 'Flash', 'Tripé', 'Drone', 'Iluminação', 'Acessório'];
const STATUS_OPTIONS = ['disponível', 'em_uso', 'manutenção'];
const TIPOS_EVENTO = ['Casamento', 'Ensaio', 'Aniversário', 'Corporativo', 'Batizado', 'Outros'];
const STATUS_COLORS = { disponível: 'bg-green-100 text-green-800', em_uso: 'bg-blue-100 text-blue-800', manutenção: 'bg-yellow-100 text-yellow-800' };

export default function Equipamentos() {
  const { authFetch } = useAuth();
  const [tab, setTab] = useState(0);
  const [equipamentos, setEquipamentos] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    const [eq, md, cl, ev] = await Promise.all([
      authFetch('/admin/equipamentos').then(r => r.json()).catch(() => []),
      authFetch('/admin/equipamentos/checklists').then(r => r.json()).catch(() => []),
      authFetch('/admin/equipamentos/checklists?ativos=true').then(r => r.json()).catch(() => []),
      authFetch('/admin/agenda').then(r => r.json()).catch(() => []),
    ]);
    setEquipamentos(eq); setModelos(md); setChecklists(cl); setEventos(ev);
  };

  const salvarEquipamento = async () => {
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/admin/equipamentos/${form.id}` : '/admin/equipamentos';
    await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setModal(null); carregarDados();
  };

  const deletarEquipamento = async (id) => {
    if (!confirm('Excluir este equipamento?')) return;
    await authFetch(`/admin/equipamentos/${id}`, { method: 'DELETE' });
    carregarDados();
  };

  const alterarStatus = async (id, status) => {
    await authFetch(`/admin/equipamentos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
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

  const toggleItem = async (clId, itemIdx) => {
    const cl = checklists.find(c => c.id === clId);
    if (!cl) return;
    const itens = [...cl.itens];
    itens[itemIdx] = { ...itens[itemIdx], concluido: !itens[itemIdx].concluido, marcado_em: !itens[itemIdx].concluido ? new Date().toISOString() : null };
    setChecklists(checklists.map(c => c.id === clId ? { ...c, itens } : c));
    await authFetch(`/admin/equipamentos/checklists/${clId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itens }) });
  };

  const kpis = [
    { label: 'Total', value: equipamentos.length, color: 'bg-gray-100 text-gray-800' },
    { label: 'Disponíveis', value: equipamentos.filter(e => e.status === 'disponível').length, color: 'bg-green-100 text-green-800' },
    { label: 'Em uso', value: equipamentos.filter(e => e.status === 'em_uso').length, color: 'bg-blue-100 text-blue-800' },
    { label: 'Manutenção', value: equipamentos.filter(e => e.status === 'manutenção').length, color: 'bg-yellow-100 text-yellow-800' },
  ];

  const tabs = [
    { label: 'Equipamentos', icon: <Package size={18} /> },
    { label: 'Modelos de Checklist', icon: <ClipboardList size={18} /> },
    { label: 'Checklists de Evento', icon: <CheckSquare size={18} /> },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4" style={{ color: ACCENT }}>Inventário & Checklists</h1>
      <div className="flex gap-1 mb-6 border-b">
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${tab === i ? 'border-b-2 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`} style={tab === i ? { borderColor: ACCENT } : {}}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* === ABA EQUIPAMENTOS === */}
      {tab === 0 && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {kpis.map(k => (
              <div key={k.label} className={`rounded-xl p-4 ${k.color}`}>
                <div className="text-2xl font-bold">{k.value}</div>
                <div className="text-sm font-medium">{k.label}</div>
              </div>
            ))}
          </div>
          <button onClick={() => { setForm({ nome: '', categoria: 'Câmera', n_serie: '', status: 'disponível', valor_estimado: '', descricao: '', data_compra: '', proxima_manutencao: '' }); setModal('equip'); }} className="mb-4 flex items-center gap-2 text-white px-4 py-2 rounded-lg hover:opacity-90" style={{ backgroundColor: ACCENT }}>
            <Plus size={16} /> Novo Equipamento
          </button>
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Nº Série</th>
                  <th className="px-4 py-3 font-medium">Valor Estimado</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Último uso</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {equipamentos.map(eq => (
                  <tr key={eq.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{eq.nome}</td>
                    <td className="px-4 py-3">{eq.categoria}</td>
                    <td className="px-4 py-3 text-gray-500">{eq.n_serie || eq.numero_serie}</td>
                    <td className="px-4 py-3">R$ {Number(eq.valor_estimado || 0).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[eq.status]}`}>{eq.status?.replace('_', ' ')}</span></td>
                    <td className="px-4 py-3 text-gray-500">{eq.ultimo_uso ? new Date(eq.ultimo_uso).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setForm(eq); setModal('equip'); }} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" title="Editar"><Edit size={15} /></button>
                        {eq.status !== 'manutenção' && <button onClick={() => alterarStatus(eq.id, 'manutenção')} className="p-1.5 rounded hover:bg-yellow-50 text-gray-400 hover:text-yellow-600" title="Enviar para manutenção"><Wrench size={15} /></button>}
                        {eq.status !== 'disponível' && <button onClick={() => alterarStatus(eq.id, 'disponível')} className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600" title="Marcar disponível"><CheckCircle size={15} /></button>}
                        <button onClick={() => deletarEquipamento(eq.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600" title="Excluir"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {equipamentos.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum equipamento cadastrado.</p>}
          </div>
        </div>
      )}

      {/* === ABA MODELOS DE CHECKLIST === */}
      {tab === 1 && (
        <div>
          <button onClick={() => { setForm({ nome: '', tipo_evento: 'Casamento', itens: [{ descricao: '', obrigatorio: true }] }); setModal('modelo'); }} className="mb-4 flex items-center gap-2 text-white px-4 py-2 rounded-lg hover:opacity-90" style={{ backgroundColor: ACCENT }}>
            <Plus size={16} /> Novo Modelo
          </button>
          <div className="grid md:grid-cols-2 gap-4">
            {modelos.map(m => (
              <div key={m.id} className="bg-white p-5 rounded-xl shadow-sm border">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-base">{m.nome || m.tipo_evento}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{m.tipo_evento}</span>
                  </div>
                  <span className="text-xs text-gray-500">{(m.itens || []).length} itens</span>
                </div>
                <ul className="space-y-1.5">
                  {(m.itens || []).map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      <span className="flex-1">{item.descricao}</span>
                      {item.obrigatorio && <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-medium">Obrigatório</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {modelos.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum modelo criado.</p>}
        </div>
      )}

      {/* === ABA CHECKLISTS DE EVENTO === */}
      {tab === 2 && (
        <div>
          <button onClick={() => { setForm({ modelo_id: '', evento_id: '' }); setModal('gerar'); }} className="mb-4 flex items-center gap-2 text-white px-4 py-2 rounded-lg hover:opacity-90" style={{ backgroundColor: ACCENT }}>
            <Plus size={16} /> Gerar para evento
          </button>
          <div className="space-y-4">
            {checklists.map(cl => {
              const total = (cl.itens || []).length;
              const done = (cl.itens || []).filter(i => i.concluido).length;
              const pct = total ? Math.round((done / total) * 100) : 0;
              const isOpen = expanded === cl.id;
              return (
                <div key={cl.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <button onClick={() => setExpanded(isOpen ? null : cl.id)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left">
                    <div>
                      <span className="font-semibold">{cl.evento_nome || `Evento #${cl.evento_id}`}</span>
                      <span className="ml-3 text-sm text-gray-500">{cl.data ? new Date(cl.data).toLocaleDateString('pt-BR') : ''}</span>
                      <span className="ml-3 text-xs px-2 py-0.5 rounded bg-orange-50 text-orange-700">{cl.modelo_nome || 'Modelo'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium" style={{ color: ACCENT }}>{done}/{total}</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: ACCENT }} /></div>
                      {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t px-4 py-3 space-y-2">
                      {(cl.itens || []).map((item, ii) => (
                        <label key={ii} className="flex items-center gap-3 cursor-pointer text-sm py-1">
                          <input type="checkbox" checked={item.concluido || false} onChange={() => toggleItem(cl.id, ii)} className="rounded w-4 h-4" style={{ accentColor: ACCENT }} />
                          <span className={`flex-1 ${item.concluido ? 'line-through text-gray-400' : ''}`}>{item.descricao}</span>
                          {item.obrigatorio && <span className="text-xs text-red-500 font-medium">Obrig.</span>}
                          {item.marcado_em && <span className="text-xs text-gray-400">{new Date(item.marcado_em).toLocaleString('pt-BR')}</span>}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {checklists.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum checklist gerado.</p>}
        </div>
      )}

      {/* === MODAIS === */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{modal === 'equip' ? (form.id ? 'Editar' : 'Novo') + ' Equipamento' : modal === 'modelo' ? 'Novo Modelo de Checklist' : 'Gerar Checklist para Evento'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {modal === 'equip' && (
              <div className="space-y-3">
                <div><label className="text-xs font-medium text-gray-600">Nome</label><input value={form.nome || ''} onChange={e => setForm({ ...form, nome: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-gray-600">Categoria</label><select value={form.categoria || ''} onChange={e => setForm({ ...form, categoria: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1">{CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select></div>
                  <div><label className="text-xs font-medium text-gray-600">Nº Série</label><input value={form.n_serie || ''} onChange={e => setForm({ ...form, n_serie: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-gray-600">Valor Estimado (R$)</label><input type="number" value={form.valor_estimado || ''} onChange={e => setForm({ ...form, valor_estimado: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1" /></div>
                  <div><label className="text-xs font-medium text-gray-600">Status</label><select value={form.status || ''} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1">{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></div>
                </div>
                <div><label className="text-xs font-medium text-gray-600">Descrição</label><textarea value={form.descricao || ''} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 mt-1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-gray-600">Data de Compra</label><input type="date" value={form.data_compra || ''} onChange={e => setForm({ ...form, data_compra: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1" /></div>
                  <div><label className="text-xs font-medium text-gray-600">Próxima Manutenção</label><input type="date" value={form.proxima_manutencao || ''} onChange={e => setForm({ ...form, proxima_manutencao: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1" /></div>
                </div>
                <button onClick={salvarEquipamento} className="w-full text-white py-2.5 rounded-lg font-medium hover:opacity-90 mt-2" style={{ backgroundColor: ACCENT }}>Salvar</button>
              </div>
            )}

            {modal === 'modelo' && (
              <div className="space-y-3">
                <div><label className="text-xs font-medium text-gray-600">Nome do Modelo</label><input value={form.nome || ''} onChange={e => setForm({ ...form, nome: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1" /></div>
                <div><label className="text-xs font-medium text-gray-600">Tipo de Evento</label><select value={form.tipo_evento || ''} onChange={e => setForm({ ...form, tipo_evento: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1">{TIPOS_EVENTO.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label className="text-xs font-medium text-gray-600 mb-2 block">Itens do Checklist</label>
                  <div className="space-y-2">
                    {(form.itens || []).map((item, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input placeholder="Descrição do item" value={item.descricao} onChange={e => { const itens = [...form.itens]; itens[i] = { ...itens[i], descricao: e.target.value }; setForm({ ...form, itens }); }} className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                        <button onClick={() => { const itens = [...form.itens]; itens[i] = { ...itens[i], obrigatorio: !itens[i].obrigatorio }; setForm({ ...form, itens }); }} className={`text-xs px-2 py-1 rounded font-medium ${item.obrigatorio ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{item.obrigatorio ? 'Obrig.' : 'Opcional'}</button>
                        <button onClick={() => setForm({ ...form, itens: form.itens.filter((_, idx) => idx !== i) })} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setForm({ ...form, itens: [...(form.itens || []), { descricao: '', obrigatorio: false }] })} className="mt-2 text-sm font-medium" style={{ color: ACCENT }}>+ Adicionar item</button>
                </div>
                <button onClick={salvarModelo} className="w-full text-white py-2.5 rounded-lg font-medium hover:opacity-90 mt-2" style={{ backgroundColor: ACCENT }}>Salvar Modelo</button>
              </div>
            )}

            {modal === 'gerar' && (
              <div className="space-y-3">
                <div><label className="text-xs font-medium text-gray-600">Modelo de Checklist</label><select value={form.modelo_id || ''} onChange={e => setForm({ ...form, modelo_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1"><option value="">Selecione um modelo</option>{modelos.map(m => <option key={m.id} value={m.id}>{m.nome || m.tipo_evento}</option>)}</select></div>
                <div><label className="text-xs font-medium text-gray-600">Evento da Agenda</label><select value={form.evento_id || ''} onChange={e => setForm({ ...form, evento_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1"><option value="">Selecione um evento</option>{eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.titulo || ev.nome} — {ev.data ? new Date(ev.data).toLocaleDateString('pt-BR') : ''}</option>)}</select></div>
                <button onClick={gerarChecklist} disabled={!form.modelo_id || !form.evento_id} className="w-full text-white py-2.5 rounded-lg font-medium hover:opacity-90 mt-2 disabled:opacity-50" style={{ backgroundColor: ACCENT }}>Gerar Checklist</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
