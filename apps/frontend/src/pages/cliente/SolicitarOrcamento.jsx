import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChevronLeft, Package, User, MessageCircle, Calendar, Clock,
  Briefcase, MapPin, FileText, CheckSquare, AlertCircle
} from 'lucide-react';

const ACCENT = '#EA580C';

const ORIGENS = [
  'Instagram',
  'Google',
  'Indicação de amigo',
  'Facebook',
  'TikTok',
  'Pinterest',
  'Evento/Feira',
  'Outro',
];

export default function SolicitarOrcamento() {
  const { authFetch, user } = useAuth();
  const navigate = useNavigate();

  // Data from API
  const [pacotes, setPacotes] = useState([]);
  const [servicos, setServicos] = useState({ servicos_principais: [], produtos: [], adicionais: [] });
  const [loadingCatalogo, setLoadingCatalogo] = useState(true);

  // Form state
  const [form, setForm] = useState({
    // Pacote
    pacote_id: '',
    // Como chegou
    origem: '',
    // O Evento
    nome_evento: '',
    data_evento: '',
    horario_inicio: '',
    horario_fim: '',
    // Serviços selecionados (array of IDs)
    servicos_selecionados: [],
    // Local do Evento
    local_nome: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    // Detalhes Finais
    observacoes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load catalog data
  useEffect(() => {
    loadCatalogo();
  }, []);

  const loadCatalogo = async () => {
    try {
      const [pacotesRes, servicosRes] = await Promise.all([
        authFetch('/client/catalogo/pacotes').then(r => r.json()).catch(() => ({ data: [] })),
        authFetch('/client/catalogo/servicos').then(r => r.json()).catch(() => ({ data: { servicos_principais: [], produtos: [], adicionais: [] } })),
      ]);
      setPacotes(pacotesRes.data || []);
      setServicos(servicosRes.data || { servicos_principais: [], produtos: [], adicionais: [] });
    } catch {
      // silent fail
    }
    setLoadingCatalogo(false);
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const toggleServico = (id) => {
    setForm(prev => ({
      ...prev,
      servicos_selecionados: prev.servicos_selecionados.includes(id)
        ? prev.servicos_selecionados.filter(s => s !== id)
        : [...prev.servicos_selecionados, id],
    }));
  };

  // CEP auto-fill
  const handleCepChange = async (valor) => {
    updateField('cep', valor);
    const limpo = valor.replace(/\D/g, '');
    if (limpo.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(prev => ({
            ...prev,
            logradouro: data.logradouro || prev.logradouro,
            bairro: data.bairro || prev.bairro,
            cidade: data.localidade || prev.cidade,
            uf: data.uf || prev.uf,
          }));
        }
      } catch {
        // silent
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome_evento.trim()) {
      setError('O nome do evento é obrigatório');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await authFetch('/client/orcamentos', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        navigate('/cliente/orcamentos', { state: { successMessage: 'Solicitação enviada com sucesso!' } });
      } else {
        setError(json.message || 'Erro ao enviar solicitação');
      }
    } catch (err) {
      setError('Erro ao enviar solicitação. Tente novamente.');
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-3xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/cliente/orcamentos')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Solicitar Orçamento</h1>
          <p className="text-sm text-gray-500">Preencha os detalhes para receber uma proposta</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ═══════════ Como você chegou até mim? ═══════════ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionTitle icon={MessageCircle} title="Como você chegou até mim?" />
          <p className="text-sm text-gray-500 mb-4">Ajude-me a entender por onde você encontrou meu trabalho espetacular, mas humilde espetacular.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Origem</label>
            <select
              value={form.origem}
              onChange={e => updateField('origem', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none bg-white"
            >
              <option value="">Selecione uma opção</option>
              {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </section>

        {/* ═══════════ O Evento ═══════════ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionTitle icon={Calendar} title="O Evento" />
          <div className="space-y-4">
            <InputField
              label="Nome do Evento *"
              value={form.nome_evento}
              onChange={v => updateField('nome_evento', v)}
              placeholder="Ex: Casamento João e Maria"
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InputField label="Data Prevista" type="date" value={form.data_evento} onChange={v => updateField('data_evento', v)} />
              <InputField label="Horário de Início" type="time" value={form.horario_inicio} onChange={v => updateField('horario_inicio', v)} icon={<Clock size={14} className="text-gray-400" />} />
              <InputField label="Horário de Término" type="time" value={form.horario_fim} onChange={v => updateField('horario_fim', v)} icon={<Clock size={14} className="text-gray-400" />} />
            </div>
          </div>
        </section>

        {/* ═══════════ Produtos e Serviços ═══════════ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionTitle icon={Briefcase} title="Produtos e Serviços" />
          <p className="text-sm text-gray-500 mb-6">Selecione os serviços e produtos que deseja incluir no seu orçamento.</p>

          {/* Serviços Principais */}
          {servicos.servicos_principais.length > 0 && (
            <div className="mb-8">
              <h4 className="text-base font-semibold text-gray-900 mb-4">Serviços Principais</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {servicos.servicos_principais.map(s => (
                  <ServiceCheckbox
                    key={s.id}
                    item={s}
                    checked={form.servicos_selecionados.includes(s.id)}
                    onToggle={() => toggleServico(s.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Produtos */}
          {servicos.produtos.length > 0 && (
            <div className="mb-8">
              <h4 className="text-base font-semibold text-gray-900 mb-4">Produtos</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {servicos.produtos.map(s => (
                  <ServiceCheckbox
                    key={s.id}
                    item={s}
                    checked={form.servicos_selecionados.includes(s.id)}
                    onToggle={() => toggleServico(s.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Serviços Adicionais */}
          {servicos.adicionais.length > 0 && (
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-4">Serviços Adicionais</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {servicos.adicionais.map(s => (
                  <ServiceCheckbox
                    key={s.id}
                    item={s}
                    checked={form.servicos_selecionados.includes(s.id)}
                    onToggle={() => toggleServico(s.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {servicos.servicos_principais.length === 0 && servicos.produtos.length === 0 && servicos.adicionais.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum serviço disponível no momento.</p>
          )}
        </section>

        {/* ═══════════ Escolha o seu Pacote ═══════════ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionTitle icon={Package} title="Escolha o seu Pacote" />
          <p className="text-sm text-gray-500 mb-6">
            Selecione o pacote que melhor se adequa ao seu evento. Você poderá adicionar extras depois.
          </p>

          {loadingCatalogo ? (
            <div className="text-center py-8 text-gray-400 text-sm">Carregando pacotes...</div>
          ) : pacotes.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Package size={24} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Nenhum pacote comercial disponível no momento.</p>
              <p className="text-xs text-gray-400 mt-1">Prossiga para as próximas etapas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pacotes.map(p => (
                <ServiceCheckbox
                  key={p.id}
                  item={{ id: p.id, nome: p.nome, descricao: p.descricao }}
                  checked={form.pacote_id === p.id}
                  onToggle={() => updateField('pacote_id', form.pacote_id === p.id ? '' : p.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ═══════════ Local do Evento ═══════════ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionTitle icon={MapPin} title="Local do Evento" />
          <div className="space-y-4">
            <InputField label="Nome do Local (igreja, salão, sítio...)" value={form.local_nome} onChange={v => updateField('local_nome', v)} placeholder="Ex: Espaço das Flores" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="CEP" value={form.cep} onChange={v => handleCepChange(v)} placeholder="00000-000" />
              <InputField label="Logradouro" value={form.logradouro} onChange={v => updateField('logradouro', v)} placeholder="" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="Número" value={form.numero} onChange={v => updateField('numero', v)} placeholder="" />
              <InputField label="Complemento" value={form.complemento} onChange={v => updateField('complemento', v)} placeholder="Apto, bloco, etc. (Opcional)" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <InputField label="Bairro" value={form.bairro} onChange={v => updateField('bairro', v)} placeholder="" />
              <InputField label="Cidade" value={form.cidade} onChange={v => updateField('cidade', v)} placeholder="" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">UF</label>
                <input
                  type="text"
                  maxLength={2}
                  value={form.uf}
                  onChange={e => updateField('uf', e.target.value.toUpperCase())}
                  placeholder="SP"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none uppercase"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ Detalhes Finais ═══════════ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionTitle icon={FileText} title="Detalhes Finais" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações Adicionais (Opcional)</label>
            <textarea
              rows={4}
              value={form.observacoes}
              onChange={e => updateField('observacoes', e.target.value)}
              placeholder="Conte mais detalhes importantes sobre o momento ou dúvidas que você tenha"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none resize-none"
            />
          </div>
        </section>

        {/* ═══════════ Actions ═══════════ */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/cliente/orcamentos')}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{ background: ACCENT }}
            className="px-6 py-2.5 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? 'Enviando...' : 'Enviar Solicitação'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ═══════════ Sub-components ═══════════

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${ACCENT}15` }}>
        <Icon size={14} style={{ color: ACCENT }} />
      </div>
      <h3 className="text-base font-semibold" style={{ color: ACCENT }}>{title}</h3>
    </div>
  );
}

function InputField({ label, type = 'text', value, onChange, placeholder, required, icon, onBlur }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
        />
        {icon && <span className="absolute right-3 top-1/2 -translate-y-1/2">{icon}</span>}
      </div>
    </div>
  );
}

function ServiceCheckbox({ item, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
        checked ? 'border-orange-500 bg-orange-50 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
        checked ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
      }`}>
        {checked && <CheckSquare size={12} className="text-white" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{item.nome}</p>
        {item.descricao && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.descricao}</p>}
      </div>
    </button>
  );
}
