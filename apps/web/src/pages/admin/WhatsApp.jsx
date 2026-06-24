import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { formatarData } from '../../lib/formatters.js';
import PageHeader from '../../components/PageHeader.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function WhatsApp() {
  const [mensagens, setMensagens] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ cliente_id: '', template: 'lembrete_evento' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [msgRes, cliRes] = await Promise.all([
        api.get('/admin/whatsapp/mensagens'),
        api.get('/admin/clientes'),
      ]);
      setMensagens(msgRes.data || []);
      setClientes(cliRes.data || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.post('/admin/whatsapp/enviar', form);
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader
        title="WhatsApp"
        subtitle="Mensagens e lembretes automáticos"
        actions={
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium">
            + Enviar Mensagem
          </button>
        }
      />

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-2">
        <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-green-700">Lembretes automáticos ativos (60 min antes do evento)</span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200"><h3 className="font-semibold">Histórico de Mensagens</h3></div>
        {mensagens.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Nenhuma mensagem enviada</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {mensagens.map((msg) => (
              <div key={msg.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{msg.cliente_nome}</p>
                  <p className="text-xs text-gray-500">{msg.template} • {formatarData(msg.created)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${msg.status === 'enviado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {msg.status === 'enviado' ? '✓ Enviado' : '✗ Erro'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Enviar Mensagem WhatsApp</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Cliente *</label>
                <select value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option value="">Selecione...</option>
                  {clientes.filter((c) => c.whatsapp_numero).map((c) => (
                    <option key={c.id} value={c.id}>{c.nome} - {c.whatsapp_numero}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Template</label>
                <select value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option value="lembrete_evento">Lembrete de Evento</option>
                  <option value="orcamento_pronto">Orçamento Pronto</option>
                  <option value="album_pronto">Álbum Pronto</option>
                  <option value="pagamento_confirmado">Pagamento Confirmado</option>
                  <option value="contrato_assinatura">Contrato para Assinatura</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-green-600 rounded-md">Enviar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
