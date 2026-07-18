import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Upload, Image, Globe, Plus, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';

const ACCENT = '#EA580C';

const PAGE_TABS = [
  { key: 'home', label: 'Home' },
  { key: 'sobre', label: 'Sobre' },
  { key: 'contato', label: 'Contato' },
];

const PAGE_SCHEMA = {
  home: [
    { key: 'hero_titulo', label: 'Título Hero', type: 'text' },
    { key: 'hero_tagline', label: 'Tagline Hero', type: 'text' },
    { key: 'hero_imagem', label: 'Imagem Hero', type: 'image' },
    { key: 'manifesto', label: 'Manifesto', type: 'richtext' },
    { key: 'cta_texto', label: 'Texto CTA', type: 'text' },
    { key: 'cta_botao', label: 'Texto Botão CTA', type: 'text' },
  ],
  sobre: [
    { key: 'titulo', label: 'Título', type: 'text' },
    { key: 'foto', label: 'Foto Principal', type: 'image' },
    { key: 'bio', label: 'Biografia', type: 'richtext' },
    { key: 'numeros', label: 'Números (JSON)', type: 'richtext' },
  ],
  contato: [
    { key: 'titulo', label: 'Título', type: 'text' },
    { key: 'subtitulo', label: 'Subtítulo', type: 'text' },
    { key: 'whatsapp', label: 'WhatsApp', type: 'text' },
    { key: 'telefone', label: 'Telefone', type: 'text' },
    { key: 'email', label: 'E-mail', type: 'text' },
    { key: 'cidade', label: 'Cidade', type: 'text' },
  ],
};

export default function CmsEditor() {
  const { authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Site config state
  const [configData, setConfigData] = useState({ nome: '', logo_url: '', whatsapp: '', redes: {} });
  const [showConfig, setShowConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const fileInputRef = useRef(null);
  const [uploadingField, setUploadingField] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load page data
  useEffect(() => {
    loadPageData(activeTab);
  }, [activeTab]);

  // Load site config
  useEffect(() => {
    loadConfig();
  }, []);

  const loadPageData = async (tipo) => {
    setLoading(true);
    try {
      const res = await authFetch(`/admin/site/paginas/${tipo}`);
      const data = await res.json();
      setFormData(data.data?.blocos || data.data || data.blocos || data || {});
    } catch {
      setFormData({});
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await authFetch('/admin/site/config');
      const data = await res.json();
      setConfigData(data.data || data || { nome: '', logo_url: '', whatsapp: '', redes: {} });
    } catch {}
  };

  const handleFieldChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch(`/admin/site/paginas/${activeTab}`, {
        method: 'PUT',
        body: JSON.stringify({ blocos: formData }),
      });
      if (res.ok) {
        showToast('Página salva com sucesso!');
      } else {
        showToast('Erro ao salvar', 'error');
      }
    } catch {
      showToast('Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await authFetch('/admin/site/config', {
        method: 'PUT',
        body: JSON.stringify(configData),
      });
      if (res.ok) {
        showToast('Configuração salva com sucesso!');
      } else {
        showToast('Erro ao salvar configuração', 'error');
      }
    } catch {
      showToast('Erro ao salvar configuração', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleImageUpload = async (field, file) => {
    if (!file) return;
    setUploadingField(field);
    try {
      // Get presigned URL
      const res = await authFetch('/admin/upload/presign', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, contentType: file.type, folder: 'site' }),
      });
      const { uploadUrl, fileUrl } = await res.json();

      // Upload to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      handleFieldChange(field, fileUrl);
      showToast('Imagem enviada!');
    } catch {
      showToast('Erro ao enviar imagem', 'error');
    } finally {
      setUploadingField(null);
    }
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;
    setUploadingField('logo');
    try {
      const res = await authFetch('/admin/upload/presign', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, contentType: file.type, folder: 'site' }),
      });
      const { uploadUrl, fileUrl } = await res.json();

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      setConfigData(prev => ({ ...prev, logo_url: fileUrl }));
      showToast('Logo enviado!');
    } catch {
      showToast('Erro ao enviar logo', 'error');
    } finally {
      setUploadingField(null);
    }
  };

  const handleRedeChange = (key, value) => {
    setConfigData(prev => ({
      ...prev,
      redes: { ...prev.redes, [key]: value },
    }));
  };

  const addRede = () => {
    const key = prompt('Nome da rede (ex: instagram, facebook, youtube):');
    if (key) handleRedeChange(key.toLowerCase().trim(), '');
  };

  const removeRede = (key) => {
    setConfigData(prev => {
      const redes = { ...prev.redes };
      delete redes[key];
      return { ...prev, redes };
    });
  };

  const schema = PAGE_SCHEMA[activeTab] || [];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CMS - Site Público</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie o conteúdo das páginas do site público.</p>
        </div>
      </div>

      {/* Page Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0">
          {PAGE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[#EA580C] text-[#EA580C]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`ml-auto px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              showConfig
                ? 'border-[#EA580C] text-[#EA580C]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Globe size={16} className="inline mr-1" />
            Config Site
          </button>
        </div>
      </div>

      {/* Content Area */}
      {showConfig ? (
        /* Site Config Section */
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Globe size={20} /> Configuração do Site
          </h2>

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Site</label>
            <input
              type="text"
              value={configData.nome || ''}
              onChange={e => setConfigData(prev => ({ ...prev, nome: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C]"
              placeholder="MBFoto"
            />
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
            <div className="flex items-center gap-4">
              {configData.logo_url && (
                <img src={configData.logo_url} alt="Logo" className="h-12 w-auto rounded border" />
              )}
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 text-sm">
                <Upload size={16} />
                {uploadingField === 'logo' ? 'Enviando...' : 'Upload Logo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleLogoUpload(e.target.files[0])}
                />
              </label>
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
            <input
              type="text"
              value={configData.whatsapp || ''}
              onChange={e => setConfigData(prev => ({ ...prev, whatsapp: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C]"
              placeholder="5511999999999"
            />
          </div>

          {/* Redes Sociais */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Redes Sociais</label>
              <button
                onClick={addRede}
                className="flex items-center gap-1 text-xs text-[#EA580C] hover:underline"
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(configData.redes || {}).map(([key, url]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 w-20 shrink-0 capitalize">{key}</span>
                  <input
                    type="url"
                    value={url}
                    onChange={e => handleRedeChange(key, e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C]"
                    placeholder={`https://${key}.com/...`}
                  />
                  <button
                    onClick={() => removeRede(key)}
                    className="p-1.5 text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {Object.keys(configData.redes || {}).length === 0 && (
                <p className="text-xs text-gray-400">Nenhuma rede social adicionada.</p>
              )}
            </div>
          </div>

          {/* Save Config */}
          <div className="pt-4 border-t">
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50"
              style={{ background: ACCENT }}
            >
              <Save size={16} />
              {savingConfig ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </div>
        </div>
      ) : (
        /* Page Content Editor */
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                  <div className="h-10 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {schema.map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>

                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={formData[field.key] || ''}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C]"
                    />
                  )}

                  {field.type === 'richtext' && (
                    <textarea
                      value={formData[field.key] || ''}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C]"
                      placeholder="HTML permitido"
                    />
                  )}

                  {field.type === 'image' && (
                    <div className="space-y-2">
                      {formData[field.key] && (
                        <img
                          src={formData[field.key]}
                          alt={field.label}
                          className="h-32 w-auto rounded-lg border object-cover"
                        />
                      )}
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={formData[field.key] || ''}
                          onChange={e => handleFieldChange(field.key, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C]"
                          placeholder="URL da imagem ou faça upload"
                        />
                        <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 text-sm shrink-0">
                          <Image size={16} />
                          {uploadingField === field.key ? 'Enviando...' : 'Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleImageUpload(field.key, e.target.files[0])}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Save Button */}
              <div className="pt-4 border-t">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50"
                  style={{ background: ACCENT }}
                >
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar Página'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
