import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Settings2, Plus, Edit2, Trash2, Bell, Mail, MessageCircle, ClipboardList, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

const ACCENT = '#EA580C';

const TIPOS_EVENTO = [
  'orcamento.criado',
  'orcamento.enviado',
  'orcamento.aceito',
  'orcamento.recusado',
  'contrato.enviado',
  'contrato.assinado',
  'pagamento.confirmado',
  'pagamento.vencido',
  'evento.criado',
  'evento.confirmado',
  'evento.realizado',
  'album.publicado',
  'album.baixado',
  'feedback.respondido',
  'cliente.criado',
  'mensagem.recebida',
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

const EMPTY_FORM = {
  tipo_evento: '',
  destinatario: '',
  canais: [],
  titulo_inapp: '',
  corpo_inapp: '',
  template_email: '',
  template_whatsapp: '',
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

  useEffect(() => {
    if (activeTab === 'log') loadLogs();
  }, [activeTab, loadLogs]);

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
      titulo_inapp: rule.titulo_inapp || '',
      corpo_inapp: rule.corpo_inapp || '',
      template_email: rule.template_email || '',
      template_whatsapp: rule.template_whatsapp || '',
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
        body: JSON.stringify(form),
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
          <Button icon={Plus} onClick={openCreate}>
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
          onClick={() => setActiveTab('log')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'log'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <ClipboardList size={14} />
            Log de Entregas
          </span>
        </button>
      </div>

      {/* Tab Content: Regras */}
      {activeTab === 'regras' && (
        <>
          {/* Rules List */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : regras.length === 0 ? (
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
              {regras.map((rule) => (
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

      {/* Tab Content: Log de Entregas */}
      {activeTab === 'log' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={14} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtros</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={logFilters.canal}
                onChange={(e) => { setLogFilters(prev => ({ ...prev, canal: e.target.value })); setLogPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200"
              >
                <option value="">Todos os canais</option>
                <option value="inapp">Sininho (In-App)</option>
                <option value="email">E-mail</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              <select
                value={logFilters.status}
                onChange={(e) => { setLogFilters(prev => ({ ...prev, status: e.target.value })); setLogPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200"
              >
                <option value="">Todos os status</option>
                <option value="enviado">Enviado</option>
                <option value="erro">Erro</option>
              </select>
              <select
                value={logFilters.tipo_evento}
                onChange={(e) => { setLogFilters(prev => ({ ...prev, tipo_evento: e.target.value })); setLogPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200"
              >
                <option value="">Todos os eventos</option>
                {TIPOS_EVENTO.map(t => (
                  <option key={t} value={t}>{formatEvento(t)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Log List */}
          {logsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <ClipboardList size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">Nenhum registro de entrega encontrado</p>
              <p className="text-xs text-gray-400 mt-1">Os logs aparecem quando notificacoes sao disparadas</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="bg-white rounded-xl border p-4 flex items-center gap-3">
                    {/* Status icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      log.status === 'enviado' ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      {log.status === 'enviado'
                        ? <CheckCircle size={16} className="text-green-500" />
                        : <XCircle size={16} className="text-red-500" />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">
                          {formatEvento(log.tipo_evento)}
                        </span>
                        <Badge variant={CANAL_COLORS[log.canal] || 'gray'} size="sm">
                          {log.canal === 'inapp' ? 'Sininho' : log.canal === 'email' ? 'E-mail' : 'WhatsApp'}
                        </Badge>
                        <Badge variant={log.status === 'enviado' ? 'green' : 'red'} size="sm">
                          {log.status === 'enviado' ? 'Enviado' : 'Erro'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={10} />
                          {log.created ? new Date(log.created).toLocaleString('pt-BR') : '-'}
                        </span>
                        {log.erro && (
                          <span className="text-xs text-red-500 truncate max-w-xs">
                            {log.erro}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Destinatario */}
                    <Badge variant={log.destinatario === 'admin' ? 'orange' : 'blue'} size="sm">
                      {log.destinatario === 'admin' ? 'Admin' : 'Cliente'}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {logPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-500">
                    {logPagination.totalItems} registro(s)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLogPage(p => Math.max(1, p - 1))}
                      disabled={logPage <= 1}
                      className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                      Anterior
                    </button>
                    <span className="text-xs text-gray-600">
                      {logPage} / {logPagination.totalPages}
                    </span>
                    <button
                      onClick={() => setLogPage(p => Math.min(logPagination.totalPages, p + 1))}
                      disabled={logPage >= logPagination.totalPages}
                      className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                      Proximo
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

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
              <p className="text-xs font-medium text-purple-700 flex items-center gap-1">
                <Mail size={12} /> Template E-mail
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <textarea
                  value={form.template_email}
                  onChange={(e) => setForm(prev => ({ ...prev, template_email: e.target.value }))}
                  placeholder="HTML ou texto do e-mail. Use {{variáveis}} para personalizar."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-orange-200 resize-none font-mono"
                />
              </div>
            </div>
          )}

          {form.canais.includes('whatsapp') && (
            <div className="space-y-3 p-3 bg-green-50/50 rounded-lg border border-green-100">
              <p className="text-xs font-medium text-green-700 flex items-center gap-1">
                <MessageCircle size={12} /> Template WhatsApp
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <textarea
                  value={form.template_whatsapp}
                  onChange={(e) => setForm(prev => ({ ...prev, template_whatsapp: e.target.value }))}
                  placeholder="Mensagem WhatsApp. Use {{variáveis}} para personalizar."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-orange-200 resize-none"
                />
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
