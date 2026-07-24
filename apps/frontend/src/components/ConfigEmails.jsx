import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Save, Eye, Send, RotateCcw, Upload, Palette, ChevronDown, ChevronUp, Code, ToggleLeft, ToggleRight, X } from 'lucide-react';

const ACCENT = '#EA580C';

export default function ConfigEmails() {
  const { authFetch } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [config, setConfig] = useState({ remetente_nome: '', remetente_email: '', logo_url: '', logo_key: '', cor_primaria: '#EA580C', rodape_texto: '' });
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editForm, setEditForm] = useState({ assunto: '', corpo: '', ativo: true });
  const [preview, setPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [msg, setMsg] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [expandedVars, setExpandedVars] = useState(false);
  const [subTab, setSubTab] = useState('templates'); // templates | config
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tplRes, cfgRes] = await Promise.all([
        authFetch('/admin/email-templates').then(r => r.json()),
        authFetch('/admin/email-templates/config').then(r => r.json()),
      ]);
      if (tplRes.success) setTemplates(tplRes.data);
      if (cfgRes.success) setConfig(cfgRes.data);
    } catch {}
    setLoading(false);
  };

  const selectTemplate = (tpl) => {
    setSelectedTemplate(tpl);
    setEditForm({ assunto: tpl.assunto, corpo: tpl.corpo, ativo: tpl.ativo });
    setShowPreview(false);
    setPreview(null);
    setMsg('');
    // Force re-render of contentEditable by updating key
    setEditorKey(prev => prev + 1);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    // Sync contentEditable content before saving
    const editor = document.getElementById('template-corpo-editor');
    const currentForm = editor ? { ...editForm, corpo: editor.innerHTML } : editForm;
    if (editor) setEditForm(currentForm);
    setSaving(true);
    setMsg('');
    try {
      const res = await authFetch(`/admin/email-templates/${selectedTemplate.tipo}`, {
        method: 'PUT',
        body: JSON.stringify(currentForm),
      });
      const json = await res.json();
      if (json.success) {
        setMsg('Template salvo com sucesso!');
        loadData();
      } else {
        setMsg(`Erro: ${json.message}`);
      }
    } catch (e) {
      setMsg('Erro ao salvar template');
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleResetTemplate = async () => {
    if (!selectedTemplate || !window.confirm('Resetar este template ao padrão? Suas customizações serão perdidas.')) return;
    try {
      const res = await authFetch(`/admin/email-templates/${selectedTemplate.tipo}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setMsg('Template resetado ao padrão!');
        setSelectedTemplate(null);
        loadData();
      }
    } catch {}
  };

  const handlePreview = async () => {
    if (!selectedTemplate) return;
    try {
      // Salvar temporariamente antes do preview para pegar a versão atual
      const res = await authFetch(`/admin/email-templates/${selectedTemplate.tipo}/preview`, {
        method: 'POST',
        body: JSON.stringify({ variaveis: {} }),
      });
      const json = await res.json();
      if (json.success) {
        setPreview(json.data);
        setShowPreview(true);
      }
    } catch {}
  };

  const handleSendTest = async () => {
    if (!selectedTemplate || !testEmail) return;
    setSending(true);
    try {
      const res = await authFetch(`/admin/email-templates/${selectedTemplate.tipo}/enviar-teste`, {
        method: 'POST',
        body: JSON.stringify({ email_destino: testEmail }),
      });
      const json = await res.json();
      if (json.success) {
        setMsg(`E-mail de teste enviado para ${testEmail}!`);
      } else {
        setMsg(`Erro: ${json.message}`);
      }
    } catch {
      setMsg('Erro ao enviar teste');
    }
    setSending(false);
    setTimeout(() => setMsg(''), 5000);
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setMsg('');
    try {
      const res = await authFetch('/admin/email-templates/config', {
        method: 'PUT',
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (json.success) setMsg('Configurações de e-mail salvas!');
      else setMsg(`Erro: ${json.message}`);
    } catch {
      setMsg('Erro ao salvar configurações');
    }
    setSavingConfig(false);
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
          body: JSON.stringify({ albumId: 'email-logo', contentType: file.type }),
        });
        const json = await res.json();
        if (json.success && json.data?.uploadUrl) {
          await fetch(json.data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
          const viewRes = await authFetch('/admin/fotos/view-url', { method: 'POST', body: JSON.stringify({ key: json.data.key }) });
          const viewJson = await viewRes.json();
          const logoUrl = viewJson.success ? viewJson.data.url : '';
          setConfig({ ...config, logo_key: json.data.key, logo_url: logoUrl });
        }
      } catch {}
    };
    input.click();
  };

  const insertVariable = (variable) => {
    const editor = document.getElementById('template-corpo-editor');
    if (editor) {
      editor.focus();
      document.execCommand('insertText', false, variable);
      setEditForm(f => ({ ...f, corpo: editor.innerHTML }));
    } else {
      setEditForm({ ...editForm, corpo: editForm.corpo + variable });
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-4 mb-4 border-b">
        <button onClick={() => setSubTab('templates')}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'templates' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Templates
        </button>
        <button onClick={() => setSubTab('config')}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'config' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Configurações do Remetente
        </button>
      </div>

      {/* Feedback */}
      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.includes('sucesso') || msg.includes('salvas') || msg.includes('enviado') || msg.includes('resetado') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg}
        </div>
      )}

      {/* CONFIG TAB */}
      {subTab === 'config' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações de E-mail</h3>
          <p className="text-sm text-gray-500 mb-6">Configure o nome do remetente, logo e rodapé que aparecerão em todos os e-mails enviados.</p>

          <div className="space-y-5">
            {/* Nome do remetente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Remetente</label>
              <input type="text" value={config.remetente_nome} onChange={e => setConfig({ ...config, remetente_nome: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                placeholder="Ex: MBFoto - Marcelo Bloise" />
              <p className="text-xs text-gray-400 mt-1">Este nome aparece como remetente nos e-mails. O endereço será: {config.remetente_email}</p>
            </div>

            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo do E-mail</label>
              <div className="flex items-center gap-4">
                {config.logo_url ? (
                  <div className="relative">
                    <img src={config.logo_url} alt="Logo" className="h-12 max-w-[200px] object-contain border rounded p-1" />
                    <button onClick={() => setConfig({ ...config, logo_url: '', logo_key: '' })}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="w-[200px] h-12 border-2 border-dashed rounded flex items-center justify-center text-gray-400 text-xs">
                    Sem logo
                  </div>
                )}
                <button onClick={handleUploadLogo} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Upload size={14} /> Upload Logo
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Recomendado: PNG/SVG com fundo transparente, máx. 200px de largura.</p>
            </div>

            {/* Cor primária */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cor Primária</label>
              <div className="flex items-center gap-3">
                <input type="color" value={config.cor_primaria} onChange={e => setConfig({ ...config, cor_primaria: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border" />
                <input type="text" value={config.cor_primaria} onChange={e => setConfig({ ...config, cor_primaria: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 font-mono" />
                <span className="text-xs text-gray-400">Usada no cabeçalho e botões</span>
              </div>
            </div>

            {/* Rodapé */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Texto do Rodapé</label>
              <textarea value={config.rodape_texto} onChange={e => setConfig({ ...config, rodape_texto: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20 focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                placeholder="Ex: Você recebeu este email pois está cadastrado no sistema MBFoto." />
            </div>

            <button onClick={handleSaveConfig} disabled={savingConfig} style={{ background: ACCENT }}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
              <Save size={16} />
              {savingConfig ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      )}

      {/* TEMPLATES TAB */}
      {subTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de templates */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Templates Disponíveis</h3>
              <div className="space-y-2">
                {templates.map(tpl => (
                  <button key={tpl.tipo} onClick={() => selectTemplate(tpl)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedTemplate?.tipo === tpl.tipo ? 'bg-orange-50 border border-orange-200 text-orange-800' : 'hover:bg-gray-50 border border-transparent'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{tpl.nome}</span>
                      <span className={`w-2 h-2 rounded-full ${tpl.ativo ? 'bg-green-400' : 'bg-gray-300'}`} title={tpl.ativo ? 'Ativo' : 'Desativado'} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{tpl.descricao}</p>
                    {tpl.customizado && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded mt-1 inline-block">Customizado</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Editor */}
          <div className="lg:col-span-2">
            {!selectedTemplate ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                <Mail size={48} className="mx-auto mb-3 opacity-30" />
                <p>Selecione um template para editar</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedTemplate.nome}</h3>
                    <p className="text-sm text-gray-500">{selectedTemplate.descricao}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditForm({ ...editForm, ativo: !editForm.ativo })}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${editForm.ativo ? 'text-green-700 bg-green-50' : 'text-gray-500 bg-gray-100'}`}
                      title={editForm.ativo ? 'Template ativo' : 'Template desativado'}>
                      {editForm.ativo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      {editForm.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                </div>

                {/* Variáveis disponíveis */}
                <div className="mb-4">
                  <button onClick={() => setExpandedVars(!expandedVars)}
                    className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-800">
                    <Code size={12} />
                    Variáveis disponíveis
                    {expandedVars ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {expandedVars && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTemplate.variaveis.map(v => (
                          <button key={v} onClick={() => insertVariable(v)}
                            className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-colors">
                            {v}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2">Clique para inserir na posição do cursor no corpo do e-mail</p>
                    </div>
                  )}
                </div>

                {/* Assunto */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assunto do E-mail</label>
                  <input type="text" value={editForm.assunto} onChange={e => setEditForm({ ...editForm, assunto: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                    placeholder="Assunto do e-mail (pode usar variáveis)" />
                </div>

                {/* Corpo (editor rich-text) */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Corpo do E-mail (HTML)</label>
                  {/* Rich Text Toolbar */}
                  <div className="flex flex-wrap gap-1 p-2 border border-b-0 rounded-t-lg bg-gray-50">
                    <button type="button" onClick={() => document.execCommand('bold')} className="px-2 py-1 text-xs font-bold border rounded hover:bg-gray-200" title="Negrito">B</button>
                    <button type="button" onClick={() => document.execCommand('italic')} className="px-2 py-1 text-xs italic border rounded hover:bg-gray-200" title="Itálico">I</button>
                    <button type="button" onClick={() => document.execCommand('underline')} className="px-2 py-1 text-xs underline border rounded hover:bg-gray-200" title="Sublinhado">U</button>
                    <span className="w-px h-6 bg-gray-300 mx-1" />
                    <select onChange={e => { document.execCommand('fontSize', false, e.target.value); e.target.value = ''; }} defaultValue="" className="text-xs border rounded px-1 py-1 hover:bg-gray-200">
                      <option value="" disabled>Tamanho</option>
                      <option value="1">Pequeno</option>
                      <option value="3">Normal</option>
                      <option value="5">Grande</option>
                      <option value="7">Muito Grande</option>
                    </select>
                    <input type="color" onChange={e => document.execCommand('foreColor', false, e.target.value)} title="Cor do texto" className="w-7 h-7 border rounded cursor-pointer" defaultValue="#333333" />
                    <span className="w-px h-6 bg-gray-300 mx-1" />
                    <button type="button" onClick={() => document.execCommand('justifyLeft')} className="px-2 py-1 text-xs border rounded hover:bg-gray-200" title="Alinhar esquerda">&#x2B05;</button>
                    <button type="button" onClick={() => document.execCommand('justifyCenter')} className="px-2 py-1 text-xs border rounded hover:bg-gray-200" title="Centralizar">&#x2B1B;</button>
                    <button type="button" onClick={() => document.execCommand('justifyRight')} className="px-2 py-1 text-xs border rounded hover:bg-gray-200" title="Alinhar direita">&#x27A1;</button>
                    <button type="button" onClick={() => document.execCommand('justifyFull')} className="px-2 py-1 text-xs border rounded hover:bg-gray-200" title="Justificar">&#x2630;</button>
                    <span className="w-px h-6 bg-gray-300 mx-1" />
                    <button type="button" onClick={() => document.execCommand('insertOrderedList')} className="px-2 py-1 text-xs border rounded hover:bg-gray-200" title="Lista numerada">1.</button>
                    <button type="button" onClick={() => document.execCommand('insertUnorderedList')} className="px-2 py-1 text-xs border rounded hover:bg-gray-200" title="Lista">&bull;</button>
                    <button type="button" onClick={() => document.execCommand('indent')} className="px-2 py-1 text-xs border rounded hover:bg-gray-200" title="Indentar">&rarr;</button>
                    <button type="button" onClick={() => document.execCommand('outdent')} className="px-2 py-1 text-xs border rounded hover:bg-gray-200" title="Desindentar">&larr;</button>
                  </div>
                  {/* Editable area */}
                  <div
                    key={editorKey}
                    id="template-corpo-editor"
                    contentEditable
                    suppressContentEditableWarning
                    dangerouslySetInnerHTML={{ __html: editForm.corpo }}
                    onBlur={e => setEditForm(f => ({ ...f, corpo: e.target.innerHTML }))}
                    className="w-full border border-t-0 rounded-b-lg px-4 py-3 text-sm min-h-[300px] max-h-[500px] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-orange-200 prose prose-sm max-w-none"
                    style={{ lineHeight: '1.8' }}
                  />
                  <p className="text-xs text-gray-400 mt-1">Use a barra de ferramentas para formatar. As variáveis serão substituídas automaticamente ao enviar.</p>
                </div>

                {/* Ações */}
                <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                  <button onClick={handleSaveTemplate} disabled={saving} style={{ background: ACCENT }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                    <Save size={14} />
                    {saving ? 'Salvando...' : 'Salvar Template'}
                  </button>
                  <button onClick={handlePreview}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                    <Eye size={14} /> Preview
                  </button>
                  <button onClick={handleResetTemplate}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                    <RotateCcw size={14} /> Resetar Padrão
                  </button>
                </div>

                {/* Enviar Teste */}
                <div className="mt-4 pt-4 border-t">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Enviar E-mail de Teste</label>
                  <div className="flex gap-2">
                    <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                      placeholder="email@destino.com" />
                    <button onClick={handleSendTest} disabled={sending || !testEmail}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                      <Send size={14} />
                      {sending ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && preview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h4 className="font-semibold text-gray-900">Preview do E-mail</h4>
                <p className="text-sm text-gray-500">Assunto: {preview.assunto}</p>
              </div>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
              <iframe
                title="Email Preview"
                srcDoc={preview.html}
                className="w-full h-[500px] border-0"
                sandbox=""
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
