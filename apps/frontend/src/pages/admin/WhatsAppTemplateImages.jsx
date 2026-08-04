import { useState, useEffect } from 'react';
import { Upload, Check, AlertCircle, Rocket, Image, RefreshCw } from 'lucide-react';

const API = '/admin/whatsapp';

export default function WhatsAppTemplateImages({ authFetch }) {
  const [templates, setTemplates] = useState([]);
  const [total, setTotal] = useState(0);
  const [comImagem, setComImagem] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [recriando, setRecriando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await authFetch(`${API}/template-images`);
      const data = await resp.json();
      if (data.success) { setTemplates(data.data.templates); setTotal(data.data.total); setComImagem(data.data.com_imagem); }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (key, file) => {
    if (!file || !file.type.startsWith('image/')) { alert('Selecione um arquivo de imagem'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Imagem deve ter no máximo 5MB'); return; }
    setUploading(key);
    try {
      const presignResp = await authFetch('/admin/upload/presign', { method: 'POST', body: JSON.stringify({ filename: `${key}.png`, contentType: file.type, folder: 'template-headers' }) });
      const presignData = await presignResp.json();
      if (!presignData.success) { alert(presignData.message || 'Erro'); return; }
      await fetch(presignData.data.upload_url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      const saveResp = await authFetch(`${API}/template-images/${key}`, { method: 'POST', body: JSON.stringify({ s3_key: presignData.data.key }) });
      const saveData = await saveResp.json();
      if (!saveData.success) { alert(saveData.message || 'Erro'); return; }
      load();
    } catch (err) { alert('Erro: ' + err.message); }
    finally { setUploading(null); }
  };

  const recriarTodos = async () => {
    if (!window.confirm('RECRIAR TODOS OS TEMPLATES?\n\n1. Deleta todos os antigos na Meta\n2. Cria os 15 novos com as imagens\n\nPode levar 1-2 min. Continuar?')) return;
    setRecriando(true); setResultado(null);
    try {
      const resp = await authFetch(`${API}/template-images/recriar-todos`, { method: 'POST' });
      const data = await resp.json();
      setResultado(data);
      if (data.success) alert(`${data.message}\n\nAguarde aprovação da Meta.`);
      else alert(data.message);
    } catch (err) { alert('Erro: ' + err.message); }
    finally { setRecriando(false); }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Image size={20} className="text-orange-600" /> Imagens dos Templates</h2>
            <p className="text-sm text-gray-500 mt-1">Suba as imagens e clique em "Recriar Todos" quando estiver pronto.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">{comImagem}/{total} imagens</div>
            <button onClick={load} className="p-2 rounded hover:bg-gray-100 text-gray-500"><RefreshCw size={16} /></button>
          </div>
        </div>
        <div className="mt-4 bg-gray-200 rounded-full h-2.5">
          <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${total > 0 ? (comImagem / total) * 100 : 0}%`, background: comImagem === total ? '#16a34a' : '#ea580c' }} />
        </div>
        {comImagem === total && total > 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
            <Check size={16} /> Todas as imagens prontas! Clique abaixo para recriar na Meta.
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map(tpl => (
          <div key={tpl.key} className={`bg-white border rounded-lg p-4 ${tpl.has_image ? 'border-green-200' : 'border-orange-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-800">{tpl.label}</span>
              {tpl.has_image ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Check size={10} /> OK</span> : <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle size={10} /> Pendente</span>}
            </div>
            <p className="text-xs text-gray-400 font-mono mb-2">{tpl.name}</p>
            {tpl.image_url ? <img src={tpl.image_url} alt={tpl.label} className="w-full h-24 object-cover rounded border bg-gray-50 mb-3" /> : <div className="mb-3 w-full h-24 border-2 border-dashed border-gray-200 rounded flex items-center justify-center text-gray-300"><Image size={24} /></div>}
            <label className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-sm cursor-pointer transition-colors ${uploading === tpl.key ? 'bg-gray-100 text-gray-400 pointer-events-none' : tpl.has_image ? 'border border-gray-200 text-gray-600 hover:bg-gray-50' : 'bg-orange-600 text-white hover:bg-orange-700'}`}>
              <Upload size={14} /> {uploading === tpl.key ? 'Enviando...' : tpl.has_image ? 'Trocar' : 'Upload'}
              <input type="file" accept="image/*" className="hidden" disabled={uploading === tpl.key} onChange={(e) => { handleUpload(tpl.key, e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-5">
        <button onClick={recriarTodos} disabled={recriando || comImagem < total} className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: comImagem === total ? '#16a34a' : '#9ca3af' }}>
          <Rocket size={18} /> {recriando ? 'Recriando... aguarde' : comImagem === total ? 'Recriar Todos os Templates na Meta' : `Faltam ${total - comImagem} imagens`}
        </button>
        {resultado && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${resultado.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            <p className="font-medium">{resultado.message}</p>
            {resultado.data?.erros?.length > 0 && <ul className="mt-2 space-y-1">{resultado.data.erros.map((e, i) => <li key={i} className="text-xs">{e.label}: {e.error}</li>)}</ul>}
          </div>
        )}
      </div>
    </div>
  );
}
