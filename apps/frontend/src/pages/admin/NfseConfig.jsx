import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Upload, CheckCircle, Save, AlertCircle, Zap } from 'lucide-react';

const ACCENT = '#EA580C';

export default function NfseConfig() {
  const { authFetch } = useAuth();
  const [config, setConfig] = useState({
    cnpj: '', inscricao_municipal: '', razao_social: '', nome_fantasia: '',
    cnae: '7420-0/01', codigo_trib_nacional: '13.03.01.00', serie: 'NFSE',
    descricao_servico_padrao: 'Cobertura fotográfica profissional de evento social.',
    ambiente: '2', regime_tributario: 'mei', emissao_automatica: true,
    codigo_municipio: '3550308', uf: 'SP',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [temCertificado, setTemCertificado] = useState(false);
  const [certInfo, setCertInfo] = useState(null);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [certSenha, setCertSenha] = useState('');

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const res = await authFetch('/admin/nfse/config');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setConfig(prev => ({
            ...prev,
            cnpj: d.cnpj || prev.cnpj,
            inscricao_municipal: d.inscricao_municipal || prev.inscricao_municipal,
            razao_social: d.razao_social || prev.razao_social,
            nome_fantasia: d.nome_fantasia || prev.nome_fantasia,
            cnae: d.cnae || prev.cnae,
            codigo_trib_nacional: d.codigo_trib_nacional || prev.codigo_trib_nacional,
            serie: d.serie || prev.serie,
            descricao_servico_padrao: d.descricao_servico_padrao || prev.descricao_servico_padrao,
            ambiente: d.ambiente || prev.ambiente,
            regime_tributario: d.regime_tributario || prev.regime_tributario,
            emissao_automatica: d.emissao_automatica !== false,
            codigo_municipio: d.codigo_municipio || prev.codigo_municipio,
            uf: d.uf || prev.uf,
          }));
          setTemCertificado(!!d.tem_certificado);
          if (d.cert_info) setCertInfo(d.cert_info);
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
    let senha = certSenha;
    if (!senha) {
      senha = prompt('Digite a senha do certificado:');
      if (!senha) { e.target.value = ''; return; }
      setCertSenha(senha);
    }
    setUploadingCert(true);
    try {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });
      const res = await authFetch('/admin/nfse/certificado', {
        method: 'POST',
        body: JSON.stringify({ pfx_base64: base64, passphrase: senha }),
      });
      const json = await res.json();
      if (json.success) {
        setTemCertificado(true);
        if (json.data) setCertInfo(json.data);
        setMsg('Certificado enviado com sucesso!');
      } else setMsg('Erro: ' + json.message);
    } catch { setMsg('Erro ao enviar certificado'); }
    setUploadingCert(false);
    e.target.value = '';
    setTimeout(() => setMsg(''), 4000);
  };

  const handleChange = (e) => setConfig({ ...config, [e.target.name]: e.target.value });

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield size={24} style={{ color: ACCENT }} />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Configuração NFS-e</h1>
            <p className="text-sm text-gray-500">Emissão automática — Padrão Nacional (SEFIN)</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ background: ACCENT }}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
          <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {msg && <div className={`p-3 rounded-lg text-sm ${msg.includes('sucesso') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

      {/* Emissão Automática */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={18} style={{ color: ACCENT }} />
            <div>
              <h3 className="text-base font-semibold text-gray-900">Emissão Automática</h3>
              <p className="text-sm text-gray-500">Emitir NFS-e automaticamente quando um pagamento é confirmado</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={config.emissao_automatica}
              onChange={e => setConfig({ ...config, emissao_automatica: e.target.checked })}
              className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
          </label>
        </div>
      </div>

      {/* Certificado Digital */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Upload size={18} style={{ color: ACCENT }} /> Certificado Digital e-CNPJ A1
        </h3>

        <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border">
          {temCertificado ? (
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-500" />
              <div>
                <span className="text-sm text-green-700 font-medium">Certificado carregado ✓</span>
                {certInfo && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {certInfo.subject} • Valido até {certInfo.validade ? new Date(certInfo.validade).toLocaleDateString('pt-BR') : '—'}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <><AlertCircle size={20} className="text-yellow-500" /><span className="text-sm text-yellow-700">Nenhum certificado configurado — necessário para assinar as notas</span></>
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
            <input type="file" accept=".pfx,.p12" onChange={handleUploadCert} disabled={uploadingCert}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm file:mr-3 file:rounded file:border-0 file:bg-orange-50 file:text-orange-600 file:font-medium file:px-3 file:py-1 disabled:opacity-50" />
          </div>
        </div>
      </div>

      {/* Dados do Prestador - Info */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <AlertCircle size={16} />
          <span>CNPJ, Razão Social e endereço são puxados automaticamente dos <strong>Dados da Empresa</strong> (aba Geral).</span>
        </div>
      </div>

      {/* Configuração Fiscal */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Tributação</h3>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNAE</label>
            <input name="cnae" value={config.cnae} onChange={handleChange}
              placeholder="7420-0/01" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none" />
            <p className="text-xs text-gray-400 mt-1">Fotografia: 7420-0/01</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código Tributação Nacional</label>
            <input name="codigo_trib_nacional" value={config.codigo_trib_nacional} onChange={handleChange}
              placeholder="13.03.01.00" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none" />
            <p className="text-xs text-gray-400 mt-1">Item 13.03 LC 116</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Série DPS</label>
            <input name="serie" value={config.serie} onChange={handleChange}
              placeholder="NFSE" maxLength={5} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Padrão do Serviço</label>
          <textarea name="descricao_servico_padrao" value={config.descricao_servico_padrao} onChange={handleChange} rows={2}
            placeholder="Texto que será usado na NFS-e quando não houver descrição específica na cobrança"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none resize-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ambiente</label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setConfig({ ...config, ambiente: '2' })}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${config.ambiente === '2' ? 'border-yellow-300 bg-yellow-50 text-yellow-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              🧪 Homologação
            </button>
            <button type="button" onClick={() => setConfig({ ...config, ambiente: '1' })}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${config.ambiente === '1' ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              🚀 Produção
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-700">
          💡 <strong>Padrão Nacional NFS-e:</strong> O sistema gera a DPS (Declaração de Prestação de Serviço), assina com o certificado A1 e envia para a SEFIN Nacional. A NFS-e é autorizada automaticamente. MEI não paga ISS avulso por nota (pago via DAS fixo mensal). Use "Homologação" para testar.
        </p>
      </div>
    </div>
  );
}
