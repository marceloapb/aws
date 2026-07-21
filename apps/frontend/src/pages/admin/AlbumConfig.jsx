import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Album, Save, Clock, Bell, CalendarPlus, ShieldOff } from 'lucide-react';

const ACCENT = '#EA580C';

const DEFAULT_CONFIG = {
  prazo_padrao_dias: 180,
  presets_dias: [30, 60, 90, 180, 365],
  notificacao_dias_antecedencia: [7, 3, 1],
  notificacao_canais: ['whatsapp', 'email'],
  faixas_extensao: [
    { meses: 1, ativo: true, preco: 0 },
    { meses: 3, ativo: true, preco: 0 },
    { meses: 6, ativo: true, preco: 0 },
    { meses: 12, ativo: true, preco: 0 },
  ],
  bloquear_visualizacao: true,
  bloquear_download: true,
  mensagem_album_expirado: '',
};

export default function AlbumConfig() {
  const { authFetch } = useAuth();
  const [form, setForm] = useState(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await authFetch('/admin/album/config');
      const json = await res.json();
      if (json.success && json.data) {
        setForm({ ...DEFAULT_CONFIG, ...json.data });
      }
    } catch {}
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const res = await authFetch('/admin/album/config', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      if (res.ok) setMsg('Configurações de álbum salvas com sucesso!');
      else setMsg('Erro ao salvar configurações');
    } catch {
      setMsg('Erro ao salvar configurações');
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 4000);
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const togglePreset = (dias) => {
    const current = form.presets_dias || [];
    if (current.includes(dias)) {
      updateField('presets_dias', current.filter(d => d !== dias));
    } else {
      updateField('presets_dias', [...current, dias].sort((a, b) => a - b));
    }
  };

  const toggleNotificacaoDia = (dia) => {
    const current = form.notificacao_dias_antecedencia || [];
    if (current.includes(dia)) {
      updateField('notificacao_dias_antecedencia', current.filter(d => d !== dia));
    } else {
      updateField('notificacao_dias_antecedencia', [...current, dia].sort((a, b) => b - a));
    }
  };

  const toggleCanal = (canal) => {
    const current = form.notificacao_canais || [];
    if (current.includes(canal)) {
      updateField('notificacao_canais', current.filter(c => c !== canal));
    } else {
      updateField('notificacao_canais', [...current, canal]);
    }
  };

  const updateFaixa = (index, field, value) => {
    const faixas = [...(form.faixas_extensao || [])];
    faixas[index] = { ...faixas[index], [field]: value };
    updateField('faixas_extensao', faixas);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-3">
          <Album size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Configuração de Álbuns</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ background: ACCENT }}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Feedback */}
      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.includes('sucesso') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg}
        </div>
      )}

      <div className="space-y-6">
        {/* Seção: Disponibilidade */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} style={{ color: ACCENT }} />
            <h2 className="text-lg font-semibold text-gray-900">Disponibilidade</h2>
          </div>

          <div className="space-y-4">
            {/* Prazo padrão */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prazo padrão de disponibilidade (dias)
              </label>
              <input
                type="number"
                min={1}
                value={form.prazo_padrao_dias}
                onChange={e => updateField('prazo_padrao_dias', Number(e.target.value))}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
              />
              <p className="text-xs text-gray-500 mt-1">Número de dias que o álbum fica disponível após a publicação.</p>
            </div>

            {/* Presets de dias */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Presets de prazo (opções rápidas ao criar álbum)
              </label>
              <div className="flex flex-wrap gap-2">
                {[7, 14, 30, 60, 90, 120, 180, 365].map(dias => (
                  <button
                    key={dias}
                    type="button"
                    onClick={() => togglePreset(dias)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      (form.presets_dias || []).includes(dias)
                        ? 'text-white border-transparent'
                        : 'text-gray-600 border-gray-300 hover:border-gray-400'
                    }`}
                    style={(form.presets_dias || []).includes(dias) ? { background: ACCENT } : {}}
                  >
                    {dias} dias
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Seção: Notificações */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} style={{ color: ACCENT }} />
            <h2 className="text-lg font-semibold text-gray-900">Notificações</h2>
          </div>

          <div className="space-y-4">
            {/* Dias de antecedência */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notificar cliente antes do vencimento (dias de antecedência)
              </label>
              <div className="flex flex-wrap gap-2">
                {[1, 3, 5, 7, 14, 30].map(dia => (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => toggleNotificacaoDia(dia)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      (form.notificacao_dias_antecedencia || []).includes(dia)
                        ? 'text-white border-transparent'
                        : 'text-gray-600 border-gray-300 hover:border-gray-400'
                    }`}
                    style={(form.notificacao_dias_antecedencia || []).includes(dia) ? { background: ACCENT } : {}}
                  >
                    {dia} {dia === 1 ? 'dia' : 'dias'}
                  </button>
                ))}
              </div>
            </div>

            {/* Canais */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Canais de notificação
              </label>
              <div className="flex gap-3">
                {[
                  { key: 'whatsapp', label: 'WhatsApp' },
                  { key: 'email', label: 'E-mail' },
                ].map(canal => (
                  <label key={canal.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(form.notificacao_canais || []).includes(canal.key)}
                      onChange={() => toggleCanal(canal.key)}
                      className="w-4 h-4 rounded border-gray-300 accent-orange-600"
                    />
                    <span className="text-sm text-gray-700">{canal.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Seção: Extensão / Prorrogação */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarPlus size={18} style={{ color: ACCENT }} />
            <h2 className="text-lg font-semibold text-gray-900">Extensão / Prorrogação</h2>
            <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">Pago</span>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Configure as faixas de extensão disponíveis para o cliente contratar após o vencimento.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Período</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Preço (R$)</th>
                  <th className="text-center py-2 font-medium text-gray-600">Ativo</th>
                </tr>
              </thead>
              <tbody>
                {(form.faixas_extensao || []).map((faixa, idx) => (
                  <tr key={faixa.meses} className="border-b border-gray-100">
                    <td className="py-3 pr-4 text-gray-700">
                      {faixa.meses} {faixa.meses === 1 ? 'mês' : 'meses'}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-500">R$</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={faixa.preco}
                          onChange={e => updateFaixa(idx, 'preco', Number(e.target.value))}
                          placeholder="0,00"
                          className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 text-right"
                        />
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <input
                        type="checkbox"
                        checked={faixa.ativo}
                        onChange={e => updateFaixa(idx, 'ativo', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 accent-orange-600"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Seção: Comportamento ao Expirar */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldOff size={18} style={{ color: ACCENT }} />
            <h2 className="text-lg font-semibold text-gray-900">Comportamento ao Expirar</h2>
          </div>

          <div className="space-y-4">
            {/* Bloquear visualização */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.bloquear_visualizacao}
                onChange={e => updateField('bloquear_visualizacao', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-orange-600"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Bloquear visualização</span>
                <p className="text-xs text-gray-500">Impede que o cliente visualize as fotos após o vencimento.</p>
              </div>
            </label>

            {/* Bloquear download */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.bloquear_download}
                onChange={e => updateField('bloquear_download', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-orange-600"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Bloquear download</span>
                <p className="text-xs text-gray-500">Impede que o cliente faça download das fotos após o vencimento.</p>
              </div>
            </label>

            {/* Mensagem ao expirar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensagem exibida ao cliente quando o álbum expira
              </label>
              <textarea
                value={form.mensagem_album_expirado}
                onChange={e => updateField('mensagem_album_expirado', e.target.value)}
                rows={3}
                placeholder="Ex: Seu álbum expirou. Entre em contato para renovar o acesso."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
