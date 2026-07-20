import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Plus, Search, Filter, Copy, Power, Edit2, Trash2,
  Tag, Layers, ShoppingBag, Clock, Eye, EyeOff, Printer, X, Check
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ACCENT = '#EA580C';

const TIPO_BADGES = {
  servico_principal: { label: 'Serviço Principal', bg: 'bg-blue-100', text: 'text-blue-800' },
  produto: { label: 'Produto', bg: 'bg-green-100', text: 'text-green-800' },
  adicional: { label: 'Adicional', bg: 'bg-purple-100', text: 'text-purple-800' },
};

export default function Catalogo() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState('itens');

  // Itens
  const [itens, setItens] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [buscaNome, setBuscaNome] = useState('');

  // Pacotes
  const [pacotes, setPacotes] = useState([]);
  const [modalPacote, setModalPacote] = useState(null); // null=fechado, {}=novo, {id,...}=editar

  // Categorias
  const [categorias, setCategorias] = useState([]);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [novaCor, setNovaCor] = useState('#EA580C');
  const [editandoCategoria, setEditandoCategoria] = useState(null);

  const [loading, setLoading] = useState(true);

  const fetchDados = async () => {
    setLoading(true);
    try {
      const [resItens, resPacotes, resCat] = await Promise.all([
        authFetch('/admin/catalogo?tipo=itens'),
        authFetch('/admin/catalogo?tipo=pacotes'),
        authFetch('/admin/catalogo?tipo=categorias'),
      ]);
      const dItens = await resItens.json();
      const dPacotes = await resPacotes.json();
      const dCat = await resCat.json();
      if (dItens.success) setItens(dItens.data || []);
      if (dPacotes.success) setPacotes(dPacotes.data || []);
      if (dCat.success) setCategorias(dCat.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchDados(); }, []);

  // Filtros
  const itensFiltrados = useMemo(() => {
    return itens.filter(item => {
      if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) return false;
      if (filtroCategoria && item.categoria_id !== filtroCategoria) return false;
      if (filtroStatus !== 'todos' && (filtroStatus === 'ativo' ? !item.ativo : item.ativo)) return false;
      if (buscaNome && !item.nome.toLowerCase().includes(buscaNome.toLowerCase())) return false;
      return true;
    });
  }, [itens, filtroTipo, filtroCategoria, filtroStatus, buscaNome]);

  // KPIs
  const kpis = useMemo(() => ({
    total: itens.length,
    ativos: itens.filter(i => i.ativo).length,
    servicos: itens.filter(i => i.tipo === 'servico_principal').length,
    produtos: itens.filter(i => i.tipo === 'produto').length,
    adicionais: itens.filter(i => i.tipo === 'adicional').length,
  }), [itens]);

  // Ações Itens
  const toggleAtivoItem = async (item) => {
    await authFetch(`/admin/catalogo/${item.id}`, {
      method: 'PUT', body: JSON.stringify({ ativo: !item.ativo })
    });
    fetchDados();
  };

  const toggleExibirItem = async (item) => {
    await authFetch(`/admin/catalogo/${item.id}`, {
      method: 'PUT', body: JSON.stringify({ exibir_ao_cliente: !item.exibir_ao_cliente })
    });
    fetchDados();
  };

  const duplicarItem = async (item) => {
    const { id, ...rest } = item;
    await authFetch('/admin/catalogo', {
      method: 'POST', body: JSON.stringify({ ...rest, nome: `${rest.nome} (cópia)` })
    });
    fetchDados();
  };

  // Ações Pacotes
  const toggleAtivoPacote = async (pacote) => {
    await authFetch(`/admin/catalogo/${pacote.id}?tipo=pacote`, {
      method: 'PUT', body: JSON.stringify({ ativo: !pacote.ativo })
    });
    fetchDados();
  };

  const duplicarPacote = async (pacote) => {
    const { id, ...rest } = pacote;
    await authFetch('/admin/catalogo?tipo=pacote', {
      method: 'POST', body: JSON.stringify({ ...rest, nome: `${rest.nome} (cópia)` })
    });
    fetchDados();
  };

  const salvarPacote = async (dados) => {
    if (dados.id) {
      await authFetch(`/admin/catalogo/${dados.id}?tipo=pacote`, {
        method: 'PUT', body: JSON.stringify(dados)
      });
    } else {
      await authFetch('/admin/catalogo?tipo=pacote', {
        method: 'POST', body: JSON.stringify(dados)
      });
    }
    setModalPacote(null);
    fetchDados();
  };

  // Ações Categorias
  const criarCategoria = async () => {
    if (!novaCategoria.trim()) return;
    await authFetch('/admin/catalogo?tipo=categoria', {
      method: 'POST', body: JSON.stringify({ nome: novaCategoria, cor: novaCor })
    });
    setNovaCategoria('');
    fetchDados();
  };

  const renomearCategoria = async (cat, novoNome) => {
    await authFetch(`/admin/catalogo/${cat.id}?tipo=categoria`, {
      method: 'PUT', body: JSON.stringify({ nome: novoNome })
    });
    setEditandoCategoria(null);
    fetchDados();
  };

  const excluirCategoria = async (cat) => {
    const vinculados = itens.filter(i => i.categoria_id === cat.id).length;
    if (vinculados > 0) return alert('Não é possível excluir categoria com itens vinculados.');
    await authFetch(`/admin/catalogo/${cat.id}?tipo=categoria`, { method: 'DELETE' });
    fetchDados();
  };

  const gerarListaPrecos = () => {
    window.print();
  };

  const formatCurrency = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });



  // ========== RENDER ==========
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-3">
          <Package size={24} style={{ color: '#EA580C' }} />
          <h1 className="text-2xl font-bold text-gray-900">Produtos e Serviços</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={gerarListaPrecos} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <Printer size={16} /> Gerar Lista de Preços
          </button>
          {abaAtiva === 'itens' && (
            <button onClick={() => navigate('/admin/catalogo/novo')} style={{ backgroundColor: ACCENT }} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 text-sm">
              <Plus size={16} /> Novo Item
            </button>
          )}
          {abaAtiva === 'pacotes' && (
            <button onClick={() => setModalPacote({})} style={{ backgroundColor: ACCENT }} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 text-sm">
              <Plus size={16} /> Novo Pacote
            </button>
          )}
        </div>
      </div>

      {/* Abas */}
      <div className="flex border-b mb-6">
        {[{ key: 'itens', label: 'Itens', icon: ShoppingBag }, { key: 'pacotes', label: 'Pacotes', icon: Layers }, { key: 'categorias', label: 'Categorias', icon: Tag }].map(tab => (
          <button key={tab.key} onClick={() => setAbaAtiva(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${abaAtiva === tab.key ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            style={abaAtiva === tab.key ? { borderColor: ACCENT, color: ACCENT } : {}}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : (
        <>
          {/* ===== ABA ITENS ===== */}
          {abaAtiva === 'itens' && (
            <div>
              {/* KPIs */}
              <div className="grid grid-cols-5 gap-4 mb-6">
                {[
                  { label: 'Total', value: kpis.total },
                  { label: 'Ativos', value: kpis.ativos },
                  { label: 'Serviços', value: kpis.servicos },
                  { label: 'Produtos', value: kpis.produtos },
                  { label: 'Adicionais', value: kpis.adicionais },
                ].map(k => (
                  <div key={k.label} className="bg-white border rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold" style={{ color: ACCENT }}>{k.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap gap-3 mb-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Buscar por nome..." value={buscaNome} onChange={e => setBuscaNome(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
                </div>
                <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="todos">Todos os tipos</option>
                  <option value="servico_principal">Serviço Principal</option>
                  <option value="produto">Produto</option>
                  <option value="adicional">Adicional</option>
                </select>
                <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">Todas categorias</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="todos">Todos status</option>
                  <option value="ativo">Ativos</option>
                  <option value="inativo">Inativos</option>
                </select>
              </div>

              {/* Tabela */}
              <div className="bg-white border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Categoria</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Valor Base</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Duração</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Exibir</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensFiltrados.map(item => {
                      const badge = TIPO_BADGES[item.tipo] || TIPO_BADGES.adicional;
                      const cat = categorias.find(c => c.id === item.categoria_id);
                      return (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{item.nome}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>{badge.label}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{cat?.nome || '-'}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatCurrency(item.valor_base)}
                            {item.tipo === 'servico_principal' && item.valor_hora_adicional > 0 && (
                              <span className="text-xs text-gray-400 block">+{formatCurrency(item.valor_hora_adicional)}/h</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">
                            {item.tipo === 'servico_principal' && item.duracao_base ? `${item.duracao_base}h` : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => toggleAtivoItem(item)}
                              className={`relative w-10 h-5 rounded-full transition-colors ${item.ativo ? 'bg-green-500' : 'bg-gray-300'}`}>
                              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${item.ativo ? 'left-5' : 'left-0.5'}`} />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => toggleExibirItem(item)} className="text-gray-500 hover:text-gray-700">
                              {item.exibir_ao_cliente ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => navigate(`/admin/catalogo/${item.id}`)} className="p-1.5 hover:bg-gray-100 rounded" title="Editar"><Edit2 size={14} /></button>
                              <button onClick={() => duplicarItem(item)} className="p-1.5 hover:bg-gray-100 rounded" title="Duplicar"><Copy size={14} /></button>
                              <button onClick={() => toggleAtivoItem(item)} className="p-1.5 hover:bg-gray-100 rounded" title={item.ativo ? 'Desativar' : 'Reativar'}>
                                <Power size={14} className={item.ativo ? 'text-red-500' : 'text-green-500'} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {itensFiltrados.length === 0 && <p className="text-center py-8 text-gray-400">Nenhum item encontrado</p>}
              </div>
            </div>
          )}


          {/* ===== ABA PACOTES ===== */}
          {abaAtiva === 'pacotes' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pacotes.map(pacote => {
                  const subtotal = (pacote.itens || []).reduce((s, pi) => s + (pi.valor_base || 0) * (pi.quantidade || 1), 0);
                  const desconto = pacote.desconto_tipo === 'percentual' ? subtotal * (pacote.desconto_valor || 0) / 100 : (pacote.desconto_valor || 0);
                  const valorFinal = Math.max(0, subtotal - desconto);
                  return (
                    <div key={pacote.id} className="bg-white border rounded-lg p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{pacote.nome}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pacote.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {pacote.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      {pacote.descricao && <p className="text-sm text-gray-500 mb-3">{pacote.descricao}</p>}
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">Itens inclusos:</p>
                        <ul className="text-xs text-gray-600 space-y-0.5">
                          {(pacote.itens || []).map((pi, idx) => (
                            <li key={idx}>• {pi.nome} {pi.quantidade > 1 ? `(x${pi.quantidade})` : ''}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="border-t pt-3 space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                        </div>
                        {desconto > 0 && (
                          <div className="flex justify-between text-xs text-red-500">
                            <span>Desconto ({pacote.desconto_tipo === 'percentual' ? `${pacote.desconto_valor}%` : 'fixo'})</span>
                            <span>-{formatCurrency(desconto)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-bold" style={{ color: ACCENT }}>
                          <span>Valor Final</span><span>{formatCurrency(valorFinal)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 mt-4 pt-3 border-t">
                        <button onClick={() => setModalPacote(pacote)} className="flex-1 text-xs py-1.5 border rounded hover:bg-gray-50">Editar</button>
                        <button onClick={() => duplicarPacote(pacote)} className="flex-1 text-xs py-1.5 border rounded hover:bg-gray-50">Duplicar</button>
                        <button onClick={() => toggleAtivoPacote(pacote)} className="flex-1 text-xs py-1.5 border rounded hover:bg-gray-50">
                          {pacote.ativo ? 'Desativar' : 'Reativar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {pacotes.length === 0 && <p className="text-center py-8 text-gray-400">Nenhum pacote cadastrado</p>}

              {/* Modal Pacote */}
              {modalPacote !== null && (
                <PacoteModal
                  pacote={modalPacote}
                  itensDisponiveis={itens.filter(i => i.ativo)}
                  onSave={salvarPacote}
                  onClose={() => setModalPacote(null)}
                />
              )}
            </div>
          )}


          {/* ===== ABA CATEGORIAS ===== */}
          {abaAtiva === 'categorias' && (
            <div>
              {/* Criar nova */}
              <div className="flex gap-3 mb-6 items-center">
                <input type="text" placeholder="Nome da categoria" value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-xs" />
                <input type="color" value={novaCor} onChange={e => setNovaCor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border" />
                <button onClick={criarCategoria} style={{ backgroundColor: ACCENT }} className="px-4 py-2 text-white rounded-lg text-sm hover:opacity-90">
                  Criar Categoria
                </button>
              </div>

              {/* Lista */}
              <div className="bg-white border rounded-lg divide-y">
                {categorias.map(cat => {
                  const qtdItens = itens.filter(i => i.categoria_id === cat.id).length;
                  return (
                    <div key={cat.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.cor || '#ccc' }} />
                        {editandoCategoria === cat.id ? (
                          <input autoFocus defaultValue={cat.nome}
                            onBlur={e => renomearCategoria(cat, e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && renomearCategoria(cat, e.target.value)}
                            className="border rounded px-2 py-1 text-sm" />
                        ) : (
                          <span className="text-sm font-medium text-gray-800" onDoubleClick={() => setEditandoCategoria(cat.id)}>
                            {cat.nome}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-400">{qtdItens} {qtdItens === 1 ? 'item' : 'itens'}</span>
                        <button onClick={() => excluirCategoria(cat)} className="text-red-400 hover:text-red-600" title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {categorias.length === 0 && <p className="text-center py-8 text-gray-400">Nenhuma categoria</p>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


// ===== Modal de Pacote (PRS-06, PRS-08) =====
function PacoteModal({ pacote, itensDisponiveis, onSave, onClose }) {
  const [nome, setNome] = useState(pacote.nome || '');
  const [descricao, setDescricao] = useState(pacote.descricao || '');
  const [itensSelecionados, setItensSelecionados] = useState(pacote.itens || []);
  const [descontoTipo, setDescontoTipo] = useState(pacote.desconto_tipo || 'percentual');
  const [descontoValor, setDescontoValor] = useState(pacote.desconto_valor || 0);
  const [exibirAoCliente, setExibirAoCliente] = useState(pacote.exibir_ao_cliente ?? true);

  const toggleItem = (item) => {
    setItensSelecionados(prev => {
      const idx = prev.findIndex(i => i.id === item.id);
      if (idx >= 0) return prev.filter(i => i.id !== item.id);
      return [...prev, { ...item, quantidade: 1 }];
    });
  };

  const setQuantidade = (itemId, qtd) => {
    setItensSelecionados(prev => prev.map(i => i.id === itemId ? { ...i, quantidade: Math.max(1, qtd) } : i));
  };

  const subtotal = itensSelecionados.reduce((s, i) => s + (i.valor_base || 0) * (i.quantidade || 1), 0);
  const desconto = descontoTipo === 'percentual' ? subtotal * descontoValor / 100 : Number(descontoValor);
  const valorFinal = Math.max(0, subtotal - desconto);

  const formatCurrency = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSave = () => {
    onSave({ ...pacote, nome, descricao, itens: itensSelecionados, desconto_tipo: descontoTipo, desconto_valor: Number(descontoValor), exibir_ao_cliente: exibirAoCliente });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{pacote.id ? 'Editar Pacote' : 'Novo Pacote'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Nome *</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
          </div>

          {/* Seletor de itens */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Itens do pacote</label>
            <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
              {itensDisponiveis.map(item => {
                const selecionado = itensSelecionados.find(i => i.id === item.id);
                return (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-2">
                    <input type="checkbox" checked={!!selecionado} onChange={() => toggleItem(item)} className="accent-orange-600" />
                    <span className="flex-1 text-sm">{item.nome}</span>
                    <span className="text-xs text-gray-400">{formatCurrency(item.valor_base)}</span>
                    {selecionado && (
                      <input type="number" min={1} value={selecionado.quantidade} onChange={e => setQuantidade(item.id, Number(e.target.value))}
                        className="w-14 border rounded px-2 py-1 text-xs text-center" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desconto */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">Tipo desconto</label>
              <select value={descontoTipo} onChange={e => setDescontoTipo(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm">
                <option value="percentual">Percentual (%)</option>
                <option value="fixo">Fixo (R$)</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">Valor desconto</label>
              <input type="number" min={0} value={descontoValor} onChange={e => setDescontoValor(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-1">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-sm text-red-500"><span>Desconto</span><span>-{formatCurrency(desconto)}</span></div>
            <div className="flex justify-between text-base font-bold border-t pt-2" style={{ color: ACCENT }}>
              <span>Valor Final</span><span>{formatCurrency(valorFinal)}</span>
            </div>
          </div>

          {/* Toggle exibir */}
          <div className="flex items-center gap-3">
            <button onClick={() => setExibirAoCliente(!exibirAoCliente)}
              className={`relative w-10 h-5 rounded-full transition-colors ${exibirAoCliente ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${exibirAoCliente ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className="text-sm text-gray-700">Exibir ao cliente</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={!nome.trim()} style={{ backgroundColor: ACCENT }}
            className="px-4 py-2 text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
            Salvar Pacote
          </button>
        </div>
      </div>
    </div>
  );
}
