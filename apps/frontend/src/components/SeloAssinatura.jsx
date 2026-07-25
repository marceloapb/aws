import React, { useState } from 'react';
import { ShieldCheck, ExternalLink, Loader2, CheckCircle2, XCircle } from 'lucide-react';

/**
 * Componente visual do Selo de Assinatura Eletrônica
 * Exibe informações da assinatura, hash, código de verificação e botão de integridade.
 */
export default function SeloAssinatura({
  selo,
  assinadoEm,
  hashDocumento,
  logAuditoria,
  metodo,
  onVerificarIntegridade,
  integridadeResultado,
  verificandoIntegridade,
}) {
  // Extrair dados de múltiplas fontes
  const signatario = selo?.signatario || logAuditoria?.signatario?.nomeCompleto || '—';
  const cpfRaw = selo?.cpf || logAuditoria?.signatario?.cpf || '';
  const cpfMask = mascararCPF(cpfRaw);
  const dataAssinatura = selo?.data || assinadoEm;
  const ip = selo?.ip || logAuditoria?.enderecoIP || '—';
  const canal = selo?.autenticacao || logAuditoria?.autenticacao?.canal || 'WhatsApp';
  const autenticacao = typeof canal === 'string' && canal.startsWith('OTP') ? canal : `OTP via ${canal}`;
  const codigoVerificacao = selo?.codigo_verificacao || '';
  const hash = hashDocumento || selo?.hash || '';
  const metodoLabel = metodo === 'assinatura_eletronica_avancada'
    ? 'Assinatura Eletrônica Avançada'
    : metodo || 'Assinatura Eletrônica';

  return (
    <div className="border-2 border-green-700 rounded-xl p-5 bg-green-50 mt-6" style={{ pageBreakInside: 'avoid' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={22} className="text-green-700" />
        <h3 className="text-sm font-bold text-green-800 uppercase tracking-wide">
          Documento Assinado Eletronicamente
        </h3>
      </div>

      {/* Dados da assinatura */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <Campo label="Signatário" value={signatario} />
        <Campo label="CPF" value={cpfMask} mono />
        <Campo label="Data/Hora" value={dataAssinatura ? new Date(dataAssinatura).toLocaleString('pt-BR') : '—'} />
        <Campo label="IP" value={ip} mono />
        <Campo label="Autenticação" value={autenticacao} />
        <Campo label="Método" value={metodoLabel} />
      </div>

      {/* Código de verificação */}
      {codigoVerificacao && (
        <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Código de verificação</p>
              <p className="font-mono text-sm font-bold text-green-800">{codigoVerificacao}</p>
            </div>
            <a
              href={`/verificar/${codigoVerificacao}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium"
            >
              Verificar online <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}

      {/* Hash do documento */}
      {hash && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
          <p className="text-xs text-gray-500 mb-1">Hash SHA-256 do documento</p>
          <p
            className="font-mono text-[11px] text-gray-700 break-all leading-relaxed"
            title={hash}
          >
            {hash}
          </p>
        </div>
      )}

      {/* Botão verificar integridade */}
      {onVerificarIntegridade && (
        <div className="mt-4">
          <button
            onClick={onVerificarIntegridade}
            disabled={verificandoIntegridade}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-green-300 text-green-800 bg-white hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verificandoIntegridade ? (
              <><Loader2 size={14} className="animate-spin" /> Verificando...</>
            ) : (
              <><ShieldCheck size={14} /> Verificar Integridade do Documento</>
            )}
          </button>
        </div>
      )}

      {/* Resultado da verificação de integridade */}
      {integridadeResultado && (
        <div className={`mt-3 p-3 rounded-lg border ${
          integridadeResultado.integridadeOk
            ? 'bg-green-100 border-green-300'
            : 'bg-red-50 border-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {integridadeResultado.integridadeOk ? (
              <CheckCircle2 size={16} className="text-green-700" />
            ) : (
              <XCircle size={16} className="text-red-700" />
            )}
            <p className={`text-sm font-medium ${
              integridadeResultado.integridadeOk ? 'text-green-800' : 'text-red-800'
            }`}>
              {integridadeResultado.mensagem}
            </p>
          </div>
        </div>
      )}

      {/* Footer legal */}
      <div className="mt-4 pt-3 border-t border-green-200">
        <p className="text-[10px] text-gray-500 leading-relaxed">
          Validade jurídica conforme Art. 107 do Código Civil, MP 2.200-2/2001 e Lei 14.063/2020.
          {codigoVerificacao && (
            <> Verifique a autenticidade em: <span className="font-mono">/verificar/{codigoVerificacao}</span></>
          )}
        </p>
      </div>
    </div>
  );
}

/** Campo individual do selo */
function Campo({ label, value, mono }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm text-gray-900 font-medium ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );
}

/** Mascara CPF: 123.456.789-00 → ***.456.789-** */
function mascararCPF(cpf) {
  if (!cpf) return '***.***.***-**';
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length < 11) return '***.***.***-**';
  return `***.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-**`;
}
