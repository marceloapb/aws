import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function ConfigBackup({ form, setForm }) {
  const { authFetch } = useAuth();
  const [backupStatus, setBackupStatus] = useState(null);

  useEffect(() => {
    loadBackupStatus();
  }, []);

  const loadBackupStatus = async () => {
    try {
      const res = await authFetch('/admin/configuracoes');
      const json = await res.json();
      if (json.success && json.data?.lastBackup) {
        setBackupStatus(json.data.lastBackup);
      }
    } catch {}
  };

  const handleChange = (e) => {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm({ ...form, [e.target.name]: val });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">O sistema faz backup automático diário via DynamoDB Point-in-Time Recovery e export para S3.</p>

      {/* Toggle backup automático */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border">
        <div>
          <p className="text-sm font-medium text-gray-900">Backup Automático</p>
          <p className="text-xs text-gray-500">Executa diariamente no horário configurado</p>
        </div>
        <button type="button" onClick={() => setForm({ ...form, backupEnabled: !form.backupEnabled })}
          className={`w-12 h-6 rounded-full transition-colors relative ${form.backupEnabled !== false ? 'bg-green-500' : 'bg-gray-300'}`}>
          <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${form.backupEnabled !== false ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Status */}
      <div className="p-4 rounded-lg bg-gray-50 border">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Status do Último Backup</h4>
        {backupStatus ? (
          <div className="flex items-center gap-3">
            {backupStatus.status === 'concluido' ? (
              <CheckCircle size={20} className="text-green-500" />
            ) : backupStatus.status === 'erro' ? (
              <AlertCircle size={20} className="text-red-500" />
            ) : (
              <Clock size={20} className="text-yellow-500" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {backupStatus.status === 'concluido' ? 'Concluído' : backupStatus.status === 'erro' ? 'Erro' : 'Em andamento'}
              </p>
              <p className="text-xs text-gray-500">
                {backupStatus.timestamp ? new Date(backupStatus.timestamp).toLocaleString('pt-BR') : 'Nunca executado'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Nenhum backup registrado ainda</p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Horário do Backup Automático</label>
          <input name="backupTime" type="time" value={form.backupTime || '02:00'} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
          <p className="text-xs text-gray-400 mt-1">Horário de Brasília (UTC-3)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Retenção (dias)</label>
          <input name="backupRetentionDays" type="number" min={7} max={365} value={form.backupRetentionDays || 35} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
          <p className="text-xs text-gray-400 mt-1">DynamoDB PITR mantém até 35 dias automaticamente</p>
        </div>
      </div>

      {/* Info readonly */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bucket S3</label>
          <input value={process.env.REACT_APP_S3_BUCKET || 'mbf-backend-v3-fotos'} readOnly
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Região</label>
          <input value="us-east-1" readOnly
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={async () => { try { await authFetch('/admin/backup/trigger', { method: 'POST' }); loadBackupStatus(); } catch {} }}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
          Executar Backup Agora
        </button>
      </div>

      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-700">
          💡 O DynamoDB Point-in-Time Recovery está ativado. Você pode restaurar seus dados para qualquer momento dos últimos 35 dias diretamente pelo console AWS.
        </p>
      </div>
    </div>
  );
}
