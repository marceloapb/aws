import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, Copy, Download, Trash2, Edit, RefreshCw,
  Clock, CheckCircle2, Eye, FileText, Plus, XCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ACCENT = '#EA580C';

const STATUS_CONFIG = {
  gerado: { label: 'Gerado', bg: 'bg-gray-100 text-gray-700' },
  enviado: { label: 'Enviado', bg: 'bg-blue-100 text-blue-700' },
  assinado: { label: 'Assinado', bg: 'bg-green-100 text-green-700' },
  expirado: { label: 'Expirado', bg: 'bg-red-100 text-red-700' },
};

const TIMELINE_STEPS = ['gerado', 'enviado', 'visualizado', 'assinado'];

export default function ContratoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [contrato, setContrato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => { fetchContrato(); }, [id]);

  async function fetchContrato() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/contratos/${id}`, { headers });
      const data = await res.json();
      setContrato(data);
    } catch (err) {
      console.error('Erro ao carregar contrato:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleEnviar() {
    await fetch(`/api/admin/contratos/${id}/enviar`, { method: 'POST', headers });
    fetchContrato();
  }

  async function handleDownloadPDF() {
    const res = await fetch(`/api/admin/contratos/${id}/pdf`, { method: 'POST', headers });
    const data = await res.json();
    if (data.url) window.open(data.url, '_blank');
  }

  function handleCopiarLink() {
    const link = `${window.location.origin}/contratos/${contrato.token}/assinar`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function calcCountdown(dataExp) {
    if (!dataExp) return null;
    const diff = new Date(dataExp) - new Date();
    if (diff <= 0) return 'Expirado';
    const dias = Math.floor(diff / 86400000);
    const horas = Math.floor((diff % 86400000) / 3600000);
    return `${dias}d ${horas}h restantes`;
  }

  function getTimelineIndex(status) {
    const map = { gerado: 0, enviado: 1, visualizado: 2, assinado: 3, expirado: 1 };
    return map[status] ?? 0;
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Clock className="animate-spin" /></div>;
  if (!contrato) return <div className="p-6 text-center text-gray-500">Contrato não encontrado.</div>;

  const statusIdx = getTimelineIndex(contrato.status);
  const statusCfg = STATUS_CONFIG[contrato.status] || STATUS_CONFIG.gerado;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Contrato #{contrato.id}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusCfg.bg}`}>{statusCfg.label}</span>
        </div>
        <div className="flex gap-2">
          <ActionButtons status={contrato.status} onEnviar={handleEnviar} onCopiar={handleCopiarLink}
            onPDF={handleDownloadPDF} onEditar={() => navigate(`/admin/contratos/${id}/editar`)}
            onExcluir={() => navigate('/admin/contratos')} copied={copied} />
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0" />
          <div className="absolute top-4 left-0 h-0.5 z-0" style={{ width: `${(statusIdx / 3) * 100}%`, backgroundColor: ACCENT }} />
          {TIMELINE_STEPS.map((step, i) => {
            const done = i <= statusIdx;
            const dateKey = `data_${step}`;
            return (
              <div key={step} className="flex flex-col items-center z-10 relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${done ? 'text-white' : 'bg-white border-gray-300 text-gray-400'}`}
                  style={done ? { backgroundColor: ACCENT, borderColor: ACCENT } : {}}>
                  {done ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                </div>
                <span className="text-xs font-medium mt-2 capitalize">{step}</span>
                {contrato[dateKey] && <span className="text-[10px] text-gray-400">{new Date(contrato[dateKey]).toLocaleDateString('pt-BR')}</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados do Contrato */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2"><FileText size={18} style={{ color: ACCENT }} /> Dados do Contrato</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Dado label="Cliente" value={contrato.cliente_nome} />
            <Dado label="Orçamento vinculado" value={contrato.orcamento_id ? `#${contrato.orcamento_id}` : '—'} />
            <Dado label="Valor total" value={contrato.valor_total ? `R$ ${Number(contrato.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'} />
            <Dado label="Modelo usado" value={contrato.modelo_nome || '—'} />
            <Dado label="Data geração" value={contrato.data_gerado ? new Date(contrato.data_gerado).toLocaleDateString('pt-BR') : '—'} />
            <Dado label="Expiração" value={calcCountdown(contrato.data_expiracao) || '—'} />
            <Dado label="Data assinatura" value={contrato.data_assinado ? new Date(contrato.data_assinado).toLocaleString('pt-BR') : '—'} />
          </dl>
        </div>

        {/* Preview do Conteúdo */}
        <div className="bg-white rounded-xl border p-6 flex flex-col">
          <h2 className="font-semibold text-lg mb-3">Preview do Contrato</h2>
          <div className="flex-1 overflow-auto max-h-72 border rounded-lg p-4 text-sm bg-gray-50">
            {contrato.conteudo_html
              ? <div dangerouslySetInnerHTML={{ __html: contrato.conteudo_html }} />
              : <p className="text-gray-400 italic text-center mt-12">Conteúdo do contrato</p>}
          </div>
        </div>
      </div>

      {/* Dados de Aceite */}
      {contrato.status === 'assinado' && contrato.aceite && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-3 flex items-center gap-2"><CheckCircle2 size={18} className="text-green-600" /> Dados de Aceite</h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Dado label="Nome digitado" value={contrato.aceite.nome} />
            <Dado label="Data/Hora" value={contrato.aceite.data ? new Date(contrato.aceite.data).toLocaleString('pt-BR') : '—'} />
            <Dado label="IP" value={contrato.aceite.ip} />
            <Dado label="User Agent" value={<span className="truncate block max-w-[200px]" title={contrato.aceite.user_agent}>{contrato.aceite.user_agent}</span>} />
          </dl>
        </div>
      )}

      {/* Histórico de Ações */}
      {contrato.historico && contrato.historico.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-3">Histórico de Ações</h2>
          <ul className="space-y-2">
            {contrato.historico.map((h, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ACCENT }} />
                <span className="font-medium capitalize">{h.acao}</span>
                <span className="text-gray-400">{new Date(h.data).toLocaleString('pt-BR')}</span>
                {h.usuario && <span className="text-gray-500">— {h.usuario}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Aditivos Vinculados */}
      {contrato.aditivos && contrato.aditivos.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-3 flex items-center gap-2"><Plus size={18} style={{ color: ACCENT }} /> Aditivos Vinculados</h2>
          <ul className="divide-y">
            {contrato.aditivos.map((ad) => (
              <li key={ad.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">Aditivo #{ad.id}</span>
                  <span className="ml-2 text-gray-500">{ad.descricao}</span>
                </div>
                <span className="text-gray-400">{ad.data ? new Date(ad.data).toLocaleDateString('pt-BR') : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Dado({ label, value }) {
  return (
    <div>
      <dt className="text-gray-500 text-xs">{label}</dt>
      <dd className="font-medium text-gray-900 mt-0.5">{value || '—'}</dd>
    </div>
  );
}

function ActionButtons({ status, onEnviar, onCopiar, onPDF, onEditar, onExcluir, copied }) {
  const btn = 'px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors';
  const primary = `${btn} text-white` ;
  const secondary = `${btn} border hover:bg-gray-50`;

  switch (status) {
    case 'gerado':
      return (<>
        <button className={secondary} onClick={onEditar}><Edit size={15} /> Editar</button>
        <button className={primary} style={{ backgroundColor: ACCENT }} onClick={onEnviar}><Send size={15} /> Enviar para Assinatura</button>
        <button className={`${btn} text-red-600 hover:bg-red-50`} onClick={onExcluir}><Trash2 size={15} /> Excluir</button>
      </>);
    case 'enviado':
      return (<>
        <button className={secondary} onClick={onEnviar}><RefreshCw size={15} /> Reenviar</button>
        <button className={primary} style={{ backgroundColor: ACCENT }} onClick={onCopiar}><Copy size={15} /> {copied ? 'Copiado!' : 'Copiar Link'}</button>
        <button className={`${btn} text-red-600 hover:bg-red-50`}><XCircle size={15} /> Cancelar</button>
      </>);
    case 'assinado':
      return (<>
        <button className={primary} style={{ backgroundColor: ACCENT }} onClick={onPDF}><Download size={15} /> Download PDF</button>
        <button className={secondary}><Eye size={15} /> Ver Histórico</button>
      </>);
    case 'expirado':
      return (<>
        <button className={secondary} onClick={onEnviar}><RefreshCw size={15} /> Reabrir</button>
        <button className={primary} style={{ backgroundColor: ACCENT }}><Plus size={15} /> Gerar Novo</button>
      </>);
    default:
      return null;
  }
}
