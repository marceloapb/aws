import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import OTPInput from '../../components/OTPInput';
import OTPTimer from '../../components/OTPTimer';

const API = process.env.REACT_APP_API_URL || 'https://setvwal0cd.execute-api.us-east-1.amazonaws.com/prod';

/**
 * SIG-07: Página pública de assinatura de contrato com OTP mobile-first
 * Fluxo: Visualizar → Ler → Solicitar OTP → Verificar → Assinado
 */
export default function ContratoAssinar() {
  const { token } = useParams();

  // Estado principal
  const [contrato, setContrato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  // Estado do fluxo
  const [passo, setPasso] = useState('leitura'); // leitura | otp | assinado
  const [scrollCompleto, setScrollCompleto] = useState(false);

  // Estado OTP
  const [otpEnviado, setOtpEnviado] = useState(false);
  const [otpInfo, setOtpInfo] = useState(null);
  const [otpErro, setOtpErro] = useState(null);
  const [verificando, setVerificando] = useState(false);
  const [enviandoOtp, setEnviandoOtp] = useState(false);
  const [canais, setCanais] = useState([]);
  const [canalSelecionado, setCanalSelecionado] = useState('whatsapp');
  const [clearOtp, setClearOtp] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  // Resultado
  const [resultado, setResultado] = useState(null);

  // Ref para scroll
  const contratoRef = useRef(null);

  // Carregar contrato
  useEffect(() => {
    async function carregarContrato() {
      try {
        const res = await fetch(`${API}/public/assinatura/contrato/${token}`);
        const data = await res.json();
        if (data.success) {
          setContrato(data.data);
          if (data.data.status === 'assinado') {
            setPasso('assinado');
            setResultado({ assinadoEm: data.data.assinado_em });
          }
        } else {
          setErro(data.message || 'Contrato não encontrado.');
        }
      } catch {
        setErro('Erro ao carregar contrato. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }
    carregarContrato();
  }, [token]);

  // Carregar canais disponíveis
  useEffect(() => {
    if (!contrato || contrato.status === 'assinado') return;
    fetch(`${API}/public/assinatura/contrato/${token}/canais-otp`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.canais) {
          setCanais(data.data.canais);
        }
      })
      .catch(() => {});
  }, [contrato, token]);

  // Detectar scroll completo
  useEffect(() => {
    const el = contratoRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setScrollCompleto(true);
        // Registrar evento de leitura completa
        registrarEvento('contrato.leitura_completa');
      }
    };

    el.addEventListener('scroll', handleScroll);
    // Caso conteúdo caiba sem scroll
    if (el.scrollHeight <= el.clientHeight + 20) {
      setScrollCompleto(true);
    }
    return () => el.removeEventListener('scroll', handleScroll);
  }, [contrato]);

  // Cooldown para reenvio
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Registrar evento de auditoria (fire-and-forget)
  const registrarEvento = useCallback((evento, detalhes = {}) => {
    fetch(`${API}/public/assinatura/contrato/${token}/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento, detalhes }),
    }).catch(() => {});
  }, [token]);

  // Enviar OTP
  const enviarOTP = async (canal) => {
    setEnviandoOtp(true);
    setOtpErro(null);
    try {
      const res = await fetch(`${API}/public/assinatura/contrato/${token}/solicitar-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canal: canal || canalSelecionado }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpInfo(data.data);
        setOtpEnviado(true);
        setCooldown(60);
        setClearOtp(c => c + 1);
      } else {
        setOtpErro(data.message || 'Erro ao enviar código.');
      }
    } catch {
      setOtpErro('Erro de conexão. Tente novamente.');
    } finally {
      setEnviandoOtp(false);
    }
  };

  // Verificar OTP
  const verificarCodigo = async (codigo) => {
    setVerificando(true);
    setOtpErro(null);
    try {
      const res = await fetch(`${API}/public/assinatura/contrato/${token}/verificar-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResultado(data.data);
        setPasso('assinado');
      } else {
        setOtpErro(data.message || 'Código inválido.');
        setClearOtp(c => c + 1);
      }
    } catch {
      setOtpErro('Erro de conexão. Tente novamente.');
    } finally {
      setVerificando(false);
    }
  };

  // === RENDER ===

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-600"></div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">&#x26A0;&#xFE0F;</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Contrato não disponível</h1>
          <p className="text-gray-600">{erro}</p>
        </div>
      </div>
    );
  }

  if (passo === 'assinado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">&#x2705;</div>
          <h1 className="text-2xl font-bold text-green-700 mb-2">Contrato Assinado!</h1>
          <p className="text-gray-600 mb-4">
            {resultado?.mensagem || 'Seu contrato foi assinado com sucesso.'}
          </p>
          {resultado?.assinadoEm && (
            <p className="text-sm text-gray-500">
              Assinado em: {new Date(resultado.assinadoEm).toLocaleString('pt-BR')}
            </p>
          )}
          {resultado?.hashDocumento && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-mono break-all">
                Hash: {resultado.hashDocumento.slice(0, 32)}...
              </p>
            </div>
          )}
          <p className="mt-6 text-sm text-gray-500">
            Você receberá uma cópia por e-mail/WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">Contrato</h1>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            passo === 'leitura' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {passo === 'leitura' ? 'Leitura' : 'Verificação'}
          </span>
        </div>
      </header>

      {/* Conteúdo do contrato */}
      {passo === 'leitura' && (
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full p-4">
          <div
            ref={contratoRef}
            className="flex-1 bg-white rounded-xl shadow-sm border overflow-y-auto p-6 mb-4"
            style={{ maxHeight: '60vh' }}
            dangerouslySetInnerHTML={{ __html: contrato?.conteudo_html || '' }}
          />

          {!scrollCompleto && (
            <p className="text-center text-sm text-gray-500 mb-3 animate-pulse">
              &#x2B07;&#xFE0F; Role até o final para prosseguir
            </p>
          )}

          <button
            onClick={() => {
              setPasso('otp');
              registrarEvento('contrato.identidade_informada');
            }}
            disabled={!scrollCompleto}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              scrollCompleto
                ? 'bg-orange-600 text-white hover:bg-orange-700 active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Prosseguir para Assinatura
          </button>
        </div>
      )}

      {/* Passo OTP */}
      {passo === 'otp' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full p-4">
          {!otpEnviado ? (
            <div className="bg-white rounded-xl shadow-lg p-6 w-full">
              <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
                Verificação de Identidade
              </h2>
              <p className="text-gray-600 text-center text-sm mb-6">
                Para assinar, precisamos confirmar sua identidade com um código de verificação.
              </p>

              {/* Seleção de canal */}
              {canais.length > 0 && (
                <div className="space-y-2 mb-6">
                  <p className="text-sm font-medium text-gray-700">Enviar código por:</p>
                  {canais.map(canal => (
                    <label
                      key={canal.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        canalSelecionado === canal.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="canal"
                        value={canal.id}
                        checked={canalSelecionado === canal.id}
                        onChange={() => setCanalSelecionado(canal.id)}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      <div>
                        <span className="font-medium text-gray-800">{canal.nome}</span>
                        <span className="ml-2 text-sm text-gray-500">({canal.destino_parcial})</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <button
                onClick={() => enviarOTP()}
                disabled={enviandoOtp}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {enviandoOtp ? 'Enviando...' : 'Enviar código'}
              </button>

              {otpErro && (
                <p className="mt-3 text-red-600 text-sm text-center" role="alert">{otpErro}</p>
              )}

              <button
                onClick={() => setPasso('leitura')}
                className="w-full mt-3 py-2 text-gray-500 text-sm hover:text-gray-700"
              >
                &#x2190; Voltar ao contrato
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-6 w-full">
              <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
                Digite o código
              </h2>
              <p className="text-gray-600 text-center text-sm mb-6">
                Enviamos um código para seu{' '}
                <span className="font-medium">{otpInfo?.canal || 'WhatsApp'}</span>
                <br />
                <span className="font-mono text-gray-800">{otpInfo?.destino || ''}</span>
              </p>

              <OTPInput
                onComplete={verificarCodigo}
                disabled={verificando}
                erro={otpErro}
                onClear={clearOtp}
              />

              <div className="mt-4 text-center">
                <OTPTimer
                  expiraEm={otpInfo?.expiraEm}
                  onExpirado={() => setOtpErro('Código expirado. Solicite um novo.')}
                />
              </div>

              {verificando && (
                <div className="mt-4 flex items-center justify-center gap-2 text-orange-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-orange-600"></div>
                  <span className="text-sm">Verificando...</span>
                </div>
              )}

              <div className="mt-6 flex items-center justify-center gap-4 text-sm">
                <button
                  onClick={() => enviarOTP(canalSelecionado)}
                  disabled={cooldown > 0 || enviandoOtp}
                  className="text-orange-600 font-medium hover:underline disabled:text-gray-400 disabled:no-underline"
                >
                  {cooldown > 0 ? `Reenviar (${cooldown}s)` : 'Reenviar código'}
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => { setOtpEnviado(false); setOtpErro(null); }}
                  className="text-orange-600 font-medium hover:underline"
                >
                  Outro canal
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
