import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, AlertCircle, Clock, Database, Server, HardDrive, RefreshCw } from 'lucide-react';

const ACCENT = '#EA580C';

export default function ConfigBackup({ form, setForm }) {
  const { authFetch } = useAuth();
  const [backupStatus, setBackupStatus] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    loadBackupStatus();
  }, []);

  const loadBackupStatus = async () => {
    try {
      const res = await authFetch('/admin/configuracoes');
      const json = await res.json();
      if (json.success && json.data?.lastBackup) {
        const backup = typeof json.data.lastBackup === 'string' ? JSON.parse(json.data.lastBackup) : json.data.lastBackup;
        setBackupStatus(backup);
      }
    } catch {}
  };

  const handleChange = (e) => {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm({ ...form, [e.target.name]: val });
  };

  const handleClearCache = async () => {
    setClearing(true);
    try {
      const res = await authFetch('/admin/system/clear-cache', { method: 'POST' });
      const json = await res.json();
      if (json.success) alert('Cache limpo com sucesso!');
    } catch {} finally { setClearing(false); }
  };

  const handleTriggerBackup = async () => {
    setTriggering(true);
    try {
      const res = await authFetch('/admin/backup/trigger', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        alert('Backup executado com sucesso!');
        loadBackupStatus();
      } else {
        alert('Erro: ' + (json.message || 'Falha ao executar backup'));
      }
    } catch {
      alert('Erro de conexão ao executar backup');
    } finally { setTriggering(false); }
  };

  return (
    <div className="space-y-8">

      {/* ===== Seção: Backup Automático ===== */}
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Database size={18} style={{ color: ACCENT }} /> Backup Automático
        </h3>

        {/* Toggle backup automático */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border mb-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Backup Automático</p>
            <p className="text-xs text-gray-500">Executa diariamente no horário configurado</p>
          </div>
          <button type="button" onClick={() => setForm({ ...form, backupEnabled: !form.backupEnabled })}
            className={`w-12 h-6 rounded-full transition-colors relative ${form.backupEnabled !== false ? 'bg-green-500' : 'bg-gray-300'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${form.backupEnabled !== false ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horário do Backup</label>
            <input name="backupTime" type="time" value={form.backupTime || '02:00'} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
            <p className="text-xs text-gray-400 mt-1">Horário de Brasília (UTC-3)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Retenção (dias)</label>
            <input name="backupRetentionDays" type="number" min={7} max={365} value={form.backupRetentionDays || 35} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
          </div>
        </div>

        {/* Status do último backup */}
        <div className="p-4 rounded-lg bg-gray-50 border mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Último Backup</h4>
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

        <button type="button" onClick={handleTriggerBackup} disabled={triggering}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ background: ACCENT }}>
          <HardDrive size={16} className={triggering ? 'animate-spin' : ''} />
          {triggering ? 'Executando...' : 'Executar Backup Agora'}
        </button>
      </section>

      <hr className="border-gray-200" />

      {/* ===== Seção: Manutenção ===== */}
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Server size={18} style={{ color: ACCENT }} /> Manutenção
        </h3>

        <div className="flex items-center gap-3 flex-wrap mb-4">
          <button type="button" onClick={handleClearCache} disabled={clearing}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={16} className={clearing ? 'animate-spin' : ''} />
            {clearing ? 'Limpando...' : 'Limpar Cache'}
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-4">
          Limpar cache recarrega todas as configurações de integrações (tokens, chaves). Use após alterar tokens no SSM.
        </p>
      </section>

      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-700">
          💡 O DynamoDB Point-in-Time Recovery está ativado. Você pode restaurar seus dados para qualquer momento dos últimos 35 dias diretamente pelo console AWS.
        </p>
      </div>
    </div>
  );
}
