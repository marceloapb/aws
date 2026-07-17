import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Settings, Save } from 'lucide-react';
import ConfigDadosEmpresa from '../../components/ConfigDadosEmpresa';
import ConfigPrazos from '../../components/ConfigPrazos';
import ConfigPagamento from '../../components/ConfigPagamento';
import ConfigIntegracoes from '../../components/ConfigIntegracoes';
import ConfigBackup from '../../components/ConfigBackup';

const ACCENT = '#EA580C';
const TABS = [
  { key: 'empresa', label: 'Dados da Empresa' },
  { key: 'prazos', label: 'Prazos e Políticas' },
  { key: 'pagamento', label: 'Pagamento' },
  { key: 'integracoes', label: 'Integrações' },
  { key: 'backup', label: 'Backup e Sistema' },
];

export default function ConfigEmpresa() {
  const { authFetch } = useAuth();
  const [form, setForm] = useState({});
  const [tab, setTab] = useState('empresa');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await authFetch('/admin/configuracoes');
      const json = await res.json();
      if (json.success && json.data) setForm(json.data);
    } catch {}
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const res = await authFetch('/admin/configuracoes', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      if (res.ok) setMsg('Configurações salvas com sucesso!');
      else setMsg('Erro ao salvar configurações');
    } catch {
      setMsg('Erro ao salvar configurações');
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleUploadLogo = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const res = await authFetch('/admin/fotos/upload-url', {
          method: 'POST',
          body: JSON.stringify({ albumId: 'logos', contentType: file.type }),
        });
        const json = await res.json();
        if (json.success && json.data?.uploadUrl) {
          await fetch(json.data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
          setForm({ ...form, logoUrl: json.data.uploadUrl.split('?')[0] });
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    };
    input.click();
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ background: ACCENT }}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
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

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {tab === 'empresa' && <ConfigDadosEmpresa form={form} setForm={setForm} onUploadLogo={handleUploadLogo} />}
        {tab === 'prazos' && <ConfigPrazos form={form} setForm={setForm} />}
        {tab === 'pagamento' && <ConfigPagamento form={form} setForm={setForm} />}
        {tab === 'integracoes' && <ConfigIntegracoes form={form} setForm={setForm} />}
        {tab === 'backup' && <ConfigBackup form={form} setForm={setForm} />}
      </div>
    </div>
  );
}
