import { useState, useEffect } from 'react';
import { Settings, Save, Upload, Shield, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ACCENT = '#EA580C';

const UF_OPTIONS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
];

function maskCNPJ(value) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export default function ConfigNFSe() {
  const { authFetch } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Dados do Prestador
  const [cnpj, setCnpj] = useState('');
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [uf, setUf] = useState('');
  const [codigoMunicipioIBGE, setCodigoMunicipioIBGE] = useState('');

  // Tributação
  const [cnae, setCnae] = useState('7420-0/01');
  const [codigoTributacaoNacional, setCodigoTributacaoNacional] = useState('13.03.01.00');
  const [serieDPS, setSerieDPS] = useState('NFSE');

  // Ambiente
  const [ambiente, setAmbiente] = useState('homologacao');

  // Emissão Automática
  const [emissaoAutomatica, setEmissaoAutomatica] = useState(false);

  // Certificado Digital
  const [certificadoInfo, setCertificadoInfo] = useState(null);
  const [pfxFile, setPfxFile] = useState(null);
  const [pfxPassphrase, setPfxPassphrase] = useState('');
  const [uploadingCert, setUploadingCert] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      setLoading(true);
      const res = await authFetch('/admin/nfse/config');
      if (res.ok) {
        const data = await res.json();
        setCnpj(data.cnpj || '');
        setInscricaoMunicipal(data.inscricao_municipal || '');
        setRazaoSocial(data.razao_social || '');
        setUf(data.uf || '');
        setCodigoMunicipioIBGE(data.codigo_municipio_ibge || '');
        setCnae(data.cnae || '7420-0/01');
        setCodigoTributacaoNacional(data.codigo_tributacao_nacional || '13.03.01.00');
        setSerieDPS(data.serie_dps || 'NFSE');
        setAmbiente(data.ambiente || 'homologacao');
        setEmissaoAutomatica(data.emissao_automatica || false);
        setCertificadoInfo(data.certificado || null);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao carregar configurações.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      const payload = {
        cnpj: cnpj.replace(/\D/g, ''),
        inscricao_municipal: inscricaoMunicipal,
        razao_social: razaoSocial,
        uf,
        codigo_municipio_ibge: codigoMunicipioIBGE,
        cnae,
        codigo_tributacao_nacional: codigoTributacaoNacional,
        serie_dps: serieDPS,
        ambiente,
        emissao_automatica: emissaoAutomatica,
      };
      const res = await authFetch('/admin/nfse/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      } else {
        const err = await res.json().catch(() => null);
        setMessage({ type: 'error', text: err?.message || 'Erro ao salvar configurações.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadCertificado() {
    if (!pfxFile || !pfxPassphrase) {
      setMessage({ type: 'error', text: 'Selecione o arquivo .pfx e informe a senha.' });
      return;
    }
    try {
      setUploadingCert(true);
      setMessage(null);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        const res = await authFetch('/admin/nfse/certificado', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pfx_base64: base64, passphrase: pfxPassphrase }),
        });
        if (res.ok) {
          const data = await res.json();
          setCertificadoInfo(data.certificado || data);
          setPfxFile(null);
          setPfxPassphrase('');
          setMessage({ type: 'success', text: 'Certificado enviado com sucesso!' });
        } else {
          const err = await res.json().catch(() => null);
          setMessage({ type: 'error', text: err?.message || 'Erro ao enviar certificado.' });
        }
        setUploadingCert(false);
      };
      reader.readAsDataURL(pfxFile);
    } catch {
      setMessage({ type: 'error', text: 'Erro ao enviar certificado.' });
      setUploadingCert(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: ACCENT }} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${ACCENT}15` }}>
          <Settings className="w-6 h-6" style={{ color: ACCENT }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuração NFS-e</h1>
          <p className="text-sm text-gray-500">Padrão Nacional MEI</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-xl border ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'success'
            ? <CheckCircle className="w-5 h-5 flex-shrink-0" />
            : <AlertCircle className="w-5 h-5 flex-shrink-0" />
          }
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Dados do Prestador */}
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">Dados do Prestador</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
                placeholder="00.000.000/0000-00"
                className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inscrição Municipal</label>
              <input
                type="text"
                value={inscricaoMunicipal}
                onChange={(e) => setInscricaoMunicipal(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social</label>
              <input
                type="text"
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
              <select
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
              >
                <option value="">Selecione...</option>
                {UF_OPTIONS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código Município IBGE</label>
              <input
                type="text"
                value={codigoMunicipioIBGE}
                onChange={(e) => setCodigoMunicipioIBGE(e.target.value)}
                placeholder="Ex: 3550308"
                className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Tributação */}
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">Tributação</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNAE</label>
              <input
                type="text"
                value={cnae}
                onChange={(e) => setCnae(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código Tributação Nacional</label>
              <input
                type="text"
                value={codigoTributacaoNacional}
                onChange={(e) => setCodigoTributacaoNacional(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Série DPS</label>
              <input
                type="text"
                value={serieDPS}
                onChange={(e) => setSerieDPS(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Ambiente */}
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">Ambiente</h2>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="ambiente"
                value="producao"
                checked={ambiente === 'producao'}
                onChange={(e) => setAmbiente(e.target.value)}
                className="w-4 h-4 accent-orange-600"
              />
              <span className="text-sm font-medium text-gray-700">Produção</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="ambiente"
                value="homologacao"
                checked={ambiente === 'homologacao'}
                onChange={(e) => setAmbiente(e.target.value)}
                className="w-4 h-4 accent-orange-600"
              />
              <span className="text-sm font-medium text-gray-700">Homologação</span>
            </label>
          </div>
          {ambiente === 'producao' && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-xs text-amber-700">Atenção: NFS-e emitidas em produção possuem validade fiscal.</span>
            </div>
          )}
        </div>

        {/* Emissão Automática */}
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Emissão Automática</h2>
                <p className="text-sm text-gray-500">Emitir NFS-e automaticamente ao confirmar pagamento</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={emissaoAutomatica}
              onClick={() => setEmissaoAutomatica(!emissaoAutomatica)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                emissaoAutomatica ? '' : 'bg-gray-300'
              }`}
              style={emissaoAutomatica ? { backgroundColor: ACCENT } : {}}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                  emissaoAutomatica ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Certificado Digital A1 */}
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">Certificado Digital A1</h2>
          </div>

          {certificadoInfo && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Certificado configurado</span>
              </div>
              <p className="text-sm text-green-700 ml-6">
                <span className="font-medium">CN:</span> {certificadoInfo.cn}
              </p>
              <p className="text-sm text-green-700 ml-6">
                <span className="font-medium">Validade:</span> {certificadoInfo.validade}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo .pfx</label>
              <div className="relative">
                <input
                  type="file"
                  accept=".pfx"
                  onChange={(e) => setPfxFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha do Certificado</label>
              <input
                type="password"
                value={pfxPassphrase}
                onChange={(e) => setPfxPassphrase(e.target.value)}
                placeholder="Senha do arquivo .pfx"
                className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleUploadCertificado}
            disabled={uploadingCert || !pfxFile || !pfxPassphrase}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: ACCENT }}
          >
            <Upload className="w-4 h-4" />
            {uploadingCert ? 'Enviando...' : 'Enviar Certificado'}
          </button>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium text-sm transition-opacity disabled:opacity-50 shadow-sm"
            style={{ backgroundColor: ACCENT }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </form>
    </div>
  );
}
