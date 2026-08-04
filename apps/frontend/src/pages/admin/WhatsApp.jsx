import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  MessageCircle, Send, CheckCheck, Check, Clock, AlertCircle, X, Wifi, WifiOff,
  RefreshCw, Copy, Eye, EyeOff, Plus, ChevronDown, ChevronUp, ExternalLink,
  BarChart3, DollarSign, Phone, Shield, Trash2, Edit, Upload, Search, RotateCcw
} from 'lucide-react';
import { SortableHeader } from '../../components/ui';
import useSortable from '../../hooks/useSortable';

const ACCENT = '#EA580C';
const API = '/admin/whatsapp';
const TABS = ['Envios', 'Templates', 'Conversas', 'Custos'];
const EVENTOS = ['orcamento_enviado', 'contrato_pronto', 'pagamento_confirmado', 'album_publicado', 'lembrete_sessao'];
const STATUS_ENVIO = { enviado: { icon: Check, color: 'text-gray-500' }, entregue: { icon: CheckCheck, color: 'text-gray-500' }, lido: { icon: CheckCheck, color: 'text-blue-500' }, falhou: { icon: X, color: 'text-red-500' } };

const Badge = ({ children, color = 'gray' }) => {
  const colors = { green: 'bg-green-100 text-green-800', red: 'bg-red-100 text-red-800', orange: 'bg-orange-100 text-orange-800', gray: 'bg-gray-100 text-gray-700', blue: 'bg-blue-100 text-blue-800', yellow: 'bg-yellow-100 text-yellow-800' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>{children}</span>;
};

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><X size={20} /></button>
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
};

export default function WhatsApp() {
  const { authFetch } = useAuth();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Conexão
  const [conexao, setConexao] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [credsOpen, setCredsOpen] = useState(false);

  // Templates
  const [templates, setTemplates] = useState([]);
  const [tplModal, setTplModal] = useState(false);
  const [tplForm, setTplForm] = useState({ nome: '', categoria: 'utility', idioma: 'pt_BR', corpo: '', variaveis: [], evento: '', header: '', header_type: 'TEXT', header_image_key: '' });
  const [editTplId, setEditTplId] = useState(null);
  const [uploadingHeaderImg, setUploadingHeaderImg] = useState(false);

  // Envios
  const [envios, setEnvios] = useState([]);
  const [envioFiltro, setEnvioFiltro] = useState({ periodo: '', status: 'todos', busca: '' });
  const [sendTplModal, setSendTplModal] = useState(false);
  const [sendTxtModal, setSendTxtModal] = useState(false);
  const [sendForm, setSendForm] = useState({ clienteId: '', templateId: '', variaveis: [], texto: '' });
  const [clientes, setClientes] = useState([]);

  // Conversas
  const [conversas, setConversas] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [resposta, setResposta] = useState('');
  const chatRef = useRef(null);

  // Custos
  const [custos, setCustos] = useState(null);

  useEffect(() => { loadTab(); }, [tab]);

  const loadTab = async () => {
    setLoading(true);
    try {
      if (tab === 0) {
        const [e, c] = await Promise.all([authFetch(`${API}/envios`).then(r => r.json()), authFetch('/admin/clientes').then(r => r.json())]);
        setEnvios(e.data || []); setClientes(c.data || []);
        const t = await authFetch(`${API}/templates`).then(r => r.json()); setTemplates(t.data || []);
      } else if (tab === 1) {
        const t = await authFetch(`${API}/templates`).then(r => r.json()); setTemplates(t.data || []);
      } else if (tab === 2) {
        const r = await authFetch(`${API}/conversas`); const d = await r.json(); setConversas(d.data || []);
      } else if (tab === 3) {
        const r = await authFetch(`${API}/custos`); const d = await r.json(); setCustos(d.data);
      }
    } catch {}
    setLoading(false);
  };

  const copyText = (text) => { navigator.clipboard.writeText(text); };

  // === Conexão handlers ===
  const testarConexao = async () => { await authFetch(`${API}/conexao/testar`, { method: 'POST' }); loadTab(); };
  const toggleModo = async () => {
    const novo = conexao.modo === 'producao' ? 'desenvolvimento' : 'producao';
    await authFetch(`${API}/conexao`, { method: 'PUT', body: JSON.stringify({ modo: novo }) });
    loadTab();
  };

  const renderConexao = () => {
    if (!conexao) return <p className="text-gray-500">Carregando...</p>;
    const online = conexao.status === 'conectado';
    const verBadge = { verificado: 'green', pendente: 'yellow', rejeitado: 'red' };
    return (
      <div className="space-y-4">
        {/* Status Card */}
        <div className="bg-white border rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {online ? <Wifi className="text-green-500" size={24} /> : <WifiOff className="text-red-500" size={24} />}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge color={online ? 'green' : 'red'}>{online ? 'Conectado' : 'Desconectado'}</Badge>
                {conexao.verificacao && <Badge color={verBadge[conexao.verificacao] || 'gray'}>{conexao.verificacao}</Badge>}
              </div>
              <p className="text-sm text-gray-600 mt-1 break-all">{conexao.telefone || '—'} • WABA: {conexao.wabaId || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-500">Modo:</span>
            <button onClick={toggleModo} className="px-3 py-1 rounded text-xs font-medium border" style={conexao.modo === 'producao' ? { background: ACCENT, color: '#fff', borderColor: ACCENT } : {}}>
              {conexao.modo === 'producao' ? 'Produção' : 'Desenvolvimento'}
            </button>
          </div>
        </div>

        {/* Credenciais */}
        <div className="bg-white border rounded-lg">
          <button onClick={() => setCredsOpen(!credsOpen)} className="w-full p-4 flex items-center justify-between text-left">
            <span className="font-medium text-sm">Credenciais</span>
            {credsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {credsOpen && (
            <div className="px-4 pb-4 space-y-3 border-t pt-3">
              <div>
                <label className="text-xs text-gray-500">Token Permanente</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type={showToken ? 'text' : 'password'} readOnly value={conexao.token || ''} className="flex-1 border rounded px-2 py-1 text-sm bg-gray-50" />
                  <button onClick={() => setShowToken(!showToken)} className="text-gray-400 hover:text-gray-600">{showToken ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Verify Token</label>
                <div className="flex items-center gap-2 mt-1">
                  <input readOnly value={conexao.verifyToken || ''} className="flex-1 border rounded px-2 py-1 text-sm bg-gray-50" />
                  <button onClick={() => copyText(conexao.verifyToken)} className="text-gray-400 hover:text-gray-600"><Copy size={16} /></button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Phone Number ID</label>
                <input readOnly value={conexao.phoneNumberId || ''} className="w-full border rounded px-2 py-1 text-sm bg-gray-50 mt-1" />
              </div>
            </div>
          )}
        </div>

        {/* Webhook */}
        <div className="bg-white border rounded-lg p-4">
          <label className="text-xs text-gray-500">Webhook URL</label>
          <div className="flex items-center gap-2 mt-1">
            <input readOnly value={conexao.webhookUrl || ''} className="flex-1 border rounded px-2 py-1 text-sm bg-gray-50" />
            <button onClick={() => copyText(conexao.webhookUrl)} className="text-gray-400 hover:text-gray-600"><Copy size={16} /></button>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <button onClick={testarConexao} className="px-4 py-2 rounded text-sm text-white font-medium" style={{ background: ACCENT }}>Testar Conexão</button>
          <button onClick={testarConexao} className="px-4 py-2 rounded text-sm border font-medium hover:bg-gray-50">Verificar Número</button>
        </div>
      </div>
    );
  };



  // === Templates handlers ===
  const openNewTpl = () => { setTplForm({ nome: '', categoria: 'UTILITY', idioma: 'pt_BR', corpo: '', variaveis: [], evento: '', header: '', header_type: 'TEXT', header_image_key: '' }); setEditTplId(null); setTplModal(true); };
  const openEditTpl = (t) => {
    setTplForm({ nome: t.nome, categoria: t.categoria, idioma: t.idioma, corpo: t.corpo, variaveis: t.variaveis || [], evento: '', header: t.header?.texto || '', header_type: (t.header?.tipo || 'TEXT').toUpperCase(), header_image_key: t.header?.exemplo_url || '' });
    setEditTplId(t.id);
    setTplModal(true);
  };
  const saveTpl = async () => {
    try {
      const payload = { ...tplForm };
      // Se header é imagem, montar campos para a API
      if (tplForm.header_type === 'IMAGE' && tplForm.header_image_key) {
        const CDN_BASE = 'https://d2112x4m4e89fv.cloudfront.net';
        payload.header_type = 'IMAGE';
        const imageUrl = tplForm.header_image_key.startsWith('http')
          ? tplForm.header_image_key
          : `${CDN_BASE}/${tplForm.header_image_key}`;

        // Fazer upload da imagem para a Meta e obter o handle
        const handleResp = await authFetch(`${API}/upload-media-handle`, {
          method: 'POST',
          body: JSON.stringify({ image_url: imageUrl, content_type: 'image/png' }),
        });
        const handleData = await handleResp.json();
        if (!handleData.success || !handleData.data?.handle) {
          alert(handleData.message || 'Erro ao fazer upload da imagem para a Meta. Tente novamente.');
          return;
        }
        payload.header_example_url = handleData.data.handle;
        payload.header = '';
      } else if (tplForm.header_type === 'TEXT') {
        // header texto normal — não enviar header_type para usar lógica de texto
        delete payload.header_type;
        delete payload.header_image_key;
      } else {
        // NONE — sem header
        payload.header = '';
        delete payload.header_type;
        delete payload.header_image_key;
      }
      // Limpar campos internos do form que não vão para a API
      delete payload.evento;
      delete payload.header_image_key;

      if (editTplId) {
        const resp = await authFetch(`${API}/templates/${editTplId}`, { method: 'PUT', body: JSON.stringify(payload) });
        const data = await resp.json();
        if (!data.success) { alert(data.message || 'Erro ao editar template'); return; }
        if (data.recreated) {
          alert('Template recriado com nova imagem! Aguardando aprovação da Meta (pode levar minutos).');
        } else {
          alert('Template atualizado! Ficará pendente de re-aprovação pela Meta.');
        }
      } else {
        const resp = await authFetch(`${API}/templates`, { method: 'POST', body: JSON.stringify(payload) });
        const data = await resp.json();
        if (!data.success) { alert(data.message || 'Erro ao criar template'); return; }
        alert(`Template criado! Status: ${data.data?.status || 'PENDING'}`);
      }
      setTplModal(false); loadTab();
    } catch (err) { alert('Erro: ' + err.message); }
  };
  const deleteTpl = async (nome) => {
    if (!window.confirm(`Deletar template "${nome}"? O nome ficará indisponível por 4 semanas.`)) return;
    const resp = await authFetch(`${API}/templates/${nome}`, { method: 'DELETE' });
    const data = await resp.json();
    if (!data.success) { alert(data.message || 'Erro ao deletar'); return; }
    loadTab();
  };
  const syncTodos = () => { loadTab(); };
  const addVariavel = () => { setTplForm({ ...tplForm, variaveis: [...tplForm.variaveis, { indice: tplForm.variaveis.length + 1, descricao: '', exemplo: '' }] }); };

  // Upload de imagem do header do template
  const handleTplHeaderImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Selecione um arquivo de imagem'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Imagem deve ter no máximo 5MB'); return; }

    setUploadingHeaderImg(true);
    try {
      const res = await authFetch('/admin/upload/presign', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, contentType: file.type, folder: 'template-headers' }),
      });
      const data = await res.json();
      if (!data.success) { alert(data.message || 'Erro ao obter URL de upload'); return; }

      const uploadUrl = data.data.upload_url;
      const key = data.data.key;

      await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });

      setTplForm(prev => ({ ...prev, header_image_key: key }));
    } catch (err) { alert('Erro ao enviar imagem: ' + err.message); }
    finally { setUploadingHeaderImg(false); e.target.value = ''; }
  };

  const highlightVars = (text) => {
    if (!text) return text;
    return text.split(/(\{\{\d+\}\})/).map((part, i) => /\{\{\d+\}\}/.test(part) ? <span key={i} style={{ color: ACCENT, fontWeight: 600 }}>{part}</span> : part);
  };

  const renderTemplates = () => {
    const catColor = { utility: 'blue', marketing: 'orange', authentication: 'green' };
    const stColor = { aprovado: 'green', pendente: 'yellow', rejeitado: 'red' };
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <button onClick={syncTodos} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"><RefreshCw size={14} /> Atualizar</button>
          <button onClick={openNewTpl} className="flex items-center gap-1 px-3 py-2 rounded text-sm text-white font-medium" style={{ background: ACCENT }}><Plus size={14} /> Novo Template</button>
        </div>
        <div className="grid gap-3">
          {templates.map(t => (
            <div key={t.id} className="bg-white border rounded-lg p-4 overflow-hidden">
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="font-medium text-sm font-mono break-all">{t.nome}</span>
                  <Badge color={catColor[t.categoria] || 'gray'}>{t.categoria}</Badge>
                  <Badge color={stColor[t.status] || 'gray'}>{t.status}</Badge>
                  <span className="text-xs text-gray-400">{t.idioma}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {t.categoria !== 'authentication' && <button onClick={() => openEditTpl(t)} className="p-1 text-gray-400 hover:text-blue-600" title="Editar texto"><Edit size={14} /></button>}
                  <button onClick={() => deleteTpl(t.nome)} className="p-1 text-gray-400 hover:text-red-600" title="Deletar"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-sm text-gray-600 break-words">{highlightVars(t.corpo)}</p>
              {t.header?.tipo === 'image' && t.header?.exemplo_url && (
                <img src={t.header.exemplo_url} alt="Header" className="w-full max-h-32 object-cover rounded mt-2 border" loading="lazy" />
              )}
              {t.header?.tipo === 'text' && t.header?.texto && (
                <p className="text-xs text-gray-500 mt-1 font-medium">📌 {t.header.texto}</p>
              )}
              {t.footer && <p className="text-xs text-gray-400 mt-1">{t.footer}</p>}
              {t.botoes?.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {t.botoes.map((b, i) => (
                    <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">{b.text || b.otp_type || b.type}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {templates.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Nenhum template encontrado na Meta</p>}
        </div>

        {/* Modal Template */}
        <Modal open={tplModal} onClose={() => setTplModal(false)} title={editTplId ? 'Editar Template' : 'Novo Template (Meta WhatsApp)'}>
          <div className="space-y-3">
            <p className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded p-2">
              {editTplId ? 'Ao salvar, o template voltará para pendente de aprovação pela Meta.' : 'O template será criado diretamente na Meta e ficará pendente de aprovação (normalmente em minutos).'}
            </p>
            <div>
              <label className="text-xs text-gray-500">Nome (slug, apenas letras minúsculas e _)</label>
              <input value={tplForm.nome} onChange={e => setTplForm({ ...tplForm, nome: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} disabled={!!editTplId} className="w-full border rounded px-2 py-1.5 text-sm mt-1 disabled:bg-gray-100" placeholder="ex: lembrete_sessao" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Categoria</label>
                <select value={tplForm.categoria} onChange={e => setTplForm({ ...tplForm, categoria: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm mt-1">
                  <option value="UTILITY">Utility</option><option value="MARKETING">Marketing</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Idioma</label>
                <select value={tplForm.idioma} onChange={e => setTplForm({ ...tplForm, idioma: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm mt-1">
                  <option value="pt_BR">Português (BR)</option><option value="en_US">English (US)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Tipo de Cabeçalho</label>
              <select value={tplForm.header_type} onChange={e => setTplForm({ ...tplForm, header_type: e.target.value, header: '', header_image_key: '' })} className="w-full border rounded px-2 py-1.5 text-sm mt-1">
                <option value="NONE">Nenhum</option>
                <option value="TEXT">Texto</option>
                <option value="IMAGE">Imagem</option>
              </select>
            </div>
            {tplForm.header_type === 'TEXT' && (
              <div>
                <label className="text-xs text-gray-500">Texto do Cabeçalho</label>
                <input value={tplForm.header} onChange={e => setTplForm({ ...tplForm, header: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm mt-1" placeholder="ex: Marcelo Bloise Fotografia - Notificação" />
              </div>
            )}
            {tplForm.header_type === 'IMAGE' && (
              <div>
                <label className="text-xs text-gray-500">Imagem do Cabeçalho (obrigatório para aprovação)</label>
                {tplForm.header_image_key ? (
                  <div className="mt-2 space-y-2">
                    <img src={tplForm.header_image_key.startsWith('http') ? tplForm.header_image_key : `https://d2112x4m4e89fv.cloudfront.net/${tplForm.header_image_key}`} alt="Header" className="w-full max-h-40 object-cover rounded border" />
                    <button onClick={() => setTplForm({ ...tplForm, header_image_key: '' })} className="text-xs text-red-500 hover:text-red-700">Remover imagem</button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <label className={`inline-flex items-center gap-2 px-3 py-2 rounded border text-sm cursor-pointer hover:bg-gray-50 ${uploadingHeaderImg ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Upload size={14} />
                      {uploadingHeaderImg ? 'Enviando...' : 'Selecionar imagem'}
                      <input type="file" accept="image/*" onChange={handleTplHeaderImageUpload} className="hidden" />
                    </label>
                    <p className="text-xs text-gray-400 mt-1">JPG ou PNG, máx 5MB. A Meta recomenda 820x312px.</p>
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500">Corpo da mensagem</label>
              <textarea value={tplForm.corpo} onChange={e => setTplForm({ ...tplForm, corpo: e.target.value })} rows={5} className="w-full border rounded px-2 py-1.5 text-sm mt-1 font-mono" placeholder={"Olá {{1}}, seu orçamento de {{2}} está pronto!\n\nAcesse: {{3}}"} />
              <p className="text-xs text-gray-400 mt-1">Use {'{{1}}'}, {'{{2}}'}, etc. para variáveis dinâmicas. Mantenha proporção de texto fixo {'>'} variáveis.</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Exemplos das variáveis (obrigatório para aprovação)</label>
              {tplForm.variaveis.map((v, i) => (
                <div key={i} className="flex gap-2 mt-1">
                  <span className="text-xs text-gray-400 pt-2 whitespace-nowrap">{`{{${v.indice}}}`}</span>
                  <input placeholder="Exemplo" value={v.exemplo} onChange={e => { const vars = [...tplForm.variaveis]; vars[i].exemplo = e.target.value; setTplForm({ ...tplForm, variaveis: vars }); }} className="flex-1 border rounded px-2 py-1 text-sm" />
                </div>
              ))}
              <button onClick={addVariavel} className="text-xs mt-1" style={{ color: ACCENT }}>+ Adicionar variável</button>
            </div>
            <button onClick={saveTpl} disabled={!tplForm.nome || !tplForm.corpo} className="w-full py-2 rounded text-sm text-white font-medium mt-2 disabled:opacity-50" style={{ background: ACCENT }}>{editTplId ? 'Salvar Alterações' : 'Criar Template na Meta'}</button>
          </div>
        </Modal>
      </div>
    );
  };



  // === Envios handlers ===
  const enviarTemplate = async () => {
    const payload = { clienteId: sendForm.clienteId, templateId: sendForm.templateId, variaveis: sendForm.variaveis };

    // Se o template selecionado tem header de imagem, incluir info de mídia
    const selectedTpl = templates.find(t => t.id === sendForm.templateId);
    if (selectedTpl?.header?.tipo === 'image' && selectedTpl?.header?.exemplo_url) {
      payload.media_type = 'image';
      payload.media_url = selectedTpl.header.exemplo_url;
    }

    try {
      const resp = await authFetch(`${API}/enviar-template`, { method: 'POST', body: JSON.stringify(payload) });
      const data = await resp.json();
      if (!data.success) { alert(data.message || 'Erro ao enviar template'); return; }
    } catch (err) { alert('Erro ao enviar: ' + err.message); }
    setSendTplModal(false); setSendForm({ clienteId: '', templateId: '', variaveis: [], texto: '' }); loadTab();
  };
  const enviarTexto = async () => {
    await authFetch(`${API}/enviar-texto`, { method: 'POST', body: JSON.stringify({ clienteId: sendForm.clienteId, texto: sendForm.texto }) });
    setSendTxtModal(false); setSendForm({ clienteId: '', templateId: '', variaveis: [], texto: '' }); loadTab();
  };
  const reenviar = async (id) => { await authFetch(`${API}/enviar-template`, { method: 'POST', body: JSON.stringify({ reenviarId: id }) }); loadTab(); };

  const filteredEnvios = envios.filter(e => {
    if (envioFiltro.status !== 'todos' && e.status !== envioFiltro.status) return false;
    if (envioFiltro.busca && !e.destinatario?.toLowerCase().includes(envioFiltro.busca.toLowerCase())) return false;
    return true;
  });

  // Ordenação por coluna - Envios
  const { sortedData: sortedEnvios, requestSort: requestSortEnvios, getSortIndicator: getSortIndicatorEnvios } = useSortable(filteredEnvios, {
    defaultField: 'data',
    defaultDirection: 'desc',
  });

  const selectedTplVars = templates.find(t => t.id === sendForm.templateId)?.variaveis || [];

  const renderEnvios = () => (
    <div className="space-y-4">
      {/* Ações */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setSendTplModal(true)} className="flex items-center gap-1 px-3 py-2 rounded text-sm text-white font-medium" style={{ background: ACCENT }}><Send size={14} /> Enviar Template</button>
        <button onClick={() => setSendTxtModal(true)} className="flex items-center gap-1 px-3 py-2 rounded text-sm border font-medium hover:bg-gray-50"><MessageCircle size={14} /> Texto Livre</button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap items-center">
        <select value={envioFiltro.status} onChange={e => setEnvioFiltro({ ...envioFiltro, status: e.target.value })} className="border rounded px-2 py-1.5 text-sm">
          <option value="todos">Todos</option><option value="enviado">Enviado</option><option value="entregue">Entregue</option><option value="lido">Lido</option><option value="falhou">Falhou</option>
        </select>
        <div className="flex items-center gap-1 border rounded px-2 py-1.5">
          <Search size={14} className="text-gray-400" />
          <input placeholder="Buscar destinatário" value={envioFiltro.busca} onChange={e => setEnvioFiltro({ ...envioFiltro, busca: e.target.value })} className="text-sm outline-none w-40" />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <SortableHeader label="Destinatário" field="destinatario" onSort={requestSortEnvios} active={getSortIndicatorEnvios('destinatario')} />
              <SortableHeader label="Template/Tipo" field="templateNome" onSort={requestSortEnvios} active={getSortIndicatorEnvios('templateNome')} />
              <SortableHeader label="Status" field="status" onSort={requestSortEnvios} active={getSortIndicatorEnvios('status')} />
              <th className="text-left px-3 py-2 font-medium">Janela 24h</th>
              <SortableHeader label="Data" field="data" onSort={requestSortEnvios} active={getSortIndicatorEnvios('data')} />
              <SortableHeader label="Retries" field="retries" onSort={requestSortEnvios} active={getSortIndicatorEnvios('retries')} />
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sortedEnvios.map(e => {
              const St = STATUS_ENVIO[e.status];
              const Icon = St?.icon || Check;
              return (
                <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2">{e.destinatario}</td>
                  <td className="px-3 py-2">{e.templateNome || e.tipo || '—'}</td>
                  <td className="px-3 py-2"><span className={`flex items-center gap-1 ${St?.color || ''}`}><Icon size={14} /> {e.status}</span></td>
                  <td className="px-3 py-2">{e.janela24h ? <Badge color="green">Dentro</Badge> : <Badge color="gray">Fora</Badge>}</td>
                  <td className="px-3 py-2 text-gray-500">{e.data ? new Date(e.data).toLocaleString('pt-BR') : '—'}</td>
                  <td className="px-3 py-2 text-center">{e.retries || 0}</td>
                  <td className="px-3 py-2">
                    {e.status === 'falhou' && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => reenviar(e.id)} className="text-xs px-2 py-1 rounded border hover:bg-gray-50 flex items-center gap-1"><RotateCcw size={12} /> Reenviar</button>
                        {!e.janela24h && e.telefone && (
                          <a href={`https://wa.me/${e.telefone}`} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded border hover:bg-gray-50 flex items-center gap-1"><ExternalLink size={12} /> wa.me</a>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {sortedEnvios.length === 0 && <tr><td colSpan={7} className="text-center py-6 text-gray-400">Nenhum envio encontrado</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal Enviar Template */}
      <Modal open={sendTplModal} onClose={() => setSendTplModal(false)} title="Enviar Template">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Cliente</label>
            <select value={sendForm.clienteId} onChange={e => setSendForm({ ...sendForm, clienteId: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm mt-1">
              <option value="">Selecione</option>
              {clientes.filter(c => c.whatsapp || c.telefone).map(c => <option key={c.id} value={c.id}>{c.nome} ({c.whatsapp || c.telefone})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Template</label>
            <select value={sendForm.templateId} onChange={e => setSendForm({ ...sendForm, templateId: e.target.value, variaveis: [] })} className="w-full border rounded px-2 py-1.5 text-sm mt-1">
              <option value="">Selecione</option>
              {templates.filter(t => t.status === 'aprovado').map(t => <option key={t.id} value={t.id}>{t.nome}{t.header?.tipo === 'image' ? ' 🖼️' : ''}</option>)}
            </select>
          </div>
          {/* Preview do header de imagem se template selecionado tiver */}
          {sendForm.templateId && (() => {
            const tpl = templates.find(t => t.id === sendForm.templateId);
            if (tpl?.header?.tipo === 'image' && tpl?.header?.exemplo_url) {
              return (
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <p className="text-xs text-green-700 font-medium mb-1">📸 Este template inclui imagem no cabeçalho</p>
                  <img src={tpl.header.exemplo_url} alt="Header" className="w-full max-h-24 object-cover rounded" loading="lazy" />
                </div>
              );
            }
            return null;
          })()}
          {selectedTplVars.map((v, i) => (
            <div key={i}>
              <label className="text-xs text-gray-500">{`{{${v.indice}}} — ${v.descricao}`}</label>
              <input value={sendForm.variaveis[i] || ''} onChange={e => { const vars = [...sendForm.variaveis]; vars[i] = e.target.value; setSendForm({ ...sendForm, variaveis: vars }); }} placeholder={v.exemplo} className="w-full border rounded px-2 py-1.5 text-sm mt-1" />
            </div>
          ))}
          <button onClick={enviarTemplate} disabled={!sendForm.clienteId || !sendForm.templateId} className="w-full py-2 rounded text-sm text-white font-medium disabled:opacity-50" style={{ background: ACCENT }}>Enviar</button>
        </div>
      </Modal>

      {/* Modal Texto Livre */}
      <Modal open={sendTxtModal} onClose={() => setSendTxtModal(false)} title="Enviar Texto Livre">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Cliente</label>
            <select value={sendForm.clienteId} onChange={e => setSendForm({ ...sendForm, clienteId: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm mt-1">
              <option value="">Selecione</option>
              {clientes.filter(c => c.whatsapp || c.telefone).map(c => <option key={c.id} value={c.id}>{c.nome} ({c.whatsapp || c.telefone})</option>)}
            </select>
          </div>
          {sendForm.clienteId && !clientes.find(c => c.id === sendForm.clienteId)?.janela24h && (
            <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> Fora da janela 24h — envio não permitido</p>
          )}
          <div>
            <label className="text-xs text-gray-500">Mensagem</label>
            <textarea value={sendForm.texto} onChange={e => setSendForm({ ...sendForm, texto: e.target.value })} rows={4} className="w-full border rounded px-2 py-1.5 text-sm mt-1" />
          </div>
          <button onClick={enviarTexto} disabled={!sendForm.clienteId || !sendForm.texto} className="w-full py-2 rounded text-sm text-white font-medium disabled:opacity-50" style={{ background: ACCENT }}>Enviar</button>
        </div>
      </Modal>
    </div>
  );



  // === Conversas handlers ===
  // Auto-refresh conversas a cada 8s quando na aba Conversas
  useEffect(() => {
    if (tab !== 2) return;
    const interval = setInterval(async () => {
      try {
        const r = await authFetch(`${API}/conversas`);
        const d = await r.json();
        setConversas(d.data || []);
        // Se tem conversa aberta, recarregar mensagens
        if (selectedCliente) {
          const mr = await authFetch(`${API}/conversas/${selectedCliente}`);
          const md = await mr.json();
          const novasMsgs = md.data || [];
          if (novasMsgs.length !== mensagens.length) {
            setMensagens(novasMsgs);
            setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 100);
          }
        }
      } catch {}
    }, 8000);
    return () => clearInterval(interval);
  }, [tab, selectedCliente, mensagens.length]);

  const loadMensagens = async (clienteId) => {
    setSelectedCliente(clienteId);
    const r = await authFetch(`${API}/conversas/${clienteId}`);
    const d = await r.json();
    setMensagens(d.data || []);
    setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 100);
    // Marcar como lida (zerar contador local)
    setConversas(prev => prev.map(c => c.clienteId === clienteId ? { ...c, naoLidas: 0 } : c));
    // Marcar como lida no backend (fire and forget)
    authFetch(`${API}/conversas/${clienteId}/marcar-lida`, { method: 'POST' }).catch(() => {});
  };
  const refreshConversas = async () => {
    setLoading(true);
    try {
      const r = await authFetch(`${API}/conversas`);
      const d = await r.json();
      setConversas(d.data || []);
      if (selectedCliente) {
        const mr = await authFetch(`${API}/conversas/${selectedCliente}`);
        const md = await mr.json();
        setMensagens(md.data || []);
        setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 100);
      }
    } catch {}
    setLoading(false);
  };
  const enviarResposta = async () => {
    if (!resposta.trim() || !selectedCliente) return;
    await authFetch(`${API}/enviar-texto`, { method: 'POST', body: JSON.stringify({ clienteId: selectedCliente, texto: resposta }) });
    setResposta('');
    loadMensagens(selectedCliente);
  };

  const renderConversas = () => {
    const clienteSel = conversas.find(c => c.clienteId === selectedCliente);
    const janelaAberta = clienteSel?.janelaAberta;
    const janelaAte = clienteSel?.janelaAte;
    return (
      <div className="space-y-3">
        {/* Botão atualizar */}
        <div className="flex justify-end">
          <button onClick={refreshConversas} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 border rounded"><RefreshCw size={14} /> Atualizar</button>
        </div>
        <div className="flex flex-col md:flex-row border rounded-lg bg-white overflow-hidden" style={{ minHeight: 480 }}>
        {/* Sidebar */}
        <div className={`${selectedCliente ? 'hidden md:block' : 'block'} w-full md:w-52 border-b md:border-b-0 md:border-r overflow-y-auto md:max-h-[480px] max-h-60`}>
          {conversas.map(c => (
            <button key={c.clienteId} onClick={() => loadMensagens(c.clienteId)} className={`w-full text-left p-3 border-b hover:bg-gray-50 ${selectedCliente === c.clienteId ? 'bg-orange-50' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{c.nome}</span>
                {c.naoLidas > 0 && <span className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center" style={{ background: ACCENT }}>{c.naoLidas}</span>}
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5">{c.ultimaMensagem}</p>
            </button>
          ))}
          {conversas.length === 0 && <p className="text-xs text-gray-400 p-4 text-center">Nenhuma conversa</p>}
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col min-h-[380px] md:min-h-0">
          {selectedCliente ? (
            <>
              {/* Header */}
              <div className="px-4 py-2 border-b flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2 min-w-0">
                  <button onClick={() => setSelectedCliente(null)} className="md:hidden p-1 text-gray-500 hover:text-gray-700">
                    <ChevronDown size={16} className="rotate-90" />
                  </button>
                  <span className="text-sm font-medium truncate">{clienteSel?.nome}</span>
                  <span className="text-xs text-gray-400 hidden sm:inline">+{clienteSel?.telefone}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {janelaAberta ? <Badge color="green">Janela até {janelaAte}</Badge> : <Badge color="gray">Janela fechada</Badge>}
                  <button onClick={() => loadMensagens(selectedCliente)} className="text-gray-400 hover:text-gray-600"><RefreshCw size={14} /></button>
                </div>
              </div>
              {/* Messages */}
              <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {mensagens.map((m, i) => {
                  const isSistema = m.direcao === 'saida';
                  const StIcon = STATUS_ENVIO[m.status]?.icon || Check;
                  return (
                    <div key={i} className={`flex ${isSistema ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-lg px-3 py-2 ${isSistema ? 'text-white' : 'bg-gray-100 text-gray-800'}`} style={isSistema ? { background: ACCENT } : {}}>
                        {/* Image */}
                        {m.mediaUrl && m.tipo === 'image' && (
                          <a href={m.mediaUrl} target="_blank" rel="noreferrer">
                            <img src={m.mediaUrl} alt="Imagem" className="rounded max-w-full max-h-48 mb-1 cursor-pointer hover:opacity-90" loading="lazy" />
                          </a>
                        )}
                        {/* Audio */}
                        {m.mediaUrl && (m.tipo === 'audio' || m.mediaMime?.startsWith('audio/')) && (
                          <audio controls className="max-w-full mb-1" style={{ minWidth: '200px' }}>
                            <source src={m.mediaUrl} type={m.mediaMime || 'audio/ogg'} />
                            Seu navegador não suporta áudio.
                          </audio>
                        )}
                        {/* Video */}
                        {m.mediaUrl && m.tipo === 'video' && (
                          <video controls className="rounded max-w-full max-h-48 mb-1">
                            <source src={m.mediaUrl} type={m.mediaMime || 'video/mp4'} />
                          </video>
                        )}
                        {/* Document */}
                        {m.mediaUrl && m.tipo === 'document' && (
                          <a href={m.mediaUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-2 text-xs underline mb-1 ${isSistema ? 'text-orange-100' : 'text-blue-600'}`}>
                            📎 Documento
                          </a>
                        )}
                        {/* Sticker */}
                        {m.mediaUrl && m.tipo === 'sticker' && (
                          <img src={m.mediaUrl} alt="Sticker" className="max-w-[120px] mb-1" loading="lazy" />
                        )}
                        {/* Text */}
                        {m.texto && <p className="text-sm">{m.texto}</p>}
                        {/* Fallback for media without URL */}
                        {!m.mediaUrl && !m.texto && m.tipo !== 'text' && (
                          <p className="text-sm italic opacity-70">[{m.tipo}]</p>
                        )}
                        <div className={`flex items-center gap-1 mt-1 text-xs ${isSistema ? 'text-orange-200' : 'text-gray-400'}`}>
                          <span>{m.hora}</span>
                          {isSistema && <StIcon size={12} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {mensagens.length === 0 && <p className="text-center text-xs text-gray-400 mt-10">Selecione uma conversa</p>}
              </div>
              {/* Input */}
              <div className="border-t p-3 flex gap-2">
                <textarea value={resposta} onChange={e => setResposta(e.target.value)} disabled={!janelaAberta} placeholder={janelaAberta ? 'Digite sua resposta...' : 'Janela 24h fechada'} rows={1} className="flex-1 min-w-0 border rounded px-3 py-2 text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed" />
                <button onClick={enviarResposta} disabled={!janelaAberta || !resposta.trim()} className="px-3 py-2 rounded text-white disabled:opacity-50" style={{ background: ACCENT }}><Send size={16} /></button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 hidden md:flex">Selecione uma conversa à esquerda</div>
          )}
        </div>
      </div>
      </div>
    );
  };



  // === Custos ===
  const renderCustos = () => {
    if (!custos) return <p className="text-gray-400 text-sm">Carregando custos...</p>;
    const maxEnvio = Math.max(...(custos.porDia || []).map(d => d.qtd), 1);
    const budgetPct = custos.budget ? (custos.custoTotal / custos.budget) * 100 : 0;
    return (
      <div className="space-y-4">
        {/* Alerta budget */}
        {budgetPct > 80 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2 text-sm text-yellow-800">
            <AlertCircle size={16} /> Consumo em {budgetPct.toFixed(0)}% do orçamento mensal!
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total mês', value: custos.totalMes || 0, icon: MessageCircle },
            { label: 'Custo estimado', value: `R$ ${(custos.custoTotal || 0).toFixed(2)}`, icon: DollarSign },
            { label: 'Média/dia', value: (custos.mediaDia || 0).toFixed(1), icon: BarChart3 },
            { label: 'Templates vs Livre', value: `${custos.templates || 0} / ${custos.textoLivre || 0}`, icon: MessageCircle },
          ].map((kpi, i) => (
            <div key={i} className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1"><kpi.icon size={14} /><span className="text-xs">{kpi.label}</span></div>
              <p className="text-lg font-semibold">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Gráfico barras CSS */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3">Envios por dia (últimos 30 dias)</h4>
          <div className="flex items-end gap-1 h-32">
            {(custos.porDia || []).map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                <div className="w-full rounded-t" style={{ height: `${(d.qtd / maxEnvio) * 100}%`, background: ACCENT, minHeight: d.qtd > 0 ? 4 : 0 }} title={`${d.dia}: ${d.qtd} envios`} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">{custos.porDia?.[0]?.dia || ''}</span>
            <span className="text-xs text-gray-400">{custos.porDia?.[custos.porDia.length - 1]?.dia || ''}</span>
          </div>
        </div>

        {/* Tabela por tipo */}
        <div className="bg-white border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium cursor-default">Tipo</th>
                <th className="text-right px-4 py-2 font-medium cursor-default">Qtd</th>
                <th className="text-right px-4 py-2 font-medium cursor-default">Custo unitário</th>
                <th className="text-right px-4 py-2 font-medium cursor-default">Total</th>
              </tr>
            </thead>
            <tbody>
              {(custos.porTipo || []).map((t, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-2">{t.tipo}</td>
                  <td className="px-4 py-2 text-right">{t.qtd}</td>
                  <td className="px-4 py-2 text-right">R$ {(t.custoUnitario || 0).toFixed(4)}</td>
                  <td className="px-4 py-2 text-right font-medium">R$ {(t.total || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // === RENDER ===
  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle style={{ color: ACCENT }} size={24} /> WhatsApp Business
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === i ? 'border-current' : 'border-transparent text-gray-500 hover:text-gray-700'}`} style={tab === i ? { color: ACCENT, borderColor: ACCENT } : {}}>
            {t}
            {t === 'Conversas' && conversas.some(c => c.naoLidas > 0) && <span className="ml-1 w-2 h-2 rounded-full inline-block" style={{ background: ACCENT }} />}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><RefreshCw className="animate-spin text-gray-400" size={24} /></div>
      ) : (
        <>
          {tab === 0 && renderEnvios()}
          {tab === 1 && renderTemplates()}
          {tab === 2 && renderConversas()}
          {tab === 3 && renderCustos()}
        </>
      )}
    </div>
  );
}
