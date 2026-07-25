import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, FileSignature, CheckCircle, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import SeloAssinatura from '../../components/SeloAssinatura';

const ACCENT = '#EA580C';
const API = process.env.REACT_APP_API_URL || 'https://setvwal0cd.execute-api.us-east-1.amazonaws.com/prod';

export default function ContratoClienteView() {
  const { token } = useParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [contrato, setContrato] = useState(null);
  const [loading, setLoading] = useState(true);

  // Step management: 'form' → 'otp' → 'sucesso'
  const [step, setStep] = useState('form');

  // Form state
  const [nomeDigitado, setNomeDigitado] = useState('');
  const [aceiteTermos, setAceiteTermos] = useState(false);

  // OTP state
  const [otpCodigo, setOtpCodigo] = useState(['', '', '', '', '', '']);
  const [otpEnviando, setOtpEnviando] = useState(false);
  const [otpVerificando, setOtpVerificando] = useState(false);
  const [otpCanal, setOtpCanal] = useState('');
  const [otpDestino, setOtpDestino] = useState('');
  const [otpExpiraEm, setOtpExpiraEm] = useState(null);
  const [otpErro, setOtpErro] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [otpJaEnviado, setOtpJaEnviado] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(null);
  const inputRefs = useRef([]);

  // Integridade
  const [integridadeResultado, setIntegridadeResultado] = useState(null);
  const [verificandoIntegridade, setVerificandoIntegridade] = useState(false);

  useEffect(() => {
    authFetch(`/client/contratos/${token}`)
      .then(r => r.json())
      .then(json => {
        const data = json.data || json;
        setContrato(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Timer de expiração do OTP (atualiza a cada segundo)
  useEffect(() => {
    if (!otpExpiraEm) { setTempoRestante(null); return; }
    const calcular = () => {
      const diff = Math.max(0, Math.round((new Date(otpExpiraEm) - new Date()) / 1000));
      setTempoRestante(diff);
      if (diff <= 0) setOtpErro('Código expirado. Solicite um novo.');
    };
    calcular();
    const timer = setInterval(calcular, 1000);
    return () => clearInterval(timer);
  }, [otpExpiraEm]);

  // Solicitar OTP
  const handleSolicitarOTP = async (canal = 'whatsapp') => {
    if (!nomeDigitado.trim()) { alert('Digite seu nome completo para assinar'); return; }
    if (!aceiteTermos) { alert('Aceite os termos para continuar'); return; }

    setOtpEnviando(true);
    setOtpErro('');
    try {
      const res = await fetch(`${API}/public/assinatura/contrato/${token}/solicitar-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canal }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setOtpCanal(json.data.canal || canal);
        setOtpDestino(json.data.destino || '');
        setOtpExpiraEm(json.data.expiraEm || null);
        setCountdown(60);
        setOtpJaEnviado(true);
        setStep('otp');
        setOtpCodigo(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        setOtpErro(json.message || 'Erro ao enviar código');
      }
    } catch (err) {
      setOtpErro('Erro ao solicitar código: ' + err.message);
    }
    setOtpEnviando(false);
  };

  // Reenviar OTP
  const handleReenviar = async () => {
    if (countdown > 0) return;
    setOtpCodigo(['', '', '', '', '', '']);
    setOtpErro('');
    await handleSolicitarOTP(otpCanal || 'whatsapp');
  };

  // Verificar OTP — recebe código como argumento para evitar closure desatualizada
  const handleVerificarOTP = useCallback(async (codigoArray) => {
    const codigo = (codigoArray || otpCodigo).join('');
    if (codigo.length !== 6) { setOtpErro('Digite o código completo de 6 dígitos'); return; }

    setOtpVerificando(true);
    setOtpErro('');
    try {
      const res = await fetch(`${API}/public/assinatura/contrato/${token}/verificar-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, nome_digitado: nomeDigitado, aceite_termos: aceiteTermos }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setStep('sucesso');
      } else {
        setOtpErro(json.message || 'Código inválido');
        setOtpCodigo(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch (err) {
      setOtpErro('Erro ao verificar código: ' + err.message);
    }
    setOtpVerificando(false);
  }, [otpCodigo, token, nomeDigitado, aceiteTermos]);

  // OTP input handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCodigo = [...otpCodigo];
    newCodigo[index] = value.slice(-1);
    setOtpCodigo(newCodigo);
    setOtpErro('');

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (value && index === 5 && newCodigo.every(d => d !== '')) {
      setTimeout(() => handleVerificarOTP(newCodigo), 100);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCodigo[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newCodigo = pasted.split('');
      setOtpCodigo(newCodigo);
      inputRefs.current[5]?.focus();
      setTimeout(() => handleVerificarOTP(newCodigo), 100);
    }
  };

  // Verificar integridade
  const verificarIntegridade = async () => {
    setVerificandoIntegridade(true);
    try {
      const res = await fetch(`${API}/public/assinatura/contrato/${token}/verificar-integridade`);
      const json = await res.json();
      if (json.success) {
        setIntegridadeResultado(json.data);
      } else {
        setIntegridadeResultado({ integridadeOk: false, mensagem: json.message || 'Erro ao verificar' });
      }
    } catch (err) {
      setIntegridadeResultado({ integridadeOk: false, mensagem: 'Erro de conexão ao verificar integridade.' });
    } finally {
      setVerificandoIntegridade(false);
    }
  };

  // Voltar do step OTP — mantém estado do OTP se já foi enviado
  const handleVoltar = () => {
    if (step === 'otp') {
      setStep('form');
    } else {
      navigate('/cliente/contratos');
    }
  };

  // Formatação do tempo restante
  const formatarTempo = (segundos) => {
    if (segundos === null) return '';
    if (segundos <= 0) return 'Expirado';
    const min = Math.floor(segundos / 60);
    const sec = segundos % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;
  if (!contrato) return <div className="text-center py-20 text-gray-400">Contrato não encontrado</div>;

  // Success screen
  if (step === 'sucesso') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-green-100">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Contrato Assinado!</h2>
        <p className="text-gray-500 mb-2">Sua assinatura eletrônica avançada foi registrada com sucesso.</p>
        <p className="text-xs text-gray-400 mb-6">Validade jurídica conforme Lei 14.063/2020 e MP 2.200-2/2001.</p>
        <button onClick={() => navigate('/cliente/contratos')} style={{ background: ACCENT }}
          className="px-6 py-2.5 text-white rounded-lg font-medium hover:opacity-90">
          Voltar aos Contratos
        </button>
      </div>
    );
  }

  const podeAssinar = contrato.status === 'enviado' || contrato.status === 'pendente_assinatura';

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={handleVoltar} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <FileSignature size={22} style={{ color: ACCENT }} />
          <h1 className="text-xl font-bold text-gray-900">Contrato {contrato.numero_contrato || ''}</h1>
        </div>
        {contrato.status === 'assinado' && (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">Assinado</span>
        )}
      </div>

      {/* Conteúdo do contrato — visível em 'form' e quando assinado */}
      {step === 'form' && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="prose prose-sm max-w-none" style={{ lineHeight: '1.8' }}
            dangerouslySetInnerHTML={{ __html: contrato.conteudo_html || '<p>Conteúdo não disponível</p>' }} />
        </div>
      )}

      {/* Assinatura do contratado */}
      {step === 'form' && contrato.assinatura_contratado && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={18} className="text-green-600" />
            <p className="font-semibold text-green-800">Assinado pelo Contratado</p>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500 text-xs">Assinado por</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{contrato.assinatura_contratado.nome || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Data/Hora</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{contrato.assinado_contratado_em ? new Date(contrato.assinado_contratado_em).toLocaleString('pt-BR') : '—'}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Assinatura do contratante (já assinado) */}
      {step === 'form' && contrato.status === 'assinado' && (contrato.aceite || contrato.assinado_em) && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={18} className="text-green-600" />
            <p className="font-semibold text-green-800">Assinado pelo Contratante</p>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500 text-xs">Assinado por</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{
                contrato.aceite?.nome ||
                contrato.log_auditoria?.signatario?.nomeCompleto ||
                contrato.selo_assinatura?.signatario || '—'
              }</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Data/Hora</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{
                (contrato.aceite?.data || contrato.assinado_em)
                  ? new Date(contrato.aceite?.data || contrato.assinado_em).toLocaleString('pt-BR')
                  : '—'
              }</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Selo de Assinatura Eletrônica */}
      {step === 'form' && contrato.status === 'assinado' && (contrato.selo_assinatura || contrato.hash_documento) && (
        <div className="mb-6">
          <SeloAssinatura
            selo={contrato.selo_assinatura}
            assinadoEm={contrato.assinado_em}
            hashDocumento={contrato.hash_documento}
            logAuditoria={contrato.log_auditoria}
            metodo={contrato.assinatura_metodo}
            onVerificarIntegridade={verificarIntegridade}
            verificandoIntegridade={verificandoIntegridade}
            integridadeResultado={integridadeResultado}
          />
        </div>
      )}

      {/* Step 1: Form - nome + aceite → solicitar OTP */}
      {step === 'form' && podeAssinar && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileSignature size={18} style={{ color: ACCENT }} /> Assinar Contrato
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Digite seu nome completo *</label>
              <input type="text" value={nomeDigitado} onChange={e => setNomeDigitado(e.target.value)}
                placeholder="Seu nome completo como assinatura"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" />
            </div>

            <div className="flex items-start gap-2">
              <input type="checkbox" id="aceite" checked={aceiteTermos} onChange={e => setAceiteTermos(e.target.checked)}
                className="mt-1 rounded border-gray-300" />
              <label htmlFor="aceite" className="text-sm text-gray-700">
                Li e concordo com todos os termos e condições descritos neste contrato.
              </label>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <ShieldCheck size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-800">
                Para sua segurança, enviaremos um código de verificação (OTP) para confirmar sua identidade.
                A assinatura tem validade jurídica conforme Lei 14.063/2020 e MP 2.200-2/2001.
              </p>
            </div>

            {otpErro && step === 'form' && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={16} className="text-red-600 shrink-0" />
                <p className="text-xs text-red-700">{otpErro}</p>
              </div>
            )}

            <button
              onClick={() => {
                // Se já enviou OTP e ainda está válido, volta para o step OTP sem re-enviar
                if (otpJaEnviado && tempoRestante && tempoRestante > 0) {
                  setStep('otp');
                  setTimeout(() => inputRefs.current[0]?.focus(), 100);
                } else {
                  handleSolicitarOTP('whatsapp');
                }
              }}
              disabled={otpEnviando || !nomeDigitado.trim() || !aceiteTermos}
              style={{ background: ACCENT }}
              className="w-full py-3.5 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              {otpEnviando ? (
                <><RefreshCw size={16} className="animate-spin" /> Enviando código...</>
              ) : otpJaEnviado && tempoRestante > 0 ? (
                <><ShieldCheck size={16} /> Continuar Verificação OTP</>
              ) : (
                <><ShieldCheck size={16} /> Assinar com Verificação OTP</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: OTP verification */}
      {step === 'otp' && (
        <div className="bg-white rounded-xl border p-6">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: `${ACCENT}15` }}>
              <ShieldCheck size={28} style={{ color: ACCENT }} />
            </div>
            <h2 className="font-bold text-lg text-gray-900 mb-1">Verificação de Identidade</h2>
            <p className="text-sm text-gray-500">
              Enviamos um código de 6 dígitos via <strong className="capitalize">{otpCanal}</strong>
              {otpDestino && <> para <strong>{otpDestino}</strong></>}.
            </p>
          </div>

          {/* OTP Input — responsivo para mobile */}
          <div className="flex justify-center gap-1.5 sm:gap-2 mb-4" onPaste={handleOtpPaste}>
            {otpCodigo.map((digit, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold border-2 rounded-lg outline-none transition-colors ${
                  digit ? 'border-orange-400 bg-orange-50' : 'border-gray-300'
                } focus:border-orange-500 focus:ring-2 focus:ring-orange-200`}
              />
            ))}
          </div>

          {/* Error */}
          {otpErro && (
            <div className="flex items-center justify-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={16} className="text-red-600 shrink-0" />
              <p className="text-xs text-red-700">{otpErro}</p>
            </div>
          )}

          {/* Verify button */}
          <button onClick={() => handleVerificarOTP(otpCodigo)}
            disabled={otpVerificando || otpCodigo.join('').length !== 6}
            style={{ background: ACCENT }}
            className="w-full py-3.5 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 mb-4">
            {otpVerificando ? (
              <><RefreshCw size={16} className="animate-spin" /> Verificando...</>
            ) : (
              <><ShieldCheck size={16} /> Confirmar e Assinar</>
            )}
          </button>

          {/* Timer + Resend */}
          <div className="text-center space-y-2">
            {tempoRestante !== null && tempoRestante > 0 && (
              <p className="text-xs text-gray-500">
                Código expira em <span className="font-mono font-medium">{formatarTempo(tempoRestante)}</span>
              </p>
            )}
            {tempoRestante !== null && tempoRestante <= 0 && (
              <p className="text-xs text-red-500 font-medium">Código expirado</p>
            )}
            <button
              onClick={handleReenviar}
              disabled={countdown > 0}
              className="text-sm font-medium hover:underline disabled:opacity-50 disabled:no-underline"
              style={{ color: countdown > 0 ? '#9CA3AF' : ACCENT }}>
              {countdown > 0 ? `Reenviar código em ${countdown}s` : 'Reenviar código'}
            </button>
          </div>
        </div>
      )}

      {/* Already signed fallback */}
      {step === 'form' && contrato.status === 'assinado' && !contrato.aceite && !contrato.log_auditoria && !contrato.selo_assinatura && contrato.assinado_em && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <CheckCircle size={24} className="text-green-600 mx-auto mb-2" />
          <p className="font-semibold text-green-800">Contrato assinado em {new Date(contrato.assinado_em).toLocaleString('pt-BR')}</p>
        </div>
      )}
    </div>
  );
}
