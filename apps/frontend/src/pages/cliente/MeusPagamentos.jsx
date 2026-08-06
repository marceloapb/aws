import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CreditCard, AlertTriangle, Copy, Check, QrCode, FileText, X, Clock } from 'lucide-react';

const ACCENT = '#EA580C';

export default function MeusPagamentos() {
  const { authFetch } = useAuth();
  const [parcelas, setParcelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedParcela, setSelectedParcela] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    authFetch('/client/pagamentos')
      .then(r => r.json())
      .then(d => setParcelas(Array.isArray(d) ? d : d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyPix = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;
  }

  const total = parcelas.reduce((s, p) => s + Number(p.valor || 0), 0);
  const pago = parcelas.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor || 0), 0);
  const restante = total - pago;
  const pctPago = total > 0 ? Math.round((pago / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <CreditCard size={24} style={{ color: ACCENT }} />
        <h1 className="text-2xl font-bold text-gray-900">Meus Pagamentos</h1>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-lg font-bold text-gray-900">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Pago</p>
            <p className="text-lg font-bold text-green-600">R$ {pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Restante</p>
            <p className="text-lg font-bold" style={{ color: ACCENT }}>R$ {restante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pctPago}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-right">{pctPago}% pago</p>
      </div>

      {/* Installments */}
      {parcelas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          Nenhum pagamento registrado.
        </div>
      ) : (
        <div className="space-y-3">
          {parcelas.map((p, i) => {
            const isOverdue = (p.status === 'em_aberto' || p.status === 'pendente') && new Date(p.vencimento) < new Date();
            const isPaid = p.status === 'pago';
            const hasPix = p.pix_copia_cola || p.pix_qr_code;
            const hasBoleto = p.boleto_url;
            const hasLink = p.link_pagamento;

            return (
              <div key={p.id || i} className={`bg-white rounded-xl border overflow-hidden ${
                isOverdue ? 'border-red-300' : isPaid ? 'border-green-200' : 'border-gray-200'
              }`}>
                {/* Parcela header */}
                <div className={`p-4 flex items-center justify-between ${isOverdue ? 'bg-red-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    {isOverdue && <AlertTriangle size={16} className="text-red-500 shrink-0" />}
                    {isPaid && <Check size={16} className="text-green-500 shrink-0" />}
                    {!isOverdue && !isPaid && <Clock size={16} className="text-gray-400 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {p.parcela || `Parcela ${i + 1}`}
                        {p.evento_nome && <span className="text-gray-400 font-normal"> — {p.evento_nome}</span>}
                      </p>
                      <p className="text-xs text-gray-500">
                        Vencimento: {new Date(p.vencimento + 'T12:00').toLocaleDateString('pt-BR')}
                        {isOverdue && <span className="text-red-500 font-medium ml-1">• Vencida</span>}
                        {isPaid && p.data_pagamento && <span className="text-green-600 font-medium ml-1">• Pago em {new Date(p.data_pagamento).toLocaleDateString('pt-BR')}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">
                      R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {isPaid ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">✓ Pago</span>
                    ) : (hasPix || hasBoleto || hasLink) ? (
                      <button
                        onClick={() => setSelectedParcela(selectedParcela?.id === p.id ? null : p)}
                        className="px-3 py-1.5 text-white rounded-lg text-xs font-medium hover:opacity-90"
                        style={{ background: ACCENT }}
                      >
                        {selectedParcela?.id === p.id ? 'Fechar' : 'Pagar'}
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">Aguardando</span>
                    )}
                  </div>
                </div>

                {/* Payment options - expandable */}
                {selectedParcela?.id === p.id && !isPaid && (
                  <div className="border-t p-5 bg-gray-50">
                    <div className="grid grid-cols-1 gap-4">
                      {/* PIX */}
                      {hasPix && (
                        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                          <div className="flex items-center justify-center gap-2 mb-3">
                            <QrCode size={18} style={{ color: ACCENT }} />
                            <h3 className="font-semibold text-gray-900">Pagar com PIX</h3>
                          </div>

                          {/* QR Code */}
                          {p.pix_qr_code && (
                            <div className="flex justify-center mb-4">
                              <img
                                src={`data:image/png;base64,${p.pix_qr_code}`}
                                alt="QR Code PIX"
                                className="w-48 h-48 border rounded-lg"
                              />
                            </div>
                          )}

                          {/* Copia e cola */}
                          {p.pix_copia_cola && (
                            <div className="space-y-2">
                              <p className="text-xs text-gray-500">Ou copie o código abaixo:</p>
                              <div className="flex items-center gap-2 bg-gray-50 border rounded-lg p-2">
                                <code className="flex-1 text-xs text-gray-600 break-all line-clamp-2">{p.pix_copia_cola}</code>
                                <button
                                  onClick={() => copyPix(p.pix_copia_cola)}
                                  className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-white"
                                  style={{ background: copied ? '#16a34a' : ACCENT }}
                                >
                                  {copied ? <><Check size={12} /> Copiado!</> : <><Copy size={12} /> Copiar</>}
                                </button>
                              </div>
                              <p className="text-[10px] text-gray-400">Abra o app do seu banco → PIX → Copia e Cola → Cole o código</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Boleto */}
                      {hasBoleto && (
                        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                          <div className="flex items-center justify-center gap-2 mb-3">
                            <FileText size={18} style={{ color: ACCENT }} />
                            <h3 className="font-semibold text-gray-900">Pagar com Boleto</h3>
                          </div>
                          <a
                            href={p.boleto_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white"
                            style={{ background: ACCENT }}
                          >
                            <FileText size={16} /> Abrir Boleto
                          </a>
                          <p className="text-[10px] text-gray-400 mt-2">O boleto será aberto em nova aba. Pode pagar em qualquer banco.</p>
                        </div>
                      )}

                      {/* Link genérico (fallback) */}
                      {!hasPix && !hasBoleto && hasLink && (
                        <div className="text-center">
                          <a
                            href={p.link_pagamento}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white"
                            style={{ background: ACCENT }}
                          >
                            <CreditCard size={16} /> Ir para Pagamento
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
