import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { FileText, CheckCircle, XCircle, DollarSign, RefreshCw, Eye } from 'lucide-react'

const ACCENT = '#EA580C'

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StatusBadge({ status }) {
  const isAutorizada = status?.toLowerCase() === 'autorizada'
  const isRejeitada = status?.toLowerCase() === 'rejeitada'

  if (isAutorizada) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
        <CheckCircle size={12} />
        Autorizada
      </span>
    )
  }

  if (isRejeitada) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
        <XCircle size={12} />
        Rejeitada
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
      {status || 'Pendente'}
    </span>
  )
}

export default function FinanceiroNFSe() {
  const { authFetch } = useAuth()
  const [notas, setNotas] = useState([])
  const [resumo, setResumo] = useState({ total: 0, autorizadas: 0, rejeitadas: 0, faturamento: 0 })
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [notasRes, resumoRes] = await Promise.all([
        authFetch('/admin/nfse'),
        authFetch('/admin/nfse/status/resumo')
      ])

      if (notasRes.ok) {
        const data = await notasRes.json()
        setNotas(Array.isArray(data) ? data : data.notas || [])
      }

      if (resumoRes.ok) {
        const data = await resumoRes.json()
        setResumo(data)
      }
    } catch (err) {
      console.error('Erro ao carregar NFS-e:', err)
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const kpis = [
    { label: 'Total Emitidas', value: resumo.total, icon: FileText, color: 'bg-blue-50 text-blue-700' },
    { label: 'Autorizadas', value: resumo.autorizadas, icon: CheckCircle, color: 'bg-green-50 text-green-700' },
    { label: 'Rejeitadas', value: resumo.rejeitadas, icon: XCircle, color: 'bg-red-50 text-red-700' },
    { label: 'Faturamento Mês', value: formatBRL(resumo.faturamento), icon: DollarSign, color: 'bg-orange-50 text-orange-700' }
  ]

  return (
    <div className="space-y-6">
      {/* Header com botão refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Notas Fiscais de Serviço (NFS-e)</h2>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: ACCENT }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="bg-white border rounded-xl p-4 flex items-center gap-4">
              <div className={`p-3 rounded-lg ${kpi.color}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{kpi.label}</p>
                <p className="text-xl font-bold text-gray-800">{kpi.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabela de NFS-e */}
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nº DPS</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Valor</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {notas.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Nenhuma NFS-e encontrada.
                </td>
              </tr>
            )}
            {loading && notas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Carregando...
                </td>
              </tr>
            )}
            {notas.map((nota) => (
              <tr key={nota.id || nota.numero_dps} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-800">{nota.numero_dps || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(nota.data)}</td>
                <td className="px-4 py-3 text-gray-600">{nota.cliente || '—'}</td>
                <td className="px-4 py-3 text-right text-gray-800 font-medium">{formatBRL(nota.valor)}</td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={nota.status} />
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    title="Ver detalhes"
                    className="inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
