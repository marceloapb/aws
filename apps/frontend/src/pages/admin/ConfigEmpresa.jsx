import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Settings, Save, Building2, Image, Receipt, Bell } from 'lucide-react';
import ConfigDadosEmpresa from '../../components/ConfigDadosEmpresa';
import ConfigPrazos from '../../components/ConfigPrazos';
import ConfigBackup from '../../components/ConfigBackup';
import AlbumConfigContent from './AlbumConfig';
import NfseConfigContent from './NfseConfig';
import NotificacoesConfigContent from './NotificacoesConfig';

const ACCENT = '#EA580C';

const TABS = [
  { key: 'empresa', label: 'Empresa', icon: Building2 },
  { key: 'albuns', label: 'Álbuns', icon: Image },
  { key: 'nfse', label: 'NFS-e', icon: Receipt },
  { key: 'notificacoes', label: 'Notificações', icon: Bell },
];

const SUB_TABS_EMPRESA = [
  { key: 'dados', label: 'Dados da Empresa' },
  { key: 'prazos', label: 'Prazos e Políticas' },
  { key: 'backup', label: 'Backup e Sistema' },
];

export default function ConfigEmpresa() {
  const { authFetch } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'empresa');
  const [subTab, setSubTab] = useState('dados');
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  // Sync tab com URL param para deep linking
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && TABS.some(t => t.key === urlTab)) {
      setTab(urlTab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setSearchParams({ tab: newTab });
  };

  const loadConfig = async () => {
    try {
      const res = await authFetch('/admin/configuracoes');
      const json = await res.json();
      if (json.success && json.data) {
        const data = json.data;
        if (data.logoKey) {
          try {
            const logoRes = await authFetch('/admin/fotos/view-url', { method: 'POST', body: JSON.stringify({ key: data.logoKey }) });
            const logoJson = await logoRes.json();
            if (logoJson.success) data.logoUrl = logoJson.data.url;
          } catch {}
        }
        if (data.logoDarkKey) {
          try {
            const logoDarkRes = await authFetch('/admin/fotos/view-url', { method: 'POST', body: JSON.stringify({ key: data.logoDarkKey }) });
            const logoDarkJson = await logoDarkRes.json();
            if (logoDarkJson.success) data.logoDarkUrl = logoDarkJson.data.url;
          } catch {}
        }
        setForm(data);
      }
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
          const viewRes = await authFetch('/admin/fotos/view-url', { method: 'POST', body: JSON.stringify({ key: json.data.key }) });
          const viewJson = await viewRes.json();
          const logoUrl = viewJson.success ? viewJson.data.url : '';
          setForm({ ...form, logoKey: json.data.key, logoUrl });
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    };
    input.click();
  };

  const handleUploadLogoDark = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const res = await authFetch('/admin/fotos/upload-url', {
          method: 'POST',
          body: JSON.stringify({ albumId: 'logos-dark', contentType: file.type }),
        });
        const json = await res.json();
        if (json.success && json.data?.uploadUrl) {
          await fetch(json.data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
          const viewRes = await authFetch('/admin/fotos/view-url', { method: 'POST', body: JSON.stringify({ key: json.data.key }) });
          const viewJson = await viewRes.json();
          const logoDarkUrl = viewJson.success ? viewJson.data.url : '';
          setForm({ ...form, logoDarkKey: json.data.key, logoDarkUrl });
        }
      } catch (err) {
        console.error('Upload logo dark failed:', err);
      }
    };
    input.click();
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-3">
          <Settings size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        </div>
        {tab === 'empresa' && (
          <button onClick={handleSave} disabled={saving} style={{ background: ACCENT }}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        )}
      </div>

      {/* Feedback */}
      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.includes('sucesso') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg}
        </div>
      )}

      {/* Main Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => handleTabChange(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {tab === 'empresa' && (
        <>
          {/* Sub-tabs empresa */}
          <div className="flex gap-4 mb-4 border-b">
            {SUB_TABS_EMPRESA.map(st => (
              <button key={st.key} onClick={() => setSubTab(st.key)}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${subTab === st.key ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {st.label}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {subTab === 'dados' && <ConfigDadosEmpresa form={form} setForm={setForm} onUploadLogo={handleUploadLogo} onUploadLogoDark={handleUploadLogoDark} />}
            {subTab === 'prazos' && <ConfigPrazos form={form} setForm={setForm} />}
            {subTab === 'backup' && <ConfigBackup form={form} setForm={setForm} />}
          </div>
        </>
      )}

      {tab === 'albuns' && <AlbumConfigContent />}
      {tab === 'nfse' && <NfseConfigContent />}
      {tab === 'notificacoes' && <NotificacoesConfigContent />}
    </div>
  );
}
