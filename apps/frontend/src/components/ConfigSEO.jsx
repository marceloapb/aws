import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Save, Search, Globe, BarChart3, Code, Image, Plus, X, Eye } from 'lucide-react';

const ACCENT = '#EA580C';

const SCHEMA_TYPES = [
  'LocalBusiness',
  'Photographer',
  'ProfessionalService',
];

export default function ConfigSEO() {
  const { authFetch } = useAuth();
  const [form, setForm] = useState({
    titulo_padrao: '',
    descricao_padrao: '',
    keywords: '',
    og_image_url: '',
    og_image_key: '',
    google_analytics_id: '',
    google_search_console: '',
    schema_type: 'Photographer',
    schema_nome: '',
    schema_descricao: '',
    schema_endereco: '',
    schema_cidade: '',
    schema_estado: '',
    schema_cep: '',
    schema_telefone: '',
    schema_email: '',
    schema_preco_min: '',
    schema_preco_max: '',
    schema_areas_atuacao: [],
    meta_facebook_pixel: '',
    meta_custom_head: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [subTab, setSubTab] = useState('basico');
  const [novaArea, setNovaArea] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const SUB_TABS = [
    { key: 'basico', label: 'Meta Tags', icon: Search },
    { key: 'opengraph', label: 'Open Graph', icon: Image },
    { key: 'schema', label: 'Schema.org', icon: Code },
    { key: 'analytics', label: 'Analytics & Tracking', icon: BarChart3 },
    { key: 'avancado', label: 'Avançado', icon: Globe },
  ];

  useEffect(() => {
    loadSEO();
  }, []);

  const loadSEO = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/admin/site/seo');
      const json = await res.json();
      if (json.success && json.data) {
        setForm(prev => ({ ...prev, ...json.data }));
      }
    } catch {}
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const res = await authFetch('/admin/site/seo', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setMsg('Configurações SEO salvas com sucesso!');
      } else {
        setMsg(`Erro: ${json.message}`);
      }
    } catch {
      setMsg('Erro ao salvar configurações SEO');
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleUploadOgImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const res = await authFetch('/admin/fotos/upload-url', {
          method: 'POST',
          body: JSON.stringify({ albumId: 'seo', contentType: file.type }),
        });
        const json = await res.json();
        if (json.success && json.data?.uploadUrl) {
          await fetch(json.data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
          const viewRes = await authFetch('/admin/fotos/view-url', { method: 'POST', body: JSON.stringify({ key: json.data.key }) });
          const viewJson = await viewRes.json();
          const url = viewJson.success ? viewJson.data.url : '';
          setForm({ ...form, og_image_key: json.data.key, og_image_url: url });
        }
      } catch (err) {
        console.error('Upload OG image failed:', err);
      }
    };
    input.click();
  };

  const addArea = () => {
    if (!novaArea.trim()) return;
    const areas = [...(form.schema_areas_atuacao || []), novaArea.trim()];
    setForm({ ...form, schema_areas_atuacao: areas });
    setNovaArea('');
  };

  const removeArea = (idx) => {
    const areas = (form.schema_areas_atuacao || []).filter((_, i) => i !== idx);
    setForm({ ...form, schema_areas_atuacao: areas });
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  return (
    <div>
      {/* Header com botão salvar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Configure as meta tags, Schema.org e tracking para melhorar seu posicionamento no Google.</p>
        <button onClick={handleSave} disabled={saving} style={{ background: ACCENT }}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
          <Save size={16} />
          {saving ? 'Salvando...' : 'Salvar SEO'}
        </button>
      </div>

      {/* Feedback */}
      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.includes('sucesso') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-4 mb-4 border-b overflow-x-auto">
        {SUB_TABS.map(st => {
          const Icon = st.icon;
          return (
            <button key={st.key} onClick={() => setSubTab(st.key)}
              className={`flex items-center gap-1.5 pb-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${subTab === st.key ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Icon size={14} />
              {st.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* ═══ Meta Tags Básicas ═══ */}
        {subTab === 'basico' && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Meta Tags Básicas</h3>
            <p className="text-xs text-gray-500 mb-4">Estas informações aparecem nos resultados do Google quando alguém busca pelo seu nome ou serviços.</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título do site <span className="text-gray-400">({form.titulo_padrao?.length || 0}/70)</span>
              </label>
              <input type="text" maxLength={70} value={form.titulo_padrao}
                onChange={e => setForm({ ...form, titulo_padrao: e.target.value })}
                placeholder="Ex: Fotógrafo de Casamento em SP | MB Foto"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
              <p className="text-xs text-gray-400 mt-1">Aparece na aba do navegador e como título no Google.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição <span className="text-gray-400">({form.descricao_padrao?.length || 0}/320)</span>
              </label>
              <textarea maxLength={320} rows={3} value={form.descricao_padrao}
                onChange={e => setForm({ ...form, descricao_padrao: e.target.value })}
                placeholder="Ex: Fotógrafo profissional especializado em casamentos, ensaios e eventos em São Paulo. Registre os melhores momentos da sua vida."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 resize-none" />
              <p className="text-xs text-gray-400 mt-1">Texto que aparece abaixo do título nos resultados de busca (ideal: 150-160 caracteres).</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Palavras-chave</label>
              <input type="text" value={form.keywords}
                onChange={e => setForm({ ...form, keywords: e.target.value })}
                placeholder="fotógrafo, casamento, ensaio, São Paulo, gestante, corporativo"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
              <p className="text-xs text-gray-400 mt-1">Separe por vírgula. Ajuda mecanismos de busca a categorizar seu site.</p>
            </div>

            {/* Preview Google */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Eye size={14} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-600 uppercase">Preview no Google</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-blue-700 text-lg font-medium leading-tight hover:underline cursor-pointer">
                  {form.titulo_padrao || 'Título do seu site'}
                </p>
                <p className="text-green-700 text-xs">www.marcelobloisefotografia.com.br</p>
                <p className="text-gray-600 text-sm leading-snug">
                  {form.descricao_padrao || 'Descrição do seu site aparecerá aqui nos resultados de busca do Google...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Open Graph ═══ */}
        {subTab === 'opengraph' && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Open Graph (Redes Sociais)</h3>
            <p className="text-xs text-gray-500 mb-4">Controla como seu site aparece quando compartilhado no WhatsApp, Facebook e Instagram.</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Imagem de compartilhamento (OG Image)</label>
              <p className="text-xs text-gray-400 mb-2">Tamanho recomendado: 1200x630px. Aparece no preview do link nas redes sociais.</p>
              
              {form.og_image_url ? (
                <div className="relative inline-block">
                  <img src={form.og_image_url} alt="OG" className="w-80 h-40 object-cover rounded-lg border" />
                  <button onClick={() => setForm({ ...form, og_image_url: '', og_image_key: '' })}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button onClick={handleUploadOgImage}
                  className="flex items-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-orange-300 hover:text-orange-500 w-80 justify-center">
                  <Image size={20} />
                  Enviar imagem OG (1200x630)
                </button>
              )}
            </div>

            {/* Preview OG Card */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Eye size={14} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-600 uppercase">Preview de compartilhamento</span>
              </div>
              <div className="bg-white border rounded-lg overflow-hidden max-w-sm shadow-sm">
                <div className="h-32 bg-gray-200 flex items-center justify-center">
                  {form.og_image_url ? (
                    <img src={form.og_image_url} alt="OG Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-400 text-xs">Sem imagem</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray-500 uppercase">marcelobloisefotografia.com.br</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{form.titulo_padrao || 'Título do site'}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{form.descricao_padrao || 'Descrição do site'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Schema.org ═══ */}
        {subTab === 'schema' && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Schema.org (Dados Estruturados)</h3>
            <p className="text-xs text-gray-500 mb-4">Informa ao Google detalhes do seu negócio. Pode gerar rich snippets (estrelas, endereço, telefone) nos resultados.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de negócio</label>
                <select value={form.schema_type} onChange={e => setForm({ ...form, schema_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400">
                  {SCHEMA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do negócio</label>
                <input type="text" value={form.schema_nome}
                  onChange={e => setForm({ ...form, schema_nome: e.target.value })}
                  placeholder="Marcelo Bloise Fotografia"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do negócio</label>
              <textarea rows={2} value={form.schema_descricao}
                onChange={e => setForm({ ...form, schema_descricao: e.target.value })}
                placeholder="Fotógrafo profissional especializado em casamentos e eventos"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 resize-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                <input type="text" value={form.schema_endereco}
                  onChange={e => setForm({ ...form, schema_endereco: e.target.value })}
                  placeholder="Rua Exemplo, 123"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input type="text" value={form.schema_cidade}
                  onChange={e => setForm({ ...form, schema_cidade: e.target.value })}
                  placeholder="São Paulo"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <input type="text" value={form.schema_estado}
                  onChange={e => setForm({ ...form, schema_estado: e.target.value })}
                  placeholder="SP"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                <input type="text" value={form.schema_cep}
                  onChange={e => setForm({ ...form, schema_cep: e.target.value })}
                  placeholder="01234-567"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input type="text" value={form.schema_telefone}
                  onChange={e => setForm({ ...form, schema_telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input type="text" value={form.schema_email}
                  onChange={e => setForm({ ...form, schema_email: e.target.value })}
                  placeholder="contato@mbfoto.com.br"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço mínimo (R$)</label>
                <input type="text" value={form.schema_preco_min}
                  onChange={e => setForm({ ...form, schema_preco_min: e.target.value })}
                  placeholder="2000"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço máximo (R$)</label>
                <input type="text" value={form.schema_preco_max}
                  onChange={e => setForm({ ...form, schema_preco_max: e.target.value })}
                  placeholder="15000"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
              </div>
            </div>

            {/* Áreas de atuação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Áreas de atuação / Serviços</label>
              <div className="flex gap-2 mb-2">
                <input type="text" value={novaArea}
                  onChange={e => setNovaArea(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArea())}
                  placeholder="Ex: Casamento, Gestante, Corporativo..."
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
                <button onClick={addArea} style={{ background: ACCENT }}
                  className="px-3 py-2 text-white rounded-lg text-sm hover:opacity-90">
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(form.schema_areas_atuacao || []).map((area, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs border border-orange-200">
                    {area}
                    <button onClick={() => removeArea(idx)} className="hover:text-red-500"><X size={12} /></button>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">Aparecem no JSON-LD como serviços oferecidos.</p>
            </div>
          </div>
        )}

        {/* ═══ Analytics & Tracking ═══ */}
        {subTab === 'analytics' && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Analytics & Tracking</h3>
            <p className="text-xs text-gray-500 mb-4">IDs de rastreamento para medir o tráfego do seu site.</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Analytics 4 (Measurement ID)</label>
              <input type="text" value={form.google_analytics_id}
                onChange={e => setForm({ ...form, google_analytics_id: e.target.value })}
                placeholder="G-XXXXXXXXXX"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
              <p className="text-xs text-gray-400 mt-1">
                Encontre em: Google Analytics → Admin → Data Streams → Measurement ID
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Search Console (meta tag de verificação)</label>
              <input type="text" value={form.google_search_console}
                onChange={e => setForm({ ...form, google_search_console: e.target.value })}
                placeholder="Apenas o conteúdo: abc123def456..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
              <p className="text-xs text-gray-400 mt-1">
                Cole apenas o valor do content da meta tag de verificação do Google Search Console.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Pixel (Facebook/Instagram)</label>
              <input type="text" value={form.meta_facebook_pixel}
                onChange={e => setForm({ ...form, meta_facebook_pixel: e.target.value })}
                placeholder="123456789012345"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
              <p className="text-xs text-gray-400 mt-1">
                Permite rastrear visitantes e fazer remarketing no Instagram/Facebook.
              </p>
            </div>
          </div>
        )}

        {/* ═══ Avançado ═══ */}
        {subTab === 'avancado' && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Código Personalizado</h3>
            <p className="text-xs text-gray-500 mb-4">Código HTML/JS que será injetado no {'<head>'} de todas as páginas públicas. Use com cuidado.</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom Head HTML</label>
              <textarea rows={8} value={form.meta_custom_head}
                onChange={e => setForm({ ...form, meta_custom_head: e.target.value })}
                placeholder={'<!-- Scripts, meta tags, ou pixels adicionais -->\n<meta name="author" content="Marcelo Bloise">\n<link rel="preconnect" href="https://fonts.googleapis.com">'}
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-orange-200 focus:border-orange-400 resize-none bg-gray-50" />
              <p className="text-xs text-gray-400 mt-1">
                ⚠️ Cuidado: código inválido pode quebrar a renderização do site. Teste antes de salvar.
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Dicas de uso</h4>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Google Tag Manager: cole o script aqui</li>
                <li>Fontes personalizadas: link do Google Fonts</li>
                <li>Chatbots (Drift, Intercom): script de embed</li>
                <li>Verificação de domínio (Pinterest, Bing): meta tags</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
