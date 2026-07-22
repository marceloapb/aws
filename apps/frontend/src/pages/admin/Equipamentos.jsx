import React, { useState, useEffect, useMemo } from 'react';
import { Package, Tag, ClipboardList, CheckCircle2, Plus, Search, Edit, Trash2, Copy, Star, Power, Filter, ArrowUpDown, AlertTriangle, X, Wrench } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SortableHeader } from '../../components/ui';
import useSortable from '../../hooks/useSortable';

const ACCENT = '#EA580C';
const TABS = ['Inventário', 'Categorias', 'Checklists', 'Conferência'];
const STATUS_OPTIONS = [
  { value: 'disponivel', label: 'Disponível', color: 'bg-green-100 text-green-800' },
  { value: 'em_uso', label: 'Em Uso', color: 'bg-blue-100 text-blue-800' },
  { value: 'manutencao', label: 'Manutenção', color: 'bg-yellow-100 text-yellow-800' },
];
const PRESET_COLORS = ['#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#06B6D4','#84CC16','#F97316','#6366F1'];
const DEFAULT_CATEGORIES = ['Câmeras','Lentes','Flash','Iluminação','Tripés','Drones','Estabilizadores','Áudio','Acessórios','Outros'];
const EVENT_TYPES = ['Casamento','Ensaio','Corporativo','Aniversário','Formatura','Outros'];

export default function Equipamentos() {
  const { authFetch } = useAuth();
  const [tab, setTab] = useState(0);
  const [equipamentos, setEquipamentos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inventário state
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalEquip, setModalEquip] = useState(null);

  // Categorias state
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);
  const [editingCat, setEditingCat] = useState(null);

  // Checklists state
  const [modalChecklist, setModalChecklist] = useState(null);

  // IA Identificação state
  const [iaResults, setIaResults] = useState([]);
  const [iaProcessing, setIaProcessing] = useState(false);
  const [iaProgress, setIaProgress] = useState({ current: 0, total: 0 });

  // Conferência state
  const [selectedEvento, setSelectedEvento] = useState('');
  const [selectedChecklist, setSelectedChecklist] = useState('');
  const [conferencia, setConferencia] = useState(null);
  const [checked, setChecked] = useState({});

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [eqRes, catRes, chkRes, evRes] = await Promise.all([
        authFetch('/admin/equipamentos').catch(() => null),
        authFetch('/admin/equipamentos/categorias').catch(() => null),
        authFetch('/admin/equipamentos/checklists').catch(() => null),
        authFetch('/admin/agenda').catch(() => null),
      ]);
      
      const eqJson = eqRes?.ok ? await eqRes.json().catch(() => ({})) : {};
      const catJson = catRes?.ok ? await catRes.json().catch(() => ({})) : {};
      const chkJson = chkRes?.ok ? await chkRes.json().catch(() => ({})) : {};
      const evJson = evRes?.ok ? await evRes.json().catch(() => ({})) : {};
      
      const eqData = Array.isArray(eqJson.data) ? eqJson.data : (Array.isArray(eqJson) ? eqJson : []);
      const catData = Array.isArray(catJson.data) ? catJson.data : (Array.isArray(catJson) ? catJson : DEFAULT_CATEGORIES.map((n, i) => ({ id: String(i+1), nome: n, cor: PRESET_COLORS[i] })));
      const chkData = Array.isArray(chkJson.data) ? chkJson.data : (Array.isArray(chkJson) ? chkJson : []);
      const evData = Array.isArray(evJson.data) ? evJson.data : (Array.isArray(evJson) ? evJson : []);
      
      setEquipamentos(eqData);
      setCategorias(catData);
      setChecklists(chkData);
      setEventos(evData);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  // IA: converter imagem para JPEG via canvas (necessário para HEIC e formatos não suportados)
  const convertToJpegBase64 = (file) => {
    return new Promise((resolve) => {
      // Se já é JPEG/PNG/WEBP/GIF, lê diretamente
      const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (supportedTypes.includes(file.type)) {
        const reader = new FileReader();
        reader.onload = () => resolve({ base64: reader.result.split(',')[1], contentType: file.type });
        reader.readAsDataURL(file);
        return;
      }
      // Para HEIC ou outros formatos, converte via canvas para JPEG
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        URL.revokeObjectURL(url);
        resolve({ base64: dataUrl.split(',')[1], contentType: 'image/jpeg' });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        // Fallback: lê como está e envia como jpeg
        const reader = new FileReader();
        reader.onload = () => resolve({ base64: reader.result.split(',')[1], contentType: 'image/jpeg' });
        reader.readAsDataURL(file);
      };
      img.src = url;
    });
  };

  // IA: processar fotos e identificar equipamentos
  const handleFotosIA = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    e.target.value = '';
    setIaProcessing(true);
    setIaProgress({ current: 0, total: files.length });
    setIaResults([]);

    const results = [];
    for (let i = 0; i < files.length; i++) {
      setIaProgress({ current: i + 1, total: files.length });
      try {
        const { base64, contentType } = await convertToJpegBase64(files[i]);
        const res = await authFetch('/admin/equipamentos/identificar-foto', {
          method: 'POST',
          body: JSON.stringify({ image: base64, content_type: contentType }),
        });
        const json = await res.json();
        if (json.success) {
          results.push({ ...json.data, _preview: URL.createObjectURL(files[i]), _confirmed: false });
        } else {
          results.push({ nome: `Erro: ${files[i].name}`, categoria: 'Outros', _preview: URL.createObjectURL(files[i]), _confirmed: false, _error: true, _errorMsg: json.message || 'Erro ao identificar' });
        }
      } catch (err) {
        results.push({ nome: `Erro: ${files[i].name}`, categoria: 'Outros', _preview: URL.createObjectURL(files[i]), _confirmed: false, _error: true, _errorMsg: err.message || 'Erro de rede' });
      }
    }
    setIaResults(results);
    setIaProcessing(false);
  };

  const confirmarEquipIA = async (item, idx) => {
    const data = { nome: item.nome, marca: item.marca, modelo: item.modelo, categoria: item.categoria, numero_serie: item.numero_serie, valor_estimado: item.valor_estimado, descricao: item.descricao, ativo: true, status: 'disponivel' };
    await authFetch('/admin/equipamentos', { method: 'POST', body: JSON.stringify(data) });
    setIaResults(prev => prev.map((r, i) => i === idx ? { ...r, _confirmed: true } : r));
    fetchAll();
  };

  const confirmarTodosIA = async () => {
    for (let i = 0; i < iaResults.length; i++) {
      if (!iaResults[i]._confirmed && !iaResults[i]._error) {
        await confirmarEquipIA(iaResults[i], i);
      }
    }
    fetchAll();
  };

  async function saveEquip(data) {
    const method = data.id ? 'PUT' : 'POST';
    const url = data.id ? `/admin/equipamentos/${data.id}` : '/admin/equipamentos';
    await authFetch(url, { method, body: JSON.stringify(data) });
    setModalEquip(null); fetchAll();
  }

  async function deleteEquip(id) {
    if (!confirm('Excluir equipamento?')) return;
    await authFetch(`/admin/equipamentos/${id}`, { method: 'DELETE' });
    fetchAll();
  }

  async function togglePadrao(eq) {
    await authFetch(`/admin/equipamentos/${eq.id}`, { method: 'PUT', body: JSON.stringify({ ...eq, padrao: !eq.padrao }) });
    fetchAll();
  }

  async function toggleAtivo(eq) {
    await authFetch(`/admin/equipamentos/${eq.id}`, { method: 'PUT', body: JSON.stringify({ ...eq, ativo: !eq.ativo }) });
    fetchAll();
  }


  const filtered = useMemo(() => {
    let list = [...equipamentos];
    if (search) list = list.filter(e => `${e.nome} ${e.marca} ${e.modelo}`.toLowerCase().includes(search.toLowerCase()));
    if (filterCat) list = list.filter(e => e.categoria === filterCat);
    if (filterStatus) list = list.filter(e => e.status === filterStatus);
    return list;
  }, [equipamentos, search, filterCat, filterStatus]);

  // Ordenação por coluna
  const { sortedData: sortedEquip, requestSort, getSortIndicator } = useSortable(filtered, {
    defaultField: 'nome',
    defaultDirection: 'asc',
  });

  const kpis = useMemo(() => ({
    total: equipamentos.length,
    ativos: equipamentos.filter(e => e.ativo !== false).length,
    inativos: equipamentos.filter(e => e.ativo === false).length,
    padrao: equipamentos.filter(e => e.padrao).length,
  }), [equipamentos]);

  // Conferência helpers
  function iniciarConferencia() {
    const chk = checklists.find(c => c.id == selectedChecklist);
    if (!chk) return;
    setConferencia(chk);
    setChecked({});
  }

  function finalizarConferencia() {
    const itens = conferencia?.itens || [];
    const obrigatorios = itens.filter(i => i.obrigatorio);
    const faltam = obrigatorios.filter(i => !checked[i.id]);
    if (faltam.length > 0) {
      alert(`⚠️ Faltam ${faltam.length} itens obrigatórios!`);
    } else {
      alert('✅ Conferência completa! Todos os itens foram verificados.');
    }
    setConferencia(null);
  }

  const conferenciaProgress = useMemo(() => {
    if (!conferencia) return { checked: 0, total: 0 };
    const total = conferencia.itens?.length || 0;
    const done = Object.values(checked).filter(Boolean).length;
    return { checked: done, total };
  }, [conferencia, checked]);

  const conferenciaStatus = useMemo(() => {
    if (!conferencia) return null;
    const itens = conferencia.itens || [];
    const obrigatorios = itens.filter(i => i.obrigatorio);
    const allDone = obrigatorios.every(i => checked[i.id]);
    return allDone ? 'ok' : 'pendente';
  }, [conferencia, checked]);

  // Category helpers
  async function addCategory() {
    if (!newCatName.trim()) return;
    await authFetch('/admin/equipamentos/categorias', { method: 'POST', body: JSON.stringify({ nome: newCatName, cor: newCatColor }) });
    setNewCatName(''); fetchAll();
  }

  async function renameCategory(cat, nome) {
    await authFetch(`/admin/equipamentos/categorias/${cat.id}`, { method: 'PUT', body: JSON.stringify({ ...cat, nome }) });
    setEditingCat(null); fetchAll();
  }

  async function deleteCategory(cat) {
    const count = equipamentos.filter(e => e.categoria === cat.nome).length;
    if (count > 0) return alert('Não é possível excluir categoria com equipamentos vinculados.');
    if (!confirm('Excluir categoria?')) return;
    await authFetch(`/admin/equipamentos/categorias/${cat.id}`, { method: 'DELETE' });
    fetchAll();
  }

  // Checklist helpers
  async function saveChecklist(data) {
    const method = data.id ? 'PUT' : 'POST';
    const url = data.id ? `/admin/equipamentos/checklists/${data.id}` : '/admin/equipamentos/checklists';
    await authFetch(url, { method, body: JSON.stringify(data) });
    setModalChecklist(null); fetchAll();
  }

  async function deleteChecklist(id) {
    if (!confirm('Excluir modelo de checklist?')) return;
    await authFetch(`/admin/equipamentos/checklists/${id}`, { method: 'DELETE' });
    fetchAll();
  }

  function duplicateChecklist(chk) {
    setModalChecklist({ ...chk, id: undefined, nome: `${chk.nome} (cópia)` });
  }


  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full"/></div>;

  return (
    <div className="space-y-6">
      {/* IA Processing / Results */}
      {iaProcessing && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-orange-500 border-t-transparent rounded-full" />
            <p className="text-sm font-medium text-orange-700">Identificando equipamentos... ({iaProgress.current}/{iaProgress.total})</p>
          </div>
          <div className="mt-2 w-full bg-orange-200 rounded-full h-2">
            <div className="h-2 rounded-full bg-orange-500 transition-all" style={{ width: `${(iaProgress.current / iaProgress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {iaResults.length > 0 && !iaProcessing && (
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">📷 Equipamentos Identificados pela IA ({iaResults.filter(r => !r._error).length})</h3>
            <div className="flex gap-2">
              <button onClick={confirmarTodosIA} className="px-3 py-1.5 text-xs font-medium text-white rounded-lg" style={{ backgroundColor: ACCENT }}>Salvar Todos</button>
              <button onClick={() => setIaResults([])} className="px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-gray-50">Fechar</button>
            </div>
          </div>
          <div className="grid gap-3">
            {iaResults.map((item, idx) => (
              <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${item._confirmed ? 'bg-green-50 border-green-200' : item._error ? 'bg-red-50 border-red-200' : 'border-gray-200'}`}>
                <img src={item._preview} alt="" className="w-16 h-16 rounded-lg object-cover border" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.nome}</p>
                  <p className="text-xs text-gray-500">{item.marca} {item.modelo} • {item.categoria}</p>
                  {item.valor_estimado > 0 && <p className="text-xs text-gray-400">~R$ {Number(item.valor_estimado).toLocaleString('pt-BR')}</p>}
                </div>
                {item._confirmed ? (
                  <span className="text-xs text-green-600 font-medium px-2 py-1 bg-green-100 rounded">✓ Salvo</span>
                ) : !item._error ? (
                  <div className="flex gap-1">
                    <button onClick={() => { setModalEquip({ ...item, ativo: true, status: 'disponivel' }); setIaResults(prev => prev.filter((_, i) => i !== idx)); }}
                      className="text-xs px-2 py-1 border rounded hover:bg-gray-50">Editar</button>
                    <button onClick={() => confirmarEquipIA(item, idx)}
                      className="text-xs px-2 py-1 text-white rounded" style={{ backgroundColor: ACCENT }}>Salvar</button>
                  </div>
                ) : (
                  <span className="text-xs text-red-500" title={item._errorMsg || 'Erro'}>⚠️ {item._errorMsg || 'Erro'}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-3">
          <Wrench size={24} style={{ color: '#EA580C' }} />
          <h1 className="text-2xl font-bold text-gray-900">Equipamentos</h1>
        </div>
        <div className="flex gap-2">
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${tab === i ? 'text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={tab === i ? { backgroundColor: ACCENT } : {}}>
            {t}
          </button>
        ))}
      </div>

      {/* === ABA INVENTÁRIO === */}
      {tab === 0 && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total', value: kpis.total, color: 'bg-gray-100 text-gray-800' },
              { label: 'Ativos', value: kpis.ativos, color: 'bg-green-100 text-green-800' },
              { label: 'Inativos', value: kpis.inativos, color: 'bg-red-100 text-red-800' },
              { label: 'Padrão', value: kpis.padrao, color: 'bg-amber-100 text-amber-800' },
            ].map(k => (
              <div key={k.label} className={`${k.color} rounded-xl p-4 text-center`}>
                <div className="text-2xl font-bold">{k.value}</div>
                <div className="text-sm">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome, marca, modelo..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Todas categorias</option>
              {categorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Todos status</option>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button onClick={() => setModalEquip({ ativo: true, padrao: false, status: 'disponivel' })} className="flex items-center gap-1 px-4 py-2 text-white rounded-lg text-sm font-medium" style={{ backgroundColor: ACCENT }}>
              <Plus className="h-4 w-4" /> Novo
            </button>
            <button onClick={() => document.getElementById('ia-equip-input').click()} className="flex items-center gap-1 px-4 py-2 border border-orange-300 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-50">
              📷 Cadastrar com IA
            </button>
            <input id="ia-equip-input" type="file" accept="image/*" multiple className="hidden" onChange={handleFotosIA} />
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto bg-white rounded-xl shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <SortableHeader label="Nome" field="nome" onSort={requestSort} active={getSortIndicator('nome')} />
                  <SortableHeader label="Categoria" field="categoria" onSort={requestSort} active={getSortIndicator('categoria')} />
                  <SortableHeader label="Marca/Modelo" field="marca" onSort={requestSort} active={getSortIndicator('marca')} />
                  <SortableHeader label="Nº Série" field="num_serie" onSort={requestSort} active={getSortIndicator('num_serie')} />
                  <SortableHeader label="Status" field="status" onSort={requestSort} active={getSortIndicator('status')} />
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Flags</th>
                  <SortableHeader label="Valor" field="valor_estimado" onSort={requestSort} active={getSortIndicator('valor_estimado')} align="right" />
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedEquip.map(eq => {
                  const cat = categorias.find(c => c.nome === eq.categoria);
                  const st = STATUS_OPTIONS.find(s => s.value === eq.status);
                  return (
                    <tr key={eq.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{eq.nome}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: cat?.cor + '20', color: cat?.cor }}>{eq.categoria}</span></td>
                      <td className="px-4 py-3 text-gray-600">{eq.marca} {eq.modelo}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{eq.num_serie}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st?.color || ''}`}>{st?.label || eq.status}</span></td>
                      <td className="px-4 py-3 flex gap-1">
                        {eq.padrao && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs">⭐ Padrão</span>}
                        {eq.ativo !== false && <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">Ativo</span>}
                        {eq.ativo === false && <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">Inativo</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{eq.valor_estimado ? `R$ ${Number(eq.valor_estimado).toLocaleString('pt-BR')}` : '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setModalEquip(eq)} className="p-1 hover:bg-gray-200 rounded" title="Editar"><Edit className="h-4 w-4 text-gray-600" /></button>
                          <button onClick={() => togglePadrao(eq)} className="p-1 hover:bg-gray-200 rounded" title="Marcar Padrão"><Star className={`h-4 w-4 ${eq.padrao ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} /></button>
                          <button onClick={() => toggleAtivo(eq)} className="p-1 hover:bg-gray-200 rounded" title={eq.ativo !== false ? 'Desativar' : 'Ativar'}><Power className={`h-4 w-4 ${eq.ativo !== false ? 'text-green-600' : 'text-red-500'}`} /></button>
                          <button onClick={() => deleteEquip(eq.id)} className="p-1 hover:bg-gray-200 rounded" title="Excluir"><Trash2 className="h-4 w-4 text-red-500" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {sortedEquip.length === 0 && <div className="text-center py-8 text-gray-500">Nenhum equipamento encontrado.</div>}
          </div>
        </div>
      )}


      {/* === ABA CATEGORIAS === */}
      {tab === 1 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Nome da categoria" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-1">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setNewCatColor(c)} className={`w-6 h-6 rounded-full border-2 ${newCatColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
            <button onClick={addCategory} className="flex items-center gap-1 px-4 py-2 text-white rounded-lg text-sm font-medium" style={{ backgroundColor: ACCENT }}>
              <Plus className="h-4 w-4" /> Nova Categoria
            </button>
          </div>
          <div className="bg-white rounded-xl shadow divide-y">
            {categorias.map(cat => {
              const count = equipamentos.filter(e => e.categoria === cat.nome).length;
              return (
                <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.cor }} />
                  {editingCat === cat.id ? (
                    <input autoFocus defaultValue={cat.nome} onBlur={e => renameCategory(cat, e.target.value)} onKeyDown={e => e.key === 'Enter' && renameCategory(cat, e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                  ) : (
                    <span className="font-medium flex-1 cursor-pointer" onDoubleClick={() => setEditingCat(cat.id)}>{cat.nome}</span>
                  )}
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{count} equip.</span>
                  <button onClick={() => setEditingCat(cat.id)} className="p-1 hover:bg-gray-200 rounded"><Edit className="h-3.5 w-3.5 text-gray-500" /></button>
                  <button onClick={() => deleteCategory(cat)} className="p-1 hover:bg-gray-200 rounded"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                </div>
              );
            })}
            {categorias.length === 0 && <div className="text-center py-8 text-gray-500">Nenhuma categoria cadastrada.</div>}
          </div>
        </div>
      )}


      {/* === ABA CHECKLISTS === */}
      {tab === 2 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { const padrao = equipamentos.filter(e => e.padrao).map(e => ({ equipamento_id: e.id, nome: e.nome, quantidade: 1, obrigatorio: true })); setModalChecklist({ nome: '', tipo_evento: '', ativo: true, itens: padrao }); }} className="flex items-center gap-1 px-4 py-2 text-white rounded-lg text-sm font-medium" style={{ backgroundColor: ACCENT }}>
              <Plus className="h-4 w-4" /> Novo Modelo
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {checklists.map(chk => (
              <div key={chk.id} className="bg-white rounded-xl shadow p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{chk.nome}</h3>
                  {chk.ativo && <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">Ativo</span>}
                </div>
                <p className="text-sm text-gray-500">{chk.tipo_evento}</p>
                <p className="text-sm text-gray-600">{chk.itens?.length || 0} itens</p>
                <div className="flex gap-1 pt-2 border-t">
                  <button onClick={() => setModalChecklist(chk)} className="p-1.5 hover:bg-gray-100 rounded" title="Editar"><Edit className="h-4 w-4 text-gray-600" /></button>
                  <button onClick={() => duplicateChecklist(chk)} className="p-1.5 hover:bg-gray-100 rounded" title="Duplicar"><Copy className="h-4 w-4 text-gray-600" /></button>
                  <button onClick={() => deleteChecklist(chk.id)} className="p-1.5 hover:bg-gray-100 rounded" title="Excluir"><Trash2 className="h-4 w-4 text-red-500" /></button>
                </div>
              </div>
            ))}
          </div>
          {checklists.length === 0 && <div className="text-center py-8 text-gray-500">Nenhum modelo de checklist cadastrado.</div>}
        </div>
      )}


      {/* === ABA CONFERÊNCIA === */}
      {tab === 3 && (
        <div className="space-y-4">
          {!conferencia ? (
            <div className="bg-white rounded-xl shadow p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Evento</label>
                  <select value={selectedEvento} onChange={e => { setSelectedEvento(e.target.value); const ev = eventos.find(x => x.id == e.target.value); if (ev) { const match = checklists.find(c => c.tipo_evento === ev.tipo); if (match) setSelectedChecklist(match.id); } }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Selecione um evento</option>
                    {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.titulo || ev.nome} - {ev.data}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo de Checklist</label>
                  <select value={selectedChecklist} onChange={e => setSelectedChecklist(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Selecione um checklist</option>
                    {checklists.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>
              {/* EQP-10 Badge */}
              {selectedEvento && (
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${conferenciaStatus === 'ok' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {conferenciaStatus === 'ok' ? '✅ Checklist OK' : '⏳ Pendente'}
                  </span>
                </div>
              )}
              <button onClick={iniciarConferencia} disabled={!selectedChecklist} className="px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
                Iniciar Conferência
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{conferencia.nome}</h3>
                  <span className="text-sm text-gray-500">{conferenciaProgress.checked} de {conferenciaProgress.total} conferidos</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div className="h-3 rounded-full transition-all" style={{ width: `${conferenciaProgress.total ? (conferenciaProgress.checked / conferenciaProgress.total * 100) : 0}%`, backgroundColor: ACCENT }} />
                </div>
                <div className="space-y-2">
                  {(conferencia.itens || []).map(item => {
                    const eq = equipamentos.find(e => e.id === item.equipamento_id);
                    return (
                      <label key={item.id || item.equipamento_id} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${checked[item.id || item.equipamento_id] ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="checkbox" checked={!!checked[item.id || item.equipamento_id]} onChange={e => setChecked(prev => ({ ...prev, [item.id || item.equipamento_id]: e.target.checked }))} className="w-6 h-6 rounded accent-orange-600" />
                        <div className="flex-1">
                          <span className="font-medium">{item.nome || eq?.nome}</span>
                          <span className="text-xs text-gray-500 ml-2">{eq?.categoria}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${item.obrigatorio ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                          {item.obrigatorio ? 'Obrigatório' : 'Opcional'}
                        </span>
                        {item.quantidade > 1 && <span className="text-xs text-gray-500">x{item.quantidade}</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConferencia(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
                <button onClick={finalizarConferencia} className="px-4 py-2 text-white rounded-lg text-sm font-medium" style={{ backgroundColor: ACCENT }}>Finalizar Conferência</button>
              </div>
            </div>
          )}
        </div>
      )}


      {/* === MODAL EQUIPAMENTO === */}
      {modalEquip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{modalEquip.id ? 'Editar Equipamento' : 'Novo Equipamento'}</h2>
              <button onClick={() => setModalEquip(null)} className="p-1 hover:bg-gray-200 rounded"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.target); const data = { ...modalEquip, ...Object.fromEntries(fd.entries()), padrao: e.target.padrao.checked, ativo: e.target.ativo.checked }; saveEquip(data); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label><input name="nome" defaultValue={modalEquip.nome} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Categoria *</label><select name="categoria" defaultValue={modalEquip.categoria} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">{categorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Status</label><select name="status" defaultValue={modalEquip.status || 'disponivel'} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">{STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Marca</label><input name="marca" defaultValue={modalEquip.marca} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Modelo</label><input name="modelo" defaultValue={modalEquip.modelo} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Nº Série</label><input name="num_serie" defaultValue={modalEquip.num_serie} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Valor Estimado</label><input name="valor_estimado" type="number" step="0.01" defaultValue={modalEquip.valor_estimado} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Localização</label><input name="localizacao" defaultValue={modalEquip.localizacao} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Data Compra</label><input name="data_compra" type="date" defaultValue={modalEquip.data_compra} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label><textarea name="descricao" defaultValue={modalEquip.descricao} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="padrao" defaultChecked={modalEquip.padrao} className="rounded accent-orange-600" /> Equipamento Padrão</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ativo" defaultChecked={modalEquip.ativo !== false} className="rounded accent-orange-600" /> Ativo</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalEquip(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-white rounded-lg text-sm font-medium" style={{ backgroundColor: ACCENT }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === MODAL CHECKLIST === */}
      {modalChecklist && <ChecklistModal checklist={modalChecklist} equipamentos={equipamentos} eventTypes={EVENT_TYPES} onSave={saveChecklist} onClose={() => setModalChecklist(null)} />}
    </div>
  );
}

/* ========= CHECKLIST MODAL COMPONENT ========= */
function ChecklistModal({ checklist, equipamentos, eventTypes, onSave, onClose }) {
  const [form, setForm] = useState({ nome: checklist.nome || '', tipo_evento: checklist.tipo_evento || '', ativo: checklist.ativo !== false, itens: checklist.itens || [] });

  function addItem() {
    setForm(f => ({ ...f, itens: [...f.itens, { equipamento_id: '', nome: '', quantidade: 1, obrigatorio: false }] }));
  }

  function removeItem(idx) {
    setForm(f => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }));
  }

  function updateItem(idx, field, value) {
    setForm(f => {
      const itens = [...f.itens];
      itens[idx] = { ...itens[idx], [field]: value };
      if (field === 'equipamento_id') { const eq = equipamentos.find(e => e.id == value); if (eq) itens[idx].nome = eq.nome; }
      return { ...f, itens };
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ ...checklist, ...form });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{checklist.id ? 'Editar Checklist' : 'Novo Modelo de Checklist'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Nome do Modelo *</label><input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Evento</label><select value={form.tipo_evento} onChange={e => setForm(f => ({ ...f, tipo_evento: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="">Selecione</option>{eventTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Itens do Checklist</label>
              <button type="button" onClick={addItem} className="text-xs px-2 py-1 rounded text-white" style={{ backgroundColor: '#EA580C' }}>+ Adicionar Item</button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {form.itens.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                  <select value={item.equipamento_id} onChange={e => updateItem(idx, 'equipamento_id', e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm">
                    <option value="">Selecione equipamento</option>
                    {equipamentos.filter(e => e.ativo !== false).map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                  <input type="number" min="1" value={item.quantidade} onChange={e => updateItem(idx, 'quantidade', Number(e.target.value))} className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center" />
                  <label className="flex items-center gap-1 text-xs whitespace-nowrap"><input type="checkbox" checked={item.obrigatorio} onChange={e => updateItem(idx, 'obrigatorio', e.target.checked)} className="rounded accent-orange-600" />Obrig.</label>
                  <button type="button" onClick={() => removeItem(idx)} className="p-1 hover:bg-gray-200 rounded"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                </div>
              ))}
              {form.itens.length === 0 && <p className="text-sm text-gray-400 text-center py-3">Nenhum item adicionado.</p>}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="rounded accent-orange-600" /> Modelo Ativo</label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-white rounded-lg text-sm font-medium" style={{ backgroundColor: '#EA580C' }}>Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
