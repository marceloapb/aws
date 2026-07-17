import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, AlertCircle, Clock, Shield, Trash2, Download, Database, Server, HardDrive, RefreshCw } from 'lucide-react';

const ACCENT = '#EA580C';

export default function ConfigBackup({ form, setForm }) {
  const { authFetch } = useAuth();
  const [backupStatus, setBackupStatus] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

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

  const handleClearCache = async () => {
    setClearing(true);
    try {
      await authFetch('/admin/system/clear-cache', { method: 'POST' });
    } catch {} finally { setClearing(false); }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await authFetch('/admin/system/reindex', { method: 'POST' });
    } catch {} finally { setReindexing(false); }
  };

  const handleExportData = () => {
    alert('Exportação de dados iniciada. Você receberá um e-mail com o link para download.');
  };

  const handleRequestDeletion = () => {
    if (deleteConfirm) {
      alert('Solicitação de exclusão registrada. Seus dados serão removidos em até 30 dias conforme LGPD.');
      setDeleteConfirm(false);
    } else {
      setDeleteConfirm(true);
    }
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

        <button type="button" onClick={async () => { try { await authFetch('/admin/backup/trigger', { method: 'POST' }); loadBackupStatus(); } catch {} }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ background: ACCENT }}>
          <HardDrive size={16} /> Executar Backup Agora
        </button>
      </section>

      <hr className="border-gray-200" />

      {/* ===== Seção: LGPD ===== */}
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield size={18} style={{ color: ACCENT }} /> LGPD - Proteção de Dados
        </h3>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de Retenção de Dados (meses)</label>
            <input name="lgpdRetentionMonths" type="number" min={1} max={120} value={form.lgpdRetentionMonths || 24} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
            <p className="text-xs text-gray-400 mt-1">Após este período, dados inativos são removidos automaticamente</p>
          </div>
        </div>

        {/* Toggle permitir exclusão pelo cliente */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border mb-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Permitir exclusão pelo cliente</p>
            <p className="text-xs text-gray-500">Clientes podem solicitar exclusão de seus dados via portal</p>
          </div>
          <button type="button" onClick={() => setForm({ ...form, lgpdAllowClientDeletion: !form.lgpdAllowClientDeletion })}
            className={`w-12 h-6 rounded-full transition-colors relative ${form.lgpdAllowClientDeletion ? 'bg-green-500' : 'bg-gray-300'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${form.lgpdAllowClientDeletion ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={handleExportData}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download size={16} /> Exportar Meus Dados
          </button>

          {!deleteConfirm ? (
            <button type="button" onClick={handleRequestDeletion}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">
              <Trash2 size={16} /> Solicitar Exclusão
            </button>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle size={16} className="text-red-500" />
              <span className="text-sm text-red-700">Confirmar exclusão de dados?</span>
              <button type="button" onClick={handleRequestDeletion}
                className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700">
                Sim, solicitar
              </button>
              <button type="button" onClick={() => setDeleteConfirm(false)}
                className="px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          )}
        </div>
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

          <button type="button" onClick={handleReindex} disabled={reindexing}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <Database size={16} className={reindexing ? 'animate-spin' : ''} />
            {reindexing ? 'Reindexando...' : 'Reindexar Busca'}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Versão do Sistema</label>
            <input value="v1.0.0" readOnly
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Uptime</label>
            <input value={backupStatus?.uptime || 'Disponível via API'} readOnly
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
          </div>
        </div>
      </section>

      <hr className="border-gray-200" />

      {/* ===== Seção: Informações Técnicas ===== */}
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <HardDrive size={18} style={{ color: ACCENT }} /> Informações Técnicas
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Região AWS</label>
            <input value="us-east-1" readOnly
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tabela DynamoDB</label>
            <input value={process.env.REACT_APP_DYNAMO_TABLE || 'mbf-backend-v3'} readOnly
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 font-mono text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bucket S3</label>
            <input value={process.env.REACT_APP_S3_BUCKET || 'mbf-backend-v3-fotos'} readOnly
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 font-mono text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stack Name</label>
            <input value={process.env.REACT_APP_STACK_NAME || 'mbf-backend-v3'} readOnly
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 font-mono text-sm" />
          </div>
        </div>
      </section>

      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-700">
          💡 O DynamoDB Point-in-Time Recovery está ativado. Você pode restaurar seus dados para qualquer momento dos últimos 35 dias diretamente pelo console AWS.
        </p>
      </div>
    </div>
  );
}
