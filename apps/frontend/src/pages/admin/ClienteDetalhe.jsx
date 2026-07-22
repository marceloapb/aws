import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  User, Edit2, MessageCircle, Mail, ChevronDown, ArrowLeft,
  FileText, FolderOpen, Image, CreditCard, Clock, StickyNote,
  UserPlus, FileCheck, CheckCircle, DollarSign, Camera, Star, Users
} from 'lucide-react';

const ACCENT = '#EA580C';
const STATUS_PIPELINE = ['Lead', 'Contato', 'Negociação', 'Cliente', 'Inativo'];
const STATUS_COLORS = {
  Lead: 'bg-blue-100 text-blue-700', Contato: 'bg-yellow-100 text-yellow-700',
  'Negociação': 'bg-purple-100 text-purple-700', Cliente: 'bg-green-100 text-green-700',
  Inativo: 'bg-gray-100 text-gray-500',
};

export default function ClienteDetalhe() {
  const { id } = useParams();
  const { authFetch, user } = useAuth();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [orcamentos, setOrcamentos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [albuns, setAlbuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusOpen, setStatusOpen] = useState(false);
  const [nota, setNota] = useState('');

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const [cliRes, orcRes, contRes, albRes] = await Promise.all([
        authFetch(`/admin/clientes/${id}`).then(r => r.json()),
        authFetch(`/admin/orcamentos?cliente_id=${id}`).then(r => r.json()).catch(() => ({ data: [] })),
        authFetch(`/admin/contratos?cliente_id=${id}`).then(r => r.json()).catch(() => ({ data: [] })),
        authFetch(`/admin/albuns?cliente_id=${id}`).then(r => r.json()).catch(() => ({ data: [] })),
      ]);
      if (cliRes.success) setCliente(cliRes.data);
      setOrcamentos(orcRes.data || []);
      setContratos(contRes.data || []);
      setAlbuns(albRes.data || []);
    } catch {}
    setLoading(false);
  };

  const changeStatus = async (novoStatus) => {
    setStatusOpen(false);
    const res = await authFetch(`/admin/clientes/${id}`, {
      method: 'PUT', body: JSON.stringify({ status: novoStatus }),
    });
    const data = await res.json();
    if (data.success) setCliente(prev => ({ ...prev, status: novoStatus }));
  };

  const addNota = async () => {
    if (!nota.trim()) return;
    const notas = [...(cliente.notas || []), { texto: nota, data: new Date().toISOString(), autor: user?.name || 'Admin' }];
    const res = await authFetch(`/admin/clientes/${id}`, {
      method: 'PUT', body: JSON.stringify({ notas }),
    });
    const data = await res.json();
    if (data.success) { setCliente(prev => ({ ...prev, notas })); setNota(''); }
  };

  const buildTimeline = () => {
    const events = [];
    if (cliente.created) events.push({ icon: UserPlus, desc: 'Cliente cadastrado', date: cliente.created });
    orcamentos.forEach(o => {
      events.push({ icon: FileText, desc: `Orçamento criado – ${o.tipo_evento || 'Evento'}`, date: o.created });
      if (o.status === 'aceito') events.push({ icon: FileCheck, desc: 'Orçamento aceito', date: o.updated || o.created });
    });
    contratos.forEach(c => {
      if (c.status === 'assinado') events.push({ icon: CheckCircle, desc: 'Contrato assinado', date: c.data_assinatura || c.updated || c.created });
    });
    orcamentos.forEach(o => {
      if (o.valor_pago > 0) events.push({ icon: DollarSign, desc: `Pagamento recebido – R$ ${o.valor_pago.toLocaleString('pt-BR')}`, date: o.updated || o.created });
    });
    albuns.forEach(a => {
      if (a.status === 'publicado') events.push({ icon: Camera, desc: `Álbum entregue – ${a.titulo || 'Álbum'}`, date: a.updated || a.created });
    });
    if (cliente.feedback) events.push({ icon: Star, desc: 'Feedback recebido', date: cliente.feedback_date || cliente.updated });
    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;
  if (!cliente) return <div className="text-center py-20 text-gray-400">Cliente não encontrado</div>;

  const nome = cliente.nome || cliente.name || '';
  const status = cliente.status || 'Lead';
  const totalPago = orcamentos.reduce((s, o) => s + (o.valor_pago || 0), 0);
  const totalPendente = orcamentos.reduce((s, o) => s + ((o.valor_total || 0) - (o.valor_pago || 0)), 0);
  const timeline = buildTimeline();

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate('/admin/clientes')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-3">
            <Users size={24} style={{ color: '#EA580C' }} />
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white" style={{ background: ACCENT }}>
              {nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{nome}</h1>
              <p className="text-sm text-gray-500">{cliente.email}</p>
              <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 relative">
            <button onClick={() => navigate(`/admin/clientes/${id}/editar`)} className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
              <Edit2 size={14} /> Editar
            </button>
            {cliente.whatsapp && (
              <a href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
                <MessageCircle size={14} /> WhatsApp
              </a>
            )}
            {cliente.email && (
              <a href={`mailto:${cliente.email}`} className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
                <Mail size={14} /> Email
              </a>
            )}
            <div className="relative">
              <button onClick={() => setStatusOpen(!statusOpen)} className="inline-flex items-center gap-1 px-3 py-2 text-white rounded-lg text-sm" style={{ background: ACCENT }}>
                Mudar Status <ChevronDown size={14} />
              </button>
              {statusOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white border rounded-lg shadow-lg z-20">
                  {STATUS_PIPELINE.map(s => (
                    <button key={s} onClick={() => changeStatus(s)} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${s === status ? 'font-bold' : ''}`}>{s}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dados do Cliente */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Dados do Cliente</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {[
            ['Telefone', cliente.telefone || cliente.phone],
            ['WhatsApp', cliente.whatsapp],
            ['Instagram', cliente.instagram ? `@${cliente.instagram.replace('@', '')}` : null],
            ['CPF', cliente.cpf],
            ['Data Nasc.', cliente.data_nascimento ? new Date(cliente.data_nascimento).toLocaleDateString('pt-BR') : null],
            ['Como conheceu', cliente.como_conheceu],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label}><span className="text-gray-500">{label}:</span> <span className="font-medium text-gray-900">{value}</span></div>
          ))}
        </div>

        {/* Endereço */}
        {(() => {
          const end = cliente.endereco || {};
          const cidade = end.cidade || cliente.cidade;
          const estado = end.estado || cliente.estado;
          const hasEndereco = end.cep || end.logradouro || end.bairro || cidade;
          if (!hasEndereco) return null;
          return (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Endereço</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                {[
                  ['CEP', end.cep],
                  ['Logradouro', [end.logradouro, end.numero].filter(Boolean).join(', ')],
                  ['Complemento', end.complemento],
                  ['Bairro', end.bairro],
                  ['Cidade/UF', cidade ? `${cidade}${estado ? '/' + estado : ''}` : null],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label}><span className="text-gray-500">{label}:</span> <span className="font-medium text-gray-900">{value}</span></div>
                ))}
              </div>
            </div>
          );
        })()}

        {cliente.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {cliente.tags.map((tag, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: `${ACCENT}15`, color: ACCENT }}>{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* CLI-08 Notas Internas */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4"><StickyNote size={16} /> Notas</h2>
        <div className="flex gap-2 mb-4">
          <textarea value={nota} onChange={e => setNota(e.target.value)} rows={2} placeholder="Adicionar nota interna..." className="flex-1 border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-200" />
          <button onClick={addNota} disabled={!nota.trim()} className="self-end px-4 py-2 text-white rounded-lg text-sm disabled:opacity-40" style={{ background: ACCENT }}>Adicionar</button>
        </div>
        {(cliente.notas || []).length === 0 ? <p className="text-sm text-gray-400">Nenhuma nota</p> : (
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {[...(cliente.notas || [])].reverse().map((n, i) => (
              <div key={i} className="border-l-2 pl-3 py-1" style={{ borderColor: ACCENT }}>
                <p className="text-sm text-gray-800">{n.texto}</p>
                <p className="text-xs text-gray-400 mt-1">{n.autor} • {new Date(n.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CLI-04 Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4"><Clock size={16} /> Histórico</h2>
        {timeline.length === 0 ? <p className="text-sm text-gray-400">Nenhum evento</p> : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
            {timeline.slice(0, 15).map((ev, i) => {
              const Icon = ev.icon;
              return (
                <div key={i} className="relative flex items-start gap-3">
                  <div className="absolute -left-6 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center" style={{ borderColor: ACCENT }}>
                    <Icon size={12} style={{ color: ACCENT }} />
                  </div>
                  <div className="ml-2">
                    <p className="text-sm text-gray-800">{ev.desc}</p>
                    <p className="text-xs text-gray-400">{ev.date ? new Date(ev.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Histórico Consolidado */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3"><FileText size={16} /> Orçamentos</h3>
          {orcamentos.length === 0 ? <p className="text-sm text-gray-400">Nenhum</p> : (
            <div className="space-y-2">{orcamentos.slice(0, 5).map(o => (
              <div key={o.id} onClick={() => navigate(`/admin/orcamentos/${o.id}`)} className="flex justify-between p-2 rounded hover:bg-gray-50 cursor-pointer">
                <div><p className="text-sm font-medium">{o.tipo_evento || 'Orçamento'}</p><p className="text-xs text-gray-400">{o.created ? new Date(o.created).toLocaleDateString('pt-BR') : ''}</p></div>
                <span className="text-sm font-medium">R$ {(o.valor_total || 0).toLocaleString('pt-BR')}</span>
              </div>
            ))}</div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3"><FolderOpen size={16} /> Contratos</h3>
          {contratos.length === 0 ? <p className="text-sm text-gray-400">Nenhum</p> : (
            <div className="space-y-2">{contratos.slice(0, 5).map(c => (
              <div key={c.id} className="flex justify-between p-2 rounded hover:bg-gray-50">
                <div><p className="text-sm font-medium">Contrato #{c.id?.slice(0, 8)}</p><p className="text-xs text-gray-400">{c.created ? new Date(c.created).toLocaleDateString('pt-BR') : ''}</p></div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'assinado' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>{c.status || 'pendente'}</span>
              </div>
            ))}</div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3"><Image size={16} /> Álbuns</h3>
          {albuns.length === 0 ? <p className="text-sm text-gray-400">Nenhum</p> : (
            <div className="space-y-2">{albuns.slice(0, 5).map(a => (
              <div key={a.id} className="flex justify-between p-2 rounded hover:bg-gray-50">
                <p className="text-sm font-medium">{a.titulo || 'Álbum'}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === 'publicado' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{a.status || 'rascunho'}</span>
              </div>
            ))}</div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3"><CreditCard size={16} /> Financeiro</h3>
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-sm text-gray-500">Total Pago</span><span className="text-sm font-semibold text-green-600">R$ {totalPago.toLocaleString('pt-BR')}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Pendente</span><span className="text-sm font-semibold text-orange-600">R$ {totalPendente.toLocaleString('pt-BR')}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
