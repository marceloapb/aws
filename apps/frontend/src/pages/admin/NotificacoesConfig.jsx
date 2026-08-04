import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Settings2, Plus, Edit2, Trash2, Bell, Mail, MessageCircle, ClipboardList, CheckCircle, XCircle, Clock, Filter, Zap, Upload, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

const ACCENT = '#EA580C';
const CDN_BASE = 'https://d2112x4m4e89fv.cloudfront.net';

const TIPOS_EVENTO = [
  'album.baixado',
  'album.publicado',
  'cliente.criado',
  'contrato.assinado',
  'contrato.enviado',
  'evento.confirmado',
  'evento.criado',
  'evento.realizado',
  'feedback.respondido',
  'mensagem.recebida',
  'orcamento.aceito',
  'orcamento.criado',
  'orcamento.enviado',
  'orcamento.recusado',
  'pagamento.confirmado',
  'pagamento.vencido',
];

const CANAIS = [
  { key: 'inapp', label: 'In-App', icon: Bell },
  { key: 'email', label: 'E-mail', icon: Mail },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
];

const CANAL_COLORS = {
  inapp: 'blue',
  email: 'purple',
  whatsapp: 'green',
};

// Calendar rule types
const GATILHOS_CALENDARIO = [
  { value: 'cliente.aniversario', label: 'Aniversário do cliente' },
  { value: 'contrato.criacao', label: 'Criação do contrato (sem assinatura)' },
  { value: 'orcamento.criacao', label: 'Criação do orçamento (sem resposta)' },
  { value: 'evento.data', label: 'Data do evento (sessão/ensaio)' },
  { value: 'album.expiracao', label: 'Expiração do álbum' },
  { value: 'cliente.ultima_sessao', label: 'Última sessão realizada' },
  { value: 'pagamento.vencimento', label: 'Vencimento de pagamento' },
];

const MOMENTO_OPTIONS = [
  { value: 'antes', label: 'Antes' },
  { value: 'depois', label: 'Depois' },
  { value: 'no_dia', label: 'No dia' },
];

const EMPTY_CALENDAR_FORM = {
  nome: '',
  gatilho: '',
  momento: 'antes',
  dias: 1,
  canais: [],
  destinatario: 'cliente',
  mensagem: '',
  ativa: true,
};

const EMPTY_FORM = {
  tipo_evento: '',
  destinatario: '',
  canais: [],
  titulo_inapp: '',
  corpo_inapp: '',
  template_email: '',
  template_whatsapp: '',
  header_image_key: '',
  ativa: true,
};

export default function NotificacoesConfig() {
  const { authFetch } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('regras');
  const [regras, setRegras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Log state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilters, setLogFilters] = useState({ canal: '', status: '', tipo_evento: '' });
  const [logPage, setLogPage] = useState(1);
  const [logPagination, setLogPagination] = useState({ totalPages: 1, totalItems: 0 });

  // Calendar rules state
  const [calendarRules, setCalendarRules] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [editingCalendarRule, setEditingCalendarRule] = useState(null);
  const [calendarForm, setCalendarForm] = useState(EMPTY_CALENDAR_FORM);
  const [calendarSaving, setCalendarSaving] = useState(false);

  // Templates (for selection in rules)
  const [whatsappTemplates, setWhatsappTemplates] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [testing, setTesting] = useState(false);
  const [filtroDestinatario, setFiltroDestinatario] = useState('');
  const [uploadingHeader, setUploadingHeader] = useState(false);

  const loadRegras = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/admin/notificacoes/regras');
      const data = await res.json();
      if (data.success) setRegras(data.data || []);
    } catch {
      toast.error('Erro ao carregar regras');
    } finally {
      setLoading(false);
    }
  }, [authFetch, toast]);

  useEffect(() => { loadRegras(); }, [loadRegras]);

  // Load templates for selection
  useEffect(() => {
    authFetch('/admin/whatsapp/templates').then(r => r.json()).then(d => {
      if (d.data) {
        // Filtrar: se existe versão _img, esconder a versão sem _img do dropdown
        const nomes = d.data.map(t => t.name || t.nome);
        const filtered = d.data.filter(t => {
          const nome = t.name || t.nome;
          // Se NÃO termina em _img, verificar se existe versão _img
          if (!nome.endsWith('_img')) {
            return !nomes.includes(nome + '_img');
          }
          return true;
        });
        setWhatsappTemplates(filtered);
      }
    }).catch(() => {});
    authFetch('/admin/email-templates').then(r => r.json()).then(d => { if (d.data) setEmailTemplates(d.data); }).catch(() => {});
  }, [authFetch]);

  // Load delivery logs
  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20', page: String(logPage) });
      if (logFilters.canal) params.set('canal', logFilters.canal);
      if (logFilters.status) params.set('status', logFilters.status);
      if (logFilters.tipo_evento) params.set('tipo_evento', logFilters.tipo_evento);

      const res = await authFetch(`/admin/notificacoes/log?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
        setLogPagination(data.pagination || { totalPages: 1, totalItems: 0 });
      }
    } catch {
      toast.error('Erro ao carregar log de entregas');
    } finally {
      setLogsLoading(false);
    }
  }, [authFetch, toast, logPage, logFilters]);

  const openCreate = () => {
    setEditingRule(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      tipo_evento: rule.tipo_evento || '',
      destinatario: rule.destinatario || '',
      canais: rule.canais || [],
      titulo_inapp: rule.titulo_inapp || rule.titulo_template || '',
      corpo_inapp: rule.corpo_inapp || rule.mensagem_template || '',
      template_email: rule.template_email || '',
      template_whatsapp: rule.template_whatsapp || rule.whatsapp_template || '',
      header_image_key: rule.header_image_key || '',
      ativa: rule.ativa !== false,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.tipo_evento || !form.destinatario || form.canais.length === 0) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const url = editingRule
        ? `/admin/notificacoes/regras/${editingRule.id}`
        : '/admin/notificacoes/regras';
      const method = editingRule ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        body: JSON.stringify({ ...form, titulo_template: form.titulo_inapp, mensagem_template: form.corpo_inapp, whatsapp_template: form.template_whatsapp, header_image_key: form.header_image_key || '' }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(editingRule ? 'Regra atualizada!' : 'Regra criada!');
        setModalOpen(false);
        loadRegras();
      } else {
        toast.error(data.message || 'Erro ao salvar regra');
      }
    } catch {
      toast.error('Erro ao salvar regra');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await authFetch(`/admin/notificacoes/regras/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Regra removida');
        setRegras(prev => prev.filter(r => r.id !== id));
      } else {
        toast.error(data.message || 'Erro ao remover');
      }
    } catch {
      toast.error('Erro ao remover regra');
    }
    setDeleteConfirm(null);
  };

  const handleToggleAtiva = async (rule) => {
    try {
      const res = await authFetch(`/admin/notificacoes/regras/${rule.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...rule, ativa: !rule.ativa }),
      });
      const data = await res.json();
      if (data.success) {
        setRegras(prev => prev.map(r => r.id === rule.id ? { ...r, ativa: !r.ativa } : r));
      }
    } catch {
      toast.error('Erro ao alterar status');
    }
  };

  const handleCanalToggle = (canal) => {
    setForm(prev => ({
      ...prev,
      canais: prev.canais.includes(canal)
        ? prev.canais.filter(c => c !== canal)
        : [...prev.canais, canal],
    }));
  };

  // Header image upload for WhatsApp templates
  const handleHeaderImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }

    setUploadingHeader(true);
    try {
      const res = await authFetch('/admin/upload/presign', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, contentType: file.type, folder: 'template-headers' }),
      });
      const data = await res.json();
      const uploadUrl = data.data?.upload_url || data.uploadUrl || data.upload_url;
      const key = data.data?.key || data.key || (data.fileUrl ? data.fileUrl.replace(`${CDN_BASE}/`, '') : null);

      if (!uploadUrl) {
        toast.error('Erro ao obter URL de upload');
        return;
      }

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      setForm(prev => ({ ...prev, header_image_key: key }));
      toast.success('Imagem enviada!');
    } catch {
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploadingHeader(false);
      e.target.value = '';
    }
  };

  const handleRemoveHeaderImage = () => {
    setForm(prev => ({ ...prev, header_image_key: '' }));
  };

  // Calendar rules functions
  const loadCalendarRules = useCallback(async () => {
    setCalendarLoading(true);
    try {
      const res = await authFetch('/admin/notificacoes/calendario');
      const data = await res.json();
      if (data.success) setCalendarRules(data.data || []);
    } catch {
      toast.error('Erro ao carregar regras de calendário');
    } finally {
      setCalendarLoading(false);
    }
  }, [authFetch, toast]);

  useEffect(() => {
    if (activeTab === 'calendario') loadCalendarRules();
  }, [activeTab, loadCalendarRules]);

  const openCalendarCreate = () => {
    setEditingCalendarRule(null);
    setCalendarForm(EMPTY_CALENDAR_FORM);
    setCalendarModalOpen(true);
  };

  const openCalendarEdit = (rule) => {
    setEditingCalendarRule(rule);
    setCalendarForm({
      nome: rule.nome || '',
      gatilho: rule.gatilho || '',
      momento: rule.momento || 'antes',
      dias: rule.dias || 1,
      canais: rule.canais || [],
      destinatario: rule.destinatario || 'cliente',
      mensagem: rule.mensagem || '',
      ativa: rule.ativa !== false,
    });
    setCalendarModalOpen(true);
  };

  const handleCalendarSave = async () => {
    if (!calendarForm.nome || !calendarForm.gatilho || calendarForm.canais.length === 0) {
      toast.error('Preencha nome, gatilho e pelo menos um canal');
      return;
    }
    setCalendarSaving(true);
    try {
      const url = editingCalendarRule
        ? `/admin/notificacoes/calendario/${editingCalendarRule.id}`
        : '/admin/notificacoes/calendario';
      const method = editingCalendarRule ? 'PUT' : 'POST';
      const res = await authFetch(url, { method, body: JSON.stringify(calendarForm) });
      const data = await res.json();
      if (data.success) {
        toast.success(editingCalendarRule ? 'Regra atualizada!' : 'Regra criada!');
        setCalendarModalOpen(false);
        loadCalendarRules();
      } else {
        toast.error(data.message || 'Erro ao salvar');
      }
    } catch {
      toast.error('Erro ao salvar regra');
    } finally {
      setCalendarSaving(false);
    }
  };

  const handleCalendarDelete = async (id) => {
    try {
      const res = await authFetch(`/admin/notificacoes/calendario/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Regra removida');
        setCalendarRules(prev => prev.filter(r => r.id !== id));
      }
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const handleCalendarToggle = async (rule) => {
    try {
      const res = await authFetch(`/admin/notificacoes/calendario/${rule.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...rule, ativa: !rule.ativa }),
      });
      const data = await res.json();
      if (data.success) {
        setCalendarRules(prev => prev.map(r => r.id === rule.id ? { ...r, ativa: !r.ativa } : r));
      }
    } catch {
      toast.error('Erro ao alterar status');
    }
  };

  const handleCalendarCanalToggle = (canal) => {
    setCalendarForm(prev => ({
      ...prev,
      canais: prev.canais.includes(canal)
        ? prev.canais.filter(c => c !== canal)
        : [...prev.canais, canal],
    }));
  };

  const formatEvento = (tipo) => {
    if (!tipo) return '';
    return tipo.replace('.', ' → ').replace(/^\w/, c => c.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-3">
          <Settings2 size={24} style={{ color: ACCENT }} />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Configuracao de Alertas</h1>
            <p className="text-sm text-gray-500">Configure regras de disparo e visualize o historico de entregas</p>
          </div>
        </div>
        {activeTab === 'regras' && (
          <div className="flex items-center gap-2">
            <div className="relative inline-block">
              <select
                disabled={testing}
                onChange={async (e) => {
                  const canal = e.target.value;
                  if (!canal) return;
                  e.target.value = '';
                  const label = canal === 'todos' ? 'TODOS os canais' : canal === 'inapp' ? 'In-App' : canal === 'email' ? 'E-mail' : 'WhatsApp';
                  if (!window.confirm(`Disparar teste via ${label} para regras de ADMIN?`)) return;
                  setTesting(true);
                  try {
                    const res = await authFetch('/admin/notificacoes/testar', { method: 'POST', body: JSON.stringify({ canal: canal === 'todos' ? '' : canal }) });
                    const json = await res.json();
                    if (json.success) toast.success(json.message || 'Testes disparados!');
                    else toast.error(json.message || 'Erro ao testar');
                  } catch { toast.error('Erro ao disparar testes'); }
                  setTesting(false);
                }}
                className="px-3 py-2 text-sm font-medium border rounded-lg bg-white hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                style={{ borderColor: ACCENT, color: ACCENT }}
              >
                <option value="">{testing ? 'Testando...' : '⚡ Testar'}</option>
                <option value="todos">Todos os canais</option>
                <option value="inapp">Só In-App</option>
                <option value="email">Só E-mail</option>
                <option value="whatsapp">Só WhatsApp</option>
              </select>
            </div>
            <Button icon={Plus} onClick={openCreate}>
              Nova Regra
            </Button>
          </div>
        )}
        {activeTab === 'calendario' && (
          <Button icon={Plus} onClick={openCalendarCreate}>
            Nova Regra
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('regras')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'regras'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Settings2 size={14} />
            Regras de Disparo
          </span>
        </button>
        <button
          onClick={() => setActiveTab('calendario')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'calendario'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Clock size={14} />
            Regras de Calendário
          </span>
        </button>
      </div>

      {/* Tab Content: Regras */}
      {activeTab === 'regras' && (
        <>
          {/* Filtro Destinatário */}
          <div className="flex items-center gap-2">
            {[{ value: '', label: 'Todos' }, { value: 'admin', label: 'Admin' }, { value: 'cliente', label: 'Cliente' }].map(f => (
              <button key={f.value} onClick={() => setFiltroDestinatario(f.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filtroDestinatario === f.value ? 'bg-orange-100 text-orange-700 border border-orange-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Rules List */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : regras.filter(r => !filtroDestinatario || r.destinatario === filtroDestinatario).length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <Settings2 size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">Nenhuma regra configurada</p>
              <p className="text-xs text-gray-400 mt-1">Crie regras para automatizar suas notificacoes</p>
              <Button icon={Plus} onClick={openCreate} className="mt-4">
                Criar Primeira Regra
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {regras.filter(r => !filtroDestinatario || r.destinatario === filtroDestinatario).map((rule) => (
                <div
                  key={rule.id}
                  className={`bg-white rounded-xl border p-4 flex items-center gap-4 transition-colors ${
                    !rule.ativa ? 'opacity-60' : ''
                  }`}
                >
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggleAtiva(rule)}
                    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
                      rule.ativa ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                    aria-label={rule.ativa ? 'Desativar regra' : 'Ativar regra'}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        rule.ativa ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">
                        {formatEvento(rule.tipo_evento)}
                      </span>
                      <Badge variant={rule.destinatario === 'admin' ? 'orange' : 'blue'} size="sm">
                        {rule.destinatario === 'admin' ? 'Admin' : 'Cliente'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {(rule.canais || []).map((canal) => (
                        <Badge key={canal} variant={CANAL_COLORS[canal] || 'gray'} size="sm">
                          {canal === 'inapp' ? 'Sininho' : canal === 'email' ? 'E-mail' : 'WhatsApp'}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(rule)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Editar regra"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(rule.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remover regra"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab Content: Regras de Calendário */}
      {activeTab === 'calendario' && (
        <>
          {calendarLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : calendarRules.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <Clock size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">Nenhuma regra de calendário configurada</p>
              <p className="text-xs text-gray-400 mt-1">Crie regras para enviar lembretes automáticos baseados em datas</p>
              <Button icon={Plus} onClick={openCalendarCreate} className="mt-4">
                Criar Primeira Regra
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {calendarRules.map((rule) => (
                <div key={rule.id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 transition-colors ${!rule.ativa ? 'opacity-60' : ''}`}>
                  <button onClick={() => handleCalendarToggle(rule)} className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${rule.ativa ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${rule.ativa ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{rule.nome}</span>
                      <Badge variant={rule.destinatario === 'admin' ? 'orange' : 'blue'} size="sm">
                        {rule.destinatario === 'admin' ? 'Admin' : 'Cliente'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {rule.momento === 'no_dia' ? 'No dia' : `${rule.dias} dia(s) ${rule.momento === 'antes' ? 'antes' : 'depois'}`} — {GATILHOS_CALENDARIO.find(g => g.value === rule.gatilho)?.label || rule.gatilho}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {(rule.canais || []).map((canal) => (
                        <Badge key={canal} variant={CANAL_COLORS[canal] || 'gray'} size="sm">
                          {canal === 'inapp' ? 'Sininho' : canal === 'email' ? 'E-mail' : 'WhatsApp'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openCalendarEdit(rule)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleCalendarDelete(rule.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Calendar Rule Modal */}
          {calendarModalOpen && (
            <Modal isOpen={calendarModalOpen} onClose={() => setCalendarModalOpen(false)} title={editingCalendarRule ? 'Editar Regra de Calendário' : 'Nova Regra de Calendário'}>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Nome da regra *</label>
                  <input value={calendarForm.nome} onChange={e => setCalendarForm(p => ({ ...p, nome: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200" placeholder="Ex: Lembrete 1 dia antes da sessão" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Gatilho (baseado em) *</label>
                  <select value={calendarForm.gatilho} onChange={e => setCalendarForm(p => ({ ...p, gatilho: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200">
                    <option value="">Selecione...</option>
                    {GATILHOS_CALENDARIO.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Momento</label>
                    <select value={calendarForm.momento} onChange={e => setCalendarForm(p => ({ ...p, momento: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200">
                      {MOMENTO_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Dias</label>
                    <input type="number" min="0" value={calendarForm.dias} onChange={e => setCalendarForm(p => ({ ...p, dias: Number(e.target.value) }))} disabled={calendarForm.momento === 'no_dia'} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Destinatário</label>
                  <select value={calendarForm.destinatario} onChange={e => setCalendarForm(p => ({ ...p, destinatario: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200">
                    <option value="cliente">Cliente</option>
                    <option value="admin">Admin (você)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-2">Canais de envio *</label>
                  <div className="flex gap-2">
                    {CANAIS.map(c => (
                      <button key={c.key} onClick={() => handleCalendarCanalToggle(c.key)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm transition ${calendarForm.canais.includes(c.key) ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        <c.icon size={14} /> {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                {calendarForm.canais.includes('email') && (
                  <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-purple-700 flex items-center gap-1"><Mail size={12} /> Template E-mail</p>
                      <a href="/admin/comunicacao/emails" target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-500 hover:text-purple-700 underline">Gerenciar →</a>
                    </div>
                    <select value={calendarForm.template_email || ''} onChange={e => setCalendarForm(p => ({ ...p, template_email: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200">
                      <option value="">Nenhum (usar mensagem abaixo)</option>
                      {emailTemplates.map(t => <option key={t.tipo || t.id} value={t.tipo || t.id}>{t.nome || t.tipo}</option>)}
                    </select>
                  </div>
                )}
                {calendarForm.canais.includes('whatsapp') && (
                  <div className="p-3 bg-green-50/50 rounded-lg border border-green-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-green-700 flex items-center gap-1"><MessageCircle size={12} /> Template WhatsApp</p>
                      <a href="/admin/comunicacao" target="_blank" rel="noopener noreferrer" className="text-[10px] text-green-500 hover:text-green-700 underline">Gerenciar →</a>
                    </div>
                    <select value={calendarForm.template_whatsapp || ''} onChange={e => setCalendarForm(p => ({ ...p, template_whatsapp: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200">
                      <option value="">Nenhum (usar mensagem abaixo)</option>
                      {whatsappTemplates.map(t => <option key={t.name || t.nome} value={t.name || t.nome}>{t.name || t.nome}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Mensagem personalizada (opcional)</label>
                  <textarea value={calendarForm.mensagem} onChange={e => setCalendarForm(p => ({ ...p, mensagem: e.target.value }))} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200 resize-none" placeholder="Variáveis: {{cliente_nome}}, {{data_evento}}, {{tipo_evento}}, {{dias}}" />
                  <p className="text-[10px] text-gray-400 mt-1">Se um template for selecionado acima, esta mensagem será ignorada.</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setCalendarModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
                  <Button onClick={handleCalendarSave} disabled={calendarSaving}>
                    {calendarSaving ? 'Salvando...' : (editingCalendarRule ? 'Atualizar' : 'Criar Regra')}
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </>
      )}

      {/* Tab Content: Log de Entregas */}
      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRule ? 'Editar Regra' : 'Nova Regra de Notificação'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingRule ? 'Salvar Alterações' : 'Criar Regra'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Tipo Evento */}
          <Select
            label="Tipo de Evento"
            required
            value={form.tipo_evento}
            onChange={(e) => setForm(prev => ({ ...prev, tipo_evento: e.target.value }))}
            options={TIPOS_EVENTO.map(t => ({ value: t, label: formatEvento(t) }))}
            placeholder="Selecione o evento..."
          />

          {/* Destinatário */}
          <Select
            label="Destinatário"
            required
            value={form.destinatario}
            onChange={(e) => setForm(prev => ({ ...prev, destinatario: e.target.value }))}
            options={[
              { value: 'admin', label: 'Administrador' },
              { value: 'cliente', label: 'Cliente' },
            ]}
            placeholder="Quem recebe..."
          />

          {/* Canais */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Canais <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {CANAIS.map(({ key, label, icon: Icon }) => (
                <label
                  key={key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    form.canais.includes(key)
                      ? 'border-orange-300 bg-orange-50 text-orange-700'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.canais.includes(key)}
                    onChange={() => handleCanalToggle(key)}
                    className="sr-only"
                  />
                  <Icon size={14} />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Template fields */}
          {form.canais.includes('inapp') && (
            <div className="space-y-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
              <p className="text-xs font-medium text-blue-700 flex items-center gap-1">
                <Bell size={12} /> Template In-App
              </p>
              <Input
                label="Título"
                value={form.titulo_inapp}
                onChange={(e) => setForm(prev => ({ ...prev, titulo_inapp: e.target.value }))}
                placeholder="Ex: Novo orçamento solicitado"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Corpo</label>
                <textarea
                  value={form.corpo_inapp}
                  onChange={(e) => setForm(prev => ({ ...prev, corpo_inapp: e.target.value }))}
                  placeholder="Ex: {{cliente_nome}} solicitou um orçamento para {{tipo_evento}}"
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-orange-200 resize-none"
                />
              </div>
            </div>
          )}

          {form.canais.includes('email') && (
            <div className="space-y-3 p-3 bg-purple-50/50 rounded-lg border border-purple-100">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-purple-700 flex items-center gap-1">
                  <Mail size={12} /> Template E-mail
                </p>
                <a href="/admin/comunicacao/emails" target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-500 hover:text-purple-700 underline">Gerenciar templates →</a>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selecionar template</label>
                <select
                  value={form.template_email}
                  onChange={(e) => setForm(prev => ({ ...prev, template_email: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-orange-200"
                >
                  <option value="">Nenhum (texto livre)</option>
                  {emailTemplates.map(t => (
                    <option key={t.tipo || t.id} value={t.tipo || t.id}>{t.nome || t.tipo}</option>
                  ))}
                </select>
              </div>
              {!form.template_email && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Texto livre</label>
                  <textarea
                    value={form.corpo_email || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, corpo_email: e.target.value }))}
                    placeholder="HTML ou texto do e-mail. Use {{variáveis}} para personalizar."
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-orange-200 resize-none font-mono"
                  />
                </div>
              )}
            </div>
          )}

          {form.canais.includes('whatsapp') && (
            <div className="space-y-3 p-3 bg-green-50/50 rounded-lg border border-green-100">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-green-700 flex items-center gap-1">
                  <MessageCircle size={12} /> Template WhatsApp
                </p>
                <a href="/admin/comunicacao" target="_blank" rel="noopener noreferrer" className="text-[10px] text-green-500 hover:text-green-700 underline">Gerenciar templates →</a>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selecionar template</label>
                <select
                  value={form.template_whatsapp}
                  onChange={(e) => setForm(prev => ({ ...prev, template_whatsapp: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-orange-200"
                >
                  <option value="">Nenhum (texto livre)</option>
                  {whatsappTemplates.map(t => (
                    <option key={t.name || t.nome} value={t.name || t.nome}>{t.name || t.nome}</option>
                  ))}
                </select>
              </div>
              {!form.template_whatsapp && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Texto livre</label>
                  <textarea
                    value={form.corpo_whatsapp || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, corpo_whatsapp: e.target.value }))}
                    placeholder="Mensagem WhatsApp. Use {{variáveis}} para personalizar."
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-orange-200 resize-none"
                  />
                </div>
              )}

              {/* Header Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Imagem do Header</label>
                {form.header_image_key ? (
                  <div className="relative inline-block">
                    <img
                      src={`${CDN_BASE}/${form.header_image_key}?v=${Date.now()}`}
                      alt="Header preview"
                      className="w-full max-w-[240px] h-auto rounded-lg border border-gray-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveHeaderImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-sm"
                      aria-label="Remover imagem"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className={`flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-colors ${uploadingHeader ? 'opacity-60 pointer-events-none' : ''}`}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleHeaderImageUpload}
                      className="sr-only"
                      disabled={uploadingHeader}
                    />
                    {uploadingHeader ? (
                      <>
                        <span className="animate-spin w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full" />
                        <span className="text-sm text-gray-500">Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-500">Clique para enviar imagem (JPEG, PNG ou WebP, max 5MB)</span>
                      </>
                    )}
                  </label>
                )}
                <p className="text-[10px] text-gray-400 mt-1">Imagem exibida no header da mensagem WhatsApp.</p>
              </div>
            </div>
          )}

          {/* Ativa toggle */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="text-sm font-medium text-gray-700">Regra ativa</p>
              <p className="text-xs text-gray-400">Desative para pausar o envio sem excluir</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, ativa: !prev.ativa }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                form.ativa ? 'bg-green-500' : 'bg-gray-300'
              }`}
              aria-label={form.ativa ? 'Desativar' : 'Ativar'}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  form.ativa ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Exclusão"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm)}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Tem certeza que deseja excluir esta regra de notificação? Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
