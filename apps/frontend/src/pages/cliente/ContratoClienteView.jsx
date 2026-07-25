import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, FileSignature, CheckCircle, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react';

const ACCENT = '#EA580C';

// Steps: 'form' -> 'otp' -> 'sucesso'
export default function ContratoClienteView() {
  const { token } = useParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [contrato, setContrato] = useState(null);
  const [loading, setLoading] = useState(true);

  // Step management
  const [step, setStep] = useState('form'); // 'form' | 'otp' | 'sucesso'

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
  const inputRefs = useRef([]);

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

  // Step 1: Solicitar OTP
  const handleSolicitarOTP = async (canal = 'whatsapp') => {
    if (!nomeDigitado.trim()) { alert('Digite seu nome completo para assinar'); return; }
    if (!aceiteTermos) { alert('Aceite os termos para continuar'); return; }

    setOtpEnviando(true);
    setOtpErro('');
    try {
      const res = await authFetch(`/public/assinatura/contrato/${token}/solicitar-otp`, {
        method: 'POST',
        body: JSON.stringify({ canal }),
      });
      const json = await res.json();
      if (json.success) {
        setOtpCanal(json.data.canal || canal);
        setOtpDestino(json.data.destino || '');
        setOtpExpiraEm(json.data.expiraEm || null);
        setCountdown(60); // 60s cooldown
        setStep('otp');
        // Focus first OTP input
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

  // Step 2: Verificar OTP
  const handleVerificarOTP = async () => {
    const codigo = otpCodigo.join('');
    if (codigo.length !== 6) { setOtpErro('Digite o código completo de 6 dígitos'); return; }

    setOtpVerificando(true);
    setOtpErro('');
    try {
      const res = await authFetch(`/public/assinatura/contrato/${token}/verificar-otp`, {
        method: 'POST',
        body: JSON.stringify({ codigo }),
      });
      const json = await res.json();
      if (json.success) {
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
  };

  // OTP input handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only digits
    const newCodigo = [...otpCodigo];
    newCodigo[index] = value.slice(-1); // Only last digit
    setOtpCodigo(newCodigo);
    setOtpErro('');

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (value && index === 5 && newCodigo.every(d => d !== '')) {
      setTimeout(() => handleVerificarOTP(), 150);
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
      setOtpCodigo(pasted.split(''));
      inputRefs.current[5]?.focus();
      setTimeout(() => handleVerificarOTP(), 150);
    }
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
        <p className="text-gray-500 mb-2">Sua assinatura eletronica avancada foi registrada com sucesso.</p>
        <p className="text-xs text-gray-400 mb-6">Validade juridica conforme Lei 14.063/2020 e MP 2.200-2/2001.</p>
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
        <button onClick={() => { if (step === 'otp') setStep('form'); else navigate('/cliente/contratos'); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
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

      {/* Conteudo do contrato */}
      {step === 'form' && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="prose prose-sm max-w-none" style={{ lineHeight: '1.8' }}
            dangerouslySetInnerHTML={{ __html: contrato.conteudo_html || '<p>Conteudo nao disponivel</p>' }} />
        </div>
      )}

      {/* Assinatura do contratado (se ja assinou) */}
      {step === 'form' && contrato.assinatura_contratado && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={18} className="text-green-600" />
            <p className="font-semibold text-green-800">Assinado pelo Contratado</p>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500 text-xs">Assinado por</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{contrato.assinatura_contratado.nome || '\u2014'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Data/Hora</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{contrato.assinado_contratado_em ? new Date(contrato.assinado_contratado_em).toLocaleString('pt-BR') : '\u2014'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">IP</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{contrato.assinatura_contratado.ip || '\u2014'}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Assinatura do contratante/cliente (se ja assinou) */}
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
                contrato.selo_assinatura?.signatario || '\u2014'
              }</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Data/Hora</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{
                (contrato.aceite?.data || contrato.assinado_em)
                  ? new Date(contrato.aceite?.data || contrato.assinado_em).toLocaleString('pt-BR')
                  : '\u2014'
              }</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">IP</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{
                contrato.aceite?.ip ||
                contrato.log_auditoria?.enderecoIP ||
                contrato.ip_assinatura || '\u2014'
              }</dd>
            </div>
            {contrato.selo_assinatura?.codigo_verificacao && (
              <div>
                <dt className="text-gray-500 text-xs">Codigo de verificacao</dt>
                <dd className="font-medium text-gray-900 mt-0.5 font-mono text-xs">{contrato.selo_assinatura.codigo_verificacao}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Step 1: Form - nome + aceite + solicitar OTP */}
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
                Li e concordo com todos os termos e condicoes descritos neste contrato.
              </label>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <ShieldCheck size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-800">
                Para sua seguranca, enviaremos um codigo de verificacao (OTP) para confirmar sua identidade antes de assinar.
                A assinatura tem validade juridica conforme Lei 14.063/2020 e MP 2.200-2/2001.
              </p>
            </div>

            {otpErro && step === 'form' && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={16} className="text-red-600 shrink-0" />
                <p className="text-xs text-red-700">{otpErro}</p>
              </div>
            )}

            <button onClick={() => handleSolicitarOTP('whatsapp')} disabled={otpEnviando || !nomeDigitado.trim() || !aceiteTermos}
              style={{ background: ACCENT }}
              className="w-full py-3.5 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              {otpEnviando ? (
                <><RefreshCw size={16} className="animate-spin" /> Enviando codigo...</>
              ) : (
                <><ShieldCheck size={16} /> Assinar com Verificacao OTP</>
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
            <h2 className="font-bold text-lg text-gray-900 mb-1">Verificacao de Identidade</h2>
            <p className="text-sm text-gray-500">
              Enviamos um codigo de 6 digitos via <strong className="capitalize">{otpCanal}</strong>
              {otpDestino && <> para <strong>{otpDestino}</strong></>}.
            </p>
          </div>

          {/* OTP Input */}
          <div className="flex justify-center gap-2 mb-4" onPaste={handleOtpPaste}>
            {otpCodigo.map((digit, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-lg outline-none transition-colors ${
                  digit ? 'border-orange-400 bg-orange-50' : 'border-gray-300'
                } focus:border-orange-500 focus:ring-2 focus:ring-orange-200`}
              />
            ))}
          </div>

          {/* Error message */}
          {otpErro && (
            <div className="flex items-center justify-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={16} className="text-red-600 shrink-0" />
              <p className="text-xs text-red-700">{otpErro}</p>
            </div>
          )}

          {/* Verify button */}
          <button onClick={handleVerificarOTP}
            disabled={otpVerificando || otpCodigo.join('').length !== 6}
            style={{ background: ACCENT }}
            className="w-full py-3.5 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 mb-4">
            {otpVerificando ? (
              <><RefreshCw size={16} className="animate-spin" /> Verificando...</>
            ) : (
              <><ShieldCheck size={16} /> Confirmar e Assinar</>
            )}
          </button>

          {/* Resend + info */}
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-400">
              O codigo expira em {otpExpiraEm ? Math.max(0, Math.round((new Date(otpExpiraEm) - new Date()) / 60000)) : 10} minutos.
            </p>
            <button
              onClick={handleReenviar}
              disabled={countdown > 0}
              className="text-sm font-medium hover:underline disabled:opacity-50 disabled:no-underline"
              style={{ color: countdown > 0 ? '#9CA3AF' : ACCENT }}>
              {countdown > 0 ? `Reenviar codigo em ${countdown}s` : 'Reenviar codigo'}
            </button>
          </div>
        </div>
      )}

      {/* Already signed fallback */}
      {step === 'form' && contrato.status === 'assinado' && !contrato.aceite && !contrato.log_auditoria && contrato.assinado_em && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <CheckCircle size={24} className="text-green-600 mx-auto mb-2" />
          <p className="font-semibold text-green-800">Contrato assinado em {new Date(contrato.assinado_em).toLocaleString('pt-BR')}</p>
        </div>
      )}
    </div>
  );
}
