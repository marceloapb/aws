import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Package, Plus, Edit2, Power, Printer, X, Eye } from 'lucide-react';

const ACCENT = '#EA580C';
const fmtBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Catalogo() {
  const { authFetch } = useAuth();
  const [data, setData] = useState([]);
  const [tab, setTab] = useState('itens');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [modalItem, setModalItem] = useState(null);
  const [modalPacote, setModalPacote] = useState(null);
  const [novaCat, setNovaCat] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await authFetch('/admin/catalogo');
      const json = await res.json();
      if (json.success) setData(json.data || []);
    } catch {}
  };

  const save = async (payload, id) => {
    if (id) await authFetch(`/admin/catalogo/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    else await authFetch('/admin/catalogo', { method: 'POST', body: JSON.stringify(payload) });
    load();
  };

  const toggleStatus = async (item) => {
    await authFetch(`/admin/catalogo/${item.id}`, {
      method: 'PUT', body: JSON.stringify({ status: item.status === 'ativo' ? 'inativo' : 'ativo' })
    });
    load();
  };

  const itens = useMemo(() => data.filter(d => d.type === 'item'), [data]);
  const pacotes = useMemo(() => data.filter(d => d.type === 'pacote'), [data]);
  const categorias = useMemo(() => data.filter(d => d.type === 'categoria'), [data]);

  const itensFiltrados = useMemo(() => {
    if (filtroTipo === 'todos') return itens;
    if (filtroTipo === 'principal') return itens.filter(i => i.category === 'Serviço Principal');
    return itens.filter(i => i.category === 'Adicional');
  }, [itens, filtroTipo]);

  const calcPrecoFinal = (pacote) => {
    const soma = (pacote.itemIds || []).reduce((acc, id) => {
      const it = itens.find(i => i.id === id);
      return acc + (it ? Number(it.price || 0) : 0);
    }, 0);
    if (pacote.descontoTipo === 'percentual') return soma * (1 - (Number(pacote.descontoValor) || 0) / 100);
    return soma - (Number(pacote.descontoValor) || 0);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Produtos e Serviços</h1>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Printer size={16} /> Gerar lista de preços
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[{ key: 'itens', label: 'Itens' }, { key: 'pacotes', label: 'Pacotes' }, { key: 'categorias', label: 'Categorias' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition ${tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── ABA ITENS ─────────────────────────────────────────────────────── */}
      {tab === 'itens' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {[{ k: 'todos', l: 'Todos' }, { k: 'principal', l: 'Serviço Principal' }, { k: 'adicional', l: 'Adicional' }].map(f => (
                <button key={f.k} onClick={() => setFiltroTipo(f.k)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${filtroTipo === f.k ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {f.l}
                </button>
              ))}
            </div>
            <button onClick={() => setModalItem({ type: 'item', category: 'Serviço Principal', status: 'ativo', exibirCliente: true })}
              style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
              <Plus size={16} /> Novo Item
            </button>
          </div>

          {itensFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-400">Nenhum item encontrado</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {itensFiltrados.map(item => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">{item.category}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900">{item.name}</h3>
                  {item.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
                  <p className="text-lg font-bold mt-3" style={{ color: ACCENT }}>{fmtBRL(item.price)}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1">
                      {item.exibirCliente && <span className="inline-flex items-center gap-1 text-xs text-blue-600"><Eye size={12} /> Visível ao cliente</span>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setModalItem({ ...item })} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Edit2 size={14} /></button>
                      <button onClick={() => toggleStatus(item)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Power size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ABA PACOTES ───────────────────────────────────────────────────── */}
      {tab === 'pacotes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setModalPacote({ type: 'pacote', status: 'ativo', exibirCliente: true, itemIds: [], descontoTipo: 'percentual', descontoValor: 0 })}
              style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
              <Plus size={16} /> Novo Pacote
            </button>
          </div>

          {pacotes.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-400">Nenhum pacote cadastrado</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pacotes.map(pac => (
                <div key={pac.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-bold text-gray-900">{pac.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pac.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {pac.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {pac.description && <p className="text-xs text-gray-500 mb-3">{pac.description}</p>}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Itens inclusos:</p>
                    <div className="flex flex-wrap gap-1">
                      {(pac.itemIds || []).map(id => {
                        const it = itens.find(i => i.id === id);
                        return it ? <span key={id} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{it.name}</span> : null;
                      })}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      <span className="text-xs text-gray-500">Desconto: {pac.descontoValor}{pac.descontoTipo === 'percentual' ? '%' : ' R$'}</span>
                      <p className="text-lg font-bold" style={{ color: ACCENT }}>{fmtBRL(calcPrecoFinal(pac))}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setModalPacote({ ...pac })} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Edit2 size={14} /></button>
                      <button onClick={() => toggleStatus(pac)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Power size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ABA CATEGORIAS ────────────────────────────────────────────────── */}
      {tab === 'categorias' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input value={novaCat} onChange={e => setNovaCat(e.target.value)} placeholder="Nova categoria..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200" />
            <button onClick={async () => {
              if (!novaCat.trim()) return;
              await save({ name: novaCat.trim(), type: 'categoria', status: 'ativo' });
              setNovaCat('');
            }} style={{ background: ACCENT }} className="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
              Adicionar
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {categorias.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Nenhuma categoria</div>
            ) : categorias.map(cat => {
              const count = itens.filter(i => i.category === cat.name).length;
              return (
                <div key={cat.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                    <span className="ml-2 text-xs text-gray-400">{count} {count === 1 ? 'item' : 'itens'}</span>
                  </div>
                  <button onClick={() => toggleStatus(cat)}
                    className={`relative w-10 h-5 rounded-full transition ${cat.status === 'ativo' ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${cat.status === 'ativo' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── MODAL ITEM ────────────────────────────────────────────────────── */}
      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalItem(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{modalItem.id ? 'Editar Item' : 'Novo Item'}</h2>
              <button onClick={() => setModalItem(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                <input value={modalItem.name || ''} onChange={e => setModalItem({ ...modalItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                  <select value={modalItem.category || ''} onChange={e => setModalItem({ ...modalItem, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                    <option value="Serviço Principal">Serviço Principal</option>
                    <option value="Adicional">Adicional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Categoria</label>
                  <select value={modalItem.includes || ''} onChange={e => setModalItem({ ...modalItem, includes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                    <option value="">Sem categoria</option>
                    {categorias.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Valor base (R$)</label>
                <input type="number" value={modalItem.price || ''} onChange={e => setModalItem({ ...modalItem, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200" />
              </div>
              {modalItem.category === 'Serviço Principal' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Duração base (horas)</label>
                    <input type="number" value={modalItem.duration || ''} onChange={e => setModalItem({ ...modalItem, duration: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Valor hora adicional</label>
                    <input type="number" value={modalItem.valorHora || ''} onChange={e => setModalItem({ ...modalItem, valorHora: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
                <textarea value={modalItem.description || ''} onChange={e => setModalItem({ ...modalItem, description: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200 resize-none" />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={modalItem.status === 'ativo'} onChange={e => setModalItem({ ...modalItem, status: e.target.checked ? 'ativo' : 'inativo' })}
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                  <span className="text-sm text-gray-700">Ativo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!modalItem.exibirCliente} onChange={e => setModalItem({ ...modalItem, exibirCliente: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                  <span className="text-sm text-gray-700">Exibir ao cliente</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModalItem(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={async () => {
                const { id, ...rest } = modalItem;
                await save({ ...rest, type: 'item' }, id);
                setModalItem(null);
              }} style={{ background: ACCENT }} className="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
                {modalItem.id ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL PACOTE ──────────────────────────────────────────────────── */}
      {modalPacote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalPacote(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{modalPacote.id ? 'Editar Pacote' : 'Novo Pacote'}</h2>
              <button onClick={() => setModalPacote(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                <input value={modalPacote.name || ''} onChange={e => setModalPacote({ ...modalPacote, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
                <textarea value={modalPacote.description || ''} onChange={e => setModalPacote({ ...modalPacote, description: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Itens inclusos</label>
                <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                  {itens.length === 0 ? (
                    <p className="text-xs text-gray-400">Nenhum item cadastrado</p>
                  ) : itens.map(it => (
                    <label key={it.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input type="checkbox" checked={(modalPacote.itemIds || []).includes(it.id)}
                        onChange={e => {
                          const ids = modalPacote.itemIds || [];
                          setModalPacote({ ...modalPacote, itemIds: e.target.checked ? [...ids, it.id] : ids.filter(x => x !== it.id) });
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                      <span className="text-sm text-gray-700">{it.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">{fmtBRL(it.price)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo desconto</label>
                  <select value={modalPacote.descontoTipo || 'percentual'} onChange={e => setModalPacote({ ...modalPacote, descontoTipo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                    <option value="percentual">Percentual (%)</option>
                    <option value="fixo">Fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Valor desconto</label>
                  <input type="number" value={modalPacote.descontoValor || ''} onChange={e => setModalPacote({ ...modalPacote, descontoValor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={modalPacote.status === 'ativo'} onChange={e => setModalPacote({ ...modalPacote, status: e.target.checked ? 'ativo' : 'inativo' })}
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                  <span className="text-sm text-gray-700">Ativo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!modalPacote.exibirCliente} onChange={e => setModalPacote({ ...modalPacote, exibirCliente: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                  <span className="text-sm text-gray-700">Exibir ao cliente</span>
                </label>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                <span className="text-xs text-gray-500">Preço final calculado</span>
                <p className="text-xl font-bold" style={{ color: ACCENT }}>{fmtBRL(calcPrecoFinal(modalPacote))}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModalPacote(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={async () => {
                const { id, ...rest } = modalPacote;
                await save({ ...rest, type: 'pacote' }, id);
                setModalPacote(null);
              }} style={{ background: ACCENT }} className="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
                {modalPacote.id ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
