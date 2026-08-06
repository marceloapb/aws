import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CreditCard, AlertTriangle, Copy, Check, QrCode, FileText, X, Clock, Lock } from 'lucide-react';

const ACCENT = '#EA580C';

function CartaoForm({ cobrancaId, gatewayId, valor, authFetch, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '', cpf: '', cep: '', addressNumber: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const formatCardNumber = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.holderName || !form.number || !form.expiryMonth || !form.expiryYear || !form.ccv || !form.cpf) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch(`/client/pagamentos/${cobrancaId}/pagar-cartao`, {
        method: 'POST',
        body: JSON.stringify({
          creditCard: {
            holderName: form.holderName,
            number: form.number.replace(/\s/g, ''),
            expiryMonth: form.expiryMonth,
            expiryYear: form.expiryYear,
            ccv: form.ccv,
          },
          creditCardHolderInfo: {
            name: form.holderName,
            cpfCnpj: form.cpf.replace(/\D/g, ''),
            postalCode: form.cep.replace(/\D/g, '') || '00000000',
            addressNumber: form.addressNumber || '0',
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => onSuccess?.(), 2000);
      } else {
        setError(data.message || 'Pagamento recusado. Verifique os dados do cartão.');
      }
    } catch (err) {
      setError('Erro ao processar pagamento. Tente novamente.');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
        <Check size={32} className="text-green-500 mx-auto mb-2" />
        <p className="font-semibold text-green-800">Pagamento aprovado!</p>
        <p className="text-xs text-green-600 mt-1">Seu pagamento foi processado com sucesso.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <CreditCard size={18} style={{ color: ACCENT }} />
          <h3 className="font-semibold text-gray-900">Pagar com Cartão de Crédito</h3>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: ACCENT }}>
          <CreditCard size={16} /> Pagar R$ {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-green-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Pagamento Seguro — Cartão de Crédito</h3>
        </div>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Nome no cartão *</label>
          <input value={form.holderName} onChange={e => setForm({ ...form, holderName: e.target.value.toUpperCase() })} placeholder="NOME COMO NO CARTÃO" className="w-full border rounded-lg px-3 py-2 text-sm mt-1 uppercase" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Número do cartão *</label>
          <input value={formatCardNumber(form.number)} onChange={e => setForm({ ...form, number: e.target.value })} placeholder="0000 0000 0000 0000" maxLength={19} className="w-full border rounded-lg px-3 py-2 text-sm mt-1 font-mono tracking-wider" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-600">Mês *</label>
            <select value={form.expiryMonth} onChange={e => setForm({ ...form, expiryMonth: e.target.value })} className="w-full border rounded-lg px-2 py-2 text-sm mt-1">
              <option value="">MM</option>
              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Ano *</label>
            <select value={form.expiryYear} onChange={e => setForm({ ...form, expiryYear: e.target.value })} className="w-full border rounded-lg px-2 py-2 text-sm mt-1">
              <option value="">AA</option>
              {Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() + i)).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">CVV *</label>
            <input value={form.ccv} onChange={e => setForm({ ...form, ccv: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="000" maxLength={4} className="w-full border rounded-lg px-3 py-2 text-sm mt-1 font-mono text-center" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-600">CPF do titular *</label>
            <input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="000.000.000-00" maxLength={14} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">CEP</label>
            <input value={form.cep} onChange={e => setForm({ ...form, cep: e.target.value.replace(/\D/g, '').slice(0, 8) })} placeholder="00000-000" maxLength={9} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</p>}

        <button type="submit" disabled={loading} className="w-full py-3 rounded-lg text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: loading ? '#6b7280' : ACCENT }}>
          {loading ? 'Processando...' : `Pagar R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
        </button>
      </form>
    </div>
  );
}

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

                      {/* Cartão de Crédito */}
                      {p.gateway_id && (
                        <CartaoForm cobrancaId={p.id} gatewayId={p.gateway_id} valor={p.valor} authFetch={authFetch} onSuccess={() => { setSelectedParcela(null); window.location.reload(); }} />
                      )}

                      {/* Selos de segurança */}
                      <div className="border-t pt-4 mt-4">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex items-center gap-2 text-green-700">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            <span className="text-xs font-semibold">Ambiente Seguro — Dados criptografados</span>
                          </div>
                          <div className="flex items-center gap-3 opacity-60">
                            <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">VISA</span>
                            <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">MASTERCARD</span>
                            <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">ELO</span>
                            <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">PIX</span>
                          </div>
                          <p className="text-[10px] text-gray-400 text-center">Pagamento processado com segurança por <strong>Asaas</strong> — PCI-DSS Level 1</p>
                        </div>
                      </div>
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
