import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Upload, CheckCircle, Save, AlertCircle } from 'lucide-react';

const ACCENT = '#EA580C';

export default function NfseConfig() {
  const { authFetch } = useAuth();
  const [config, setConfig] = useState({
    cnpj: '', inscricao_municipal: '', razao_social: '', nome_fantasia: '',
    codigo_servico: '09911', descricao_servico_padrao: 'Serviços fotográficos profissionais',
    aliquota: 2, ambiente: 'homologacao', regime_tributario: 'simples_nacional',
    endereco: { logradouro: '', numero: '', complemento: '', bairro: '', cidade: 'São Paulo', uf: 'SP', cep: '' },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [temCertificado, setTemCertificado] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [certSenha, setCertSenha] = useState('');

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const res = await authFetch('/admin/nfse/config');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.configurado) {
          setConfig(prev => ({ ...prev, ...json.data }));
          setTemCertificado(!!json.data.tem_certificado);
        }
      }
    } catch {}
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const res = await authFetch('/admin/nfse/config', { method: 'PUT', body: JSON.stringify(config) });
      const json = await res.json();
      if (json.success) setMsg('Configuração salva com sucesso!');
      else setMsg('Erro: ' + json.message);
    } catch { setMsg('Erro ao salvar'); }
    setSaving(false);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleUploadCert = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!certSenha) { alert('Informe a senha do certificado antes de fazer upload'); return; }
    setUploadingCert(true);
    try {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });
      const res = await authFetch('/admin/nfse/upload-certificado', {
        method: 'POST',
        body: JSON.stringify({ certificado_base64: base64, senha: certSenha, filename: file.name }),
      });
      const json = await res.json();
      if (json.success) { setTemCertificado(true); setMsg('Certificado enviado com sucesso!'); }
      else setMsg('Erro: ' + json.message);
    } catch { setMsg('Erro ao enviar certificado'); }
    setUploadingCert(false);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleChange = (e) => setConfig({ ...config, [e.target.name]: e.target.value });
  const handleEndereco = (e) => setConfig({ ...config, endereco: { ...config.endereco, [e.target.name]: e.target.value } });

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield size={24} style={{ color: ACCENT }} />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Configuração NFS-e</h1>
            <p className="text-sm text-gray-500">Emissão via Prefeitura de São Paulo (NF Paulistana)</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ background: ACCENT }}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
          <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {msg && <div className={`p-3 rounded-lg text-sm ${msg.includes('sucesso') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

      {/* Certificado Digital */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Upload size={18} style={{ color: ACCENT }} /> Certificado Digital A1
        </h3>

        <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border">
          {temCertificado ? (
            <><CheckCircle size={20} className="text-green-500" /><span className="text-sm text-green-700 font-medium">Certificado carregado ✓</span></>
          ) : (
            <><AlertCircle size={20} className="text-yellow-500" /><span className="text-sm text-yellow-700">Nenhum certificado configurado</span></>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha do Certificado</label>
            <input type="password" value={certSenha} onChange={e => setCertSenha(e.target.value)}
              placeholder="Senha do .pfx" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo .pfx / .p12</label>
            <input type="file" accept=".pfx,.p12" onChange={handleUploadCert} disabled={uploadingCert || !certSenha}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm file:mr-3 file:rounded file:border-0 file:bg-orange-50 file:text-orange-600 file:font-medium file:px-3 file:py-1 disabled:opacity-50" />
          </div>
        </div>
      </div>

      {/* Dados do Prestador */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Dados do Prestador</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ *</label>
            <input name="cnpj" value={config.cnpj} onChange={handleChange}
              placeholder="00.000.000/0000-00" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Inscrição Municipal (CCM) *</label>
            <input name="inscricao_municipal" value={config.inscricao_municipal} onChange={handleChange}
              placeholder="00000000" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social *</label>
            <input name="razao_social" value={config.razao_social} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia</label>
            <input name="nome_fantasia" value={config.nome_fantasia} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none" />
          </div>
        </div>
      </div>

      {/* Configuração Fiscal */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Configuração Fiscal</h3>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código de Serviço</label>
            <input name="codigo_servico" value={config.codigo_servico} onChange={handleChange}
              placeholder="09911" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none" />
            <p className="text-xs text-gray-400 mt-1">09911 = Serviços de fotografia</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alíquota ISS (%)</label>
            <input name="aliquota" type="number" step="0.01" min="0" max="5" value={config.aliquota} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Regime Tributário</label>
            <select name="regime_tributario" value={config.regime_tributario} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none">
              <option value="simples_nacional">Simples Nacional</option>
              <option value="lucro_presumido">Lucro Presumido</option>
              <option value="lucro_real">Lucro Real</option>
              <option value="mei">MEI</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Padrão do Serviço</label>
          <textarea name="descricao_servico_padrao" value={config.descricao_servico_padrao} onChange={handleChange} rows={2}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none resize-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ambiente</label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setConfig({ ...config, ambiente: 'homologacao' })}
              className={`px-4 py-2 rounded-lg text-sm font-medium border ${config.ambiente === 'homologacao' ? 'border-yellow-300 bg-yellow-50 text-yellow-700' : 'border-gray-200 text-gray-500'}`}>
              Homologação (teste)
            </button>
            <button type="button" onClick={() => setConfig({ ...config, ambiente: 'producao' })}
              className={`px-4 py-2 rounded-lg text-sm font-medium border ${config.ambiente === 'producao' ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>
              Produção
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-700">
          💡 <strong>Como funciona:</strong> O sistema envia o RPS (Recibo Provisório de Serviço) assinado digitalmente para o web service da Prefeitura de SP. A NFS-e é gerada automaticamente e o PDF fica disponível para download. Use "Homologação" para testar sem emitir notas reais.
        </p>
      </div>
    </div>
  );
}
