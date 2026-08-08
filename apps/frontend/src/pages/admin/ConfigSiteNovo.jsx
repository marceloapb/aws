import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Image, Upload, Plus, X, Trash2, GripVertical } from 'lucide-react';
import RichTextEditor from '../../components/ui/RichTextEditor';

const ACCENT = '#EA580C';

const SUB_TABS = [
  { key: 'hero', label: 'Hero' },
  { key: 'stats', label: 'Estatísticas' },
  { key: 'sobre', label: 'Sobre' },
  { key: 'servicos', label: 'Serviços' },
  { key: 'contato', label: 'Contato' },
  { key: 'visual', label: 'Visual' },
];

const DEFAULT_CONFIG = {
  hero_titulo: 'Fotografia que',
  hero_palavras: ['Emociona', 'Conecta', 'Transforma', 'Inspira', 'Permanece'],
  hero_subtitulo: 'Cada clique é uma história. Capturo momentos que você vai querer guardar para sempre.',
  hero_imagens: [],
  hero_cta_texto: 'Faça um Orçamento',
  hero_cta_url: '/contato',
  stats: [
    { numero: '12+', label: 'Anos' },
    { numero: '800+', label: 'Sessões' },
    { numero: '200+', label: 'Casamentos' },
    { numero: '98%', label: 'Satisfação' },
  ],
  sobre_foto: '',
  sobre_bio: '',
  sobre_citacao: '',
  sobre_citacao_autor: '',
  sobre_badge_texto: '12 Anos',
  sobre_badge_sub: 'de experiência',
  servicos: [],
  contato_titulo: 'Vamos criar algo único',
  contato_subtitulo: 'Cada projeto começa com uma conversa. Conte-me sobre o seu momento especial.',
  contato_email: '',
  contato_whatsapp: '',
  contato_instagram: '',
  contato_endereco: '',
  cor_accent: '#ff5c00',
  cor_background: '#0d0d0d',
  cor_texto: '#f0ece4',
  fonte_titulo: 'Barlow Condensed',
};

export default function ConfigSiteNovo() {
  const { authFetch } = useAuth();
  const [form, setForm] = useState({ ...DEFAULT_CONFIG });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('hero');

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      // Load v2-config (if already saved)
      const res = await authFetch('/admin/site/v2-config');
      const json = await res.json();
      if (json.success && json.data) {
        setForm(prev => ({ ...prev, ...json.data }));
      } else {
        // Pre-populate from existing configs (empresa + site)
        const [configRes, siteRes] = await Promise.all([
          authFetch('/admin/configuracoes').then(r => r.json()).catch(() => null),
          authFetch('/admin/site/config').then(r => r.json()).catch(() => null),
        ]);
        const empresa = configRes?.success ? configRes.data : {};
        const site = siteRes?.success ? siteRes.data : {};
        setForm(prev => ({
          ...prev,
          contato_email: empresa?.email || empresa?.SES_FROM_EMAIL || '',
          contato_whatsapp: empresa?.whatsappBusiness || empresa?.telefone || '',
          contato_instagram: empresa?.instagram || '',
          contato_endereco: empresa?.cidade ? `${empresa.cidade}, ${empresa.estado || 'SP'}` : '',
          sobre_bio: empresa?.descricao || empresa?.bio || '',
        }));
      }
    } catch {}
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const res = await authFetch('/admin/site/v2-config', { method: 'PUT', body: JSON.stringify(form) });
      const json = await res.json();
      if (json.success) setMsg('Configurações salvas com sucesso!');
      else setMsg(`Erro: ${json.message}`);
    } catch { setMsg('Erro ao salvar'); }
    setSaving(false);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleUpload = async (field) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const res = await authFetch('/admin/fotos/upload-url', {
          method: 'POST', body: JSON.stringify({ albumId: 'site-novo', contentType: file.type }),
        });
        const json = await res.json();
        if (json.success && json.data?.uploadUrl) {
          await fetch(json.data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
          const cdnUrl = `https://d2112x4m4e89fv.cloudfront.net/${json.data.key}`;
          setForm(prev => ({ ...prev, [field]: cdnUrl }));
        }
      } catch {}
    };
    input.click();
  };

  const handleUploadToArray = async (field) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      for (const file of files) {
        try {
          const res = await authFetch('/admin/fotos/upload-url', {
            method: 'POST', body: JSON.stringify({ albumId: 'site-novo', contentType: file.type }),
          });
          const json = await res.json();
          if (json.success && json.data?.uploadUrl) {
            await fetch(json.data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
            const cdnUrl = `https://d2112x4m4e89fv.cloudfront.net/${json.data.key}`;
            setForm(prev => ({ ...prev, [field]: [...(prev[field] || []), cdnUrl] }));
          }
        } catch {}
      }
    };
    input.click();
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurar Site</h1>
          <p className="text-sm text-gray-500">Personalize textos, imagens e cores do site principal.</p>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ background: ACCENT }}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
          <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.includes('sucesso') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-4 mb-4 border-b overflow-x-auto">
        {SUB_TABS.map(st => (
          <button key={st.key} onClick={() => setTab(st.key)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === st.key ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {st.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* ═══ HERO ═══ */}
        {tab === 'hero' && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800">Seção Hero</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título fixo (antes das palavras animadas)</label>
              <input type="text" value={form.hero_titulo} onChange={e => update('hero_titulo', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Fotografia que" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Palavras animadas (uma por linha)</label>
              <textarea rows={4} value={(form.hero_palavras || []).join('\n')}
                onChange={e => update('hero_palavras', e.target.value.split('\n').filter(w => w.trim()))}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Emociona\nConecta\nTransforma" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
              <textarea rows={2} value={form.hero_subtitulo} onChange={e => update('hero_subtitulo', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Texto do botão CTA</label>
                <input type="text" value={form.hero_cta_texto} onChange={e => update('hero_cta_texto', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL do botão CTA</label>
                <input type="text" value={form.hero_cta_url} onChange={e => update('hero_cta_url', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="/contato" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Imagens de fundo (rotacionam automaticamente)</label>
              <div className="flex flex-wrap gap-3 mb-2">
                {(form.hero_imagens || []).map((url, i) => (
                  <div key={i} className="relative w-32 h-20 rounded-lg overflow-hidden border">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => update('hero_imagens', form.hero_imagens.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"><X size={10} /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => handleUploadToArray('hero_imagens')}
                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-orange-300 hover:text-orange-500">
                <Upload size={16} /> Adicionar imagens
              </button>
            </div>
          </div>
        )}

        {/* ═══ STATS ═══ */}
        {tab === 'stats' && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800">Estatísticas (números destaque)</h3>
            <p className="text-xs text-gray-500">Aparecem abaixo do hero. Ex: 12+ Anos, 800+ Sessões.</p>
            {(form.stats || []).map((stat, i) => (
              <div key={i} className="flex gap-3 items-center">
                <input type="text" value={stat.numero} placeholder="12+"
                  onChange={e => { const s = [...form.stats]; s[i] = { ...s[i], numero: e.target.value }; update('stats', s); }}
                  className="w-24 px-3 py-2 border rounded-lg text-sm font-bold" />
                <input type="text" value={stat.label} placeholder="Anos"
                  onChange={e => { const s = [...form.stats]; s[i] = { ...s[i], label: e.target.value }; update('stats', s); }}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                <button onClick={() => update('stats', form.stats.filter((_, idx) => idx !== i))}
                  className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
            ))}
            <button onClick={() => update('stats', [...(form.stats || []), { numero: '', label: '' }])}
              className="flex items-center gap-1 text-sm font-medium" style={{ color: ACCENT }}>
              <Plus size={14} /> Adicionar estatística
            </button>
          </div>
        )}

        {/* ═══ SOBRE ═══ */}
        {tab === 'sobre' && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800">Seção Sobre</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Foto do fotógrafo</label>
              {form.sobre_foto ? (
                <div className="relative inline-block">
                  <img src={form.sobre_foto} alt="" className="w-40 h-52 object-cover rounded-lg border" />
                  <button onClick={() => update('sobre_foto', '')} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><X size={10} /></button>
                </div>
              ) : (
                <button onClick={() => handleUpload('sobre_foto')}
                  className="flex items-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-orange-300">
                  <Upload size={16} /> Enviar foto
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Biografia</label>
              <RichTextEditor
                value={form.sobre_bio}
                onChange={(html) => update('sobre_bio', html)}
                placeholder="Conte sua história..."
                minHeight="180px"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Badge - Texto</label>
                <input type="text" value={form.sobre_badge_texto} onChange={e => update('sobre_badge_texto', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="12 Anos" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Badge - Subtexto</label>
                <input type="text" value={form.sobre_badge_sub} onChange={e => update('sobre_badge_sub', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="de experiência" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Citação</label>
              <RichTextEditor
                value={form.sobre_citacao}
                onChange={(html) => update('sobre_citacao', html)}
                placeholder="Uma frase inspiradora..."
                minHeight="100px"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Autor da citação</label>
              <input type="text" value={form.sobre_citacao_autor} onChange={e => update('sobre_citacao_autor', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
        )}

        {/* ═══ SERVIÇOS ═══ */}
        {tab === 'servicos' && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800">Serviços</h3>
            <p className="text-xs text-gray-500">Cards com foto, título, descrição, preço e tags.</p>
            {(form.servicos || []).map((sv, i) => (
              <div key={i} className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">Serviço {String(i + 1).padStart(2, '0')}</span>
                  <button onClick={() => update('servicos', form.servicos.filter((_, idx) => idx !== i))}
                    className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={sv.titulo || ''} placeholder="Título"
                    onChange={e => { const s = [...form.servicos]; s[i] = { ...s[i], titulo: e.target.value }; update('servicos', s); }}
                    className="px-3 py-2 border rounded-lg text-sm" />
                  <input type="text" value={sv.preco || ''} placeholder="A partir de R$ 800"
                    onChange={e => { const s = [...form.servicos]; s[i] = { ...s[i], preco: e.target.value }; update('servicos', s); }}
                    className="px-3 py-2 border rounded-lg text-sm" />
                </div>
                <textarea rows={2} value={sv.descricao || ''} placeholder="Descrição do serviço"
                  onChange={e => { const s = [...form.servicos]; s[i] = { ...s[i], descricao: e.target.value }; update('servicos', s); }}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
                <div>
                  <label className="text-xs text-gray-500">Tags (separar por vírgula)</label>
                  <input type="text" value={(sv.tags || []).join(', ')} placeholder="Making-of, Cerimônia, Festa"
                    onChange={e => { const s = [...form.servicos]; s[i] = { ...s[i], tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }; update('servicos', s); }}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div className="flex items-center gap-3">
                  {sv.imagem ? (
                    <div className="relative">
                      <img src={sv.imagem} alt="" className="w-20 h-20 object-cover rounded border" />
                      <button onClick={() => { const s = [...form.servicos]; s[i] = { ...s[i], imagem: '' }; update('servicos', s); }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X size={8} /></button>
                    </div>
                  ) : (
                    <button onClick={async () => {
                      const input = document.createElement('input');
                      input.type = 'file'; input.accept = 'image/*';
                      input.onchange = async (e) => {
                        const file = e.target.files[0]; if (!file) return;
                        const res = await authFetch('/admin/fotos/upload-url', { method: 'POST', body: JSON.stringify({ albumId: 'site-novo', contentType: file.type }) });
                        const json = await res.json();
                        if (json.success && json.data?.uploadUrl) {
                          await fetch(json.data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
                          const cdnUrl = `https://d2112x4m4e89fv.cloudfront.net/${json.data.key}`;
                          const s = [...form.servicos]; s[i] = { ...s[i], imagem: cdnUrl }; update('servicos', s);
                        }
                      }; input.click();
                    }} className="flex items-center gap-1 px-3 py-2 border-2 border-dashed rounded-lg text-xs text-gray-500">
                      <Upload size={12} /> Imagem
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button onClick={() => update('servicos', [...(form.servicos || []), { titulo: '', descricao: '', preco: '', imagem: '', tags: [] }])}
              className="flex items-center gap-1 text-sm font-medium" style={{ color: ACCENT }}>
              <Plus size={14} /> Adicionar serviço
            </button>
          </div>
        )}

        {/* ═══ CONTATO ═══ */}
        {tab === 'contato' && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800">Seção Contato</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input type="text" value={form.contato_titulo} onChange={e => update('contato_titulo', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
                <input type="text" value={form.contato_subtitulo} onChange={e => update('contato_subtitulo', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input type="text" value={form.contato_email} onChange={e => update('contato_email', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="contato@seudominio.com.br" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input type="text" value={form.contato_whatsapp} onChange={e => update('contato_whatsapp', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="+55 (11) 99999-9999" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                <input type="text" value={form.contato_instagram} onChange={e => update('contato_instagram', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="@seuuser" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço / Cidade</label>
                <input type="text" value={form.contato_endereco} onChange={e => update('contato_endereco', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="São Paulo, SP" />
              </div>
            </div>
          </div>
        )}

        {/* ═══ VISUAL ═══ */}
        {tab === 'visual' && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800">Personalização Visual</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor Accent</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.cor_accent} onChange={e => update('cor_accent', e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer" />
                  <input type="text" value={form.cor_accent} onChange={e => update('cor_accent', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor Fundo</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.cor_background} onChange={e => update('cor_background', e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer" />
                  <input type="text" value={form.cor_background} onChange={e => update('cor_background', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor Texto</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.cor_texto} onChange={e => update('cor_texto', e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer" />
                  <input type="text" value={form.cor_texto} onChange={e => update('cor_texto', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fonte dos Títulos</label>
              <select value={form.fonte_titulo} onChange={e => update('fonte_titulo', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="Barlow Condensed">Barlow Condensed</option>
                <option value="Inter">Inter</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Oswald">Oswald</option>
                <option value="Playfair Display">Playfair Display</option>
                <option value="Poppins">Poppins</option>
                <option value="Raleway">Raleway</option>
                <option value="Roboto Condensed">Roboto Condensed</option>
              </select>
              {/* Font preview */}
              <div className="mt-3 p-4 rounded-lg border border-gray-200" style={{ background: form.cor_background }}>
                <p className="text-2xl font-black uppercase tracking-wide" style={{ fontFamily: `'${form.fonte_titulo}', sans-serif`, color: form.cor_texto }}>
                  Fotografia que Emociona
                </p>
                <p className="text-sm mt-1" style={{ fontFamily: `'${form.fonte_titulo}', sans-serif`, color: form.cor_accent }}>
                  MARCELO BLOISE
                </p>
              </div>
              <link href={`https://fonts.googleapis.com/css2?family=${form.fonte_titulo.replace(/ /g, '+')}:wght@400;700;900&display=swap`} rel="stylesheet" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
