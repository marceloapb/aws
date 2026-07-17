import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';

const ACCENT = '#EA580C';

const ENTITY_TYPES = [
  { value: 'clientes', label: 'Clientes' },
  { value: 'catalogo', label: 'Catálogo' },
  { value: 'orcamentos_historico', label: 'Orçamentos (Histórico)' },
];

export default function ImportCSV() {
  const { authFetch } = useAuth();
  const [file, setFile] = useState(null);
  const [entityType, setEntityType] = useState('clientes');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && (selected.type === 'text/csv' || selected.name.endsWith('.csv'))) {
      setFile(selected);
      setResult(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.type === 'text/csv' || dropped.name.endsWith('.csv'))) {
      setFile(dropped);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', entityType);
      const res = await authFetch(`/admin/import/${entityType}`, {
        method: 'POST',
        body: formData,
        headers: {},
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ imported: 0, errors: [{ line: 0, message: 'Erro ao importar: ' + err.message }] });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async (type) => {
    try {
      const res = await authFetch(`/admin/export/${type}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Erro ao exportar: ' + err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Importar / Exportar CSV</h1>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Importar Dados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition-colors cursor-pointer"
            onClick={() => document.getElementById('csv-input').click()}
          >
            <Upload size={40} className="mx-auto mb-3 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">
              {file ? file.name : 'Arraste um arquivo CSV ou clique para selecionar'}
            </p>
            {file && <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>}
            <input id="csv-input" type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Dados</label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleImport}
              disabled={!file || importing}
              style={{ background: ACCENT }}
              className="w-full py-2.5 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              <Upload size={16} />
              {importing ? 'Importando...' : 'Importar'}
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle size={16} />
                <span className="text-sm font-medium">{result.imported || 0} importados</span>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle size={16} />
                  <span className="text-sm font-medium">{result.errors.length} erros</span>
                </div>
              )}
            </div>
            {result.errors && result.errors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <div key={i} className="text-sm text-red-700 py-1 border-b border-red-100 last:border-0">
                    <span className="font-medium">Linha {err.line}:</span> {err.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Exportar Dados</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ENTITY_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => handleExport(t.value)}
              className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
            >
              <Download size={16} style={{ color: ACCENT }} />
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
