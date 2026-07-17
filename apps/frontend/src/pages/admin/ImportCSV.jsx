import React, { useState, useCallback } from 'react';
import { Upload, Download, Users, Package, FileText, ClipboardList, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ACCENT = '#EA580C';
const TIPOS_IMPORT = ['clientes', 'catalogo', 'orcamentos-historico', 'equipamentos'];
const TIPOS_LABEL = { clientes: 'Clientes', catalogo: 'Catálogo', 'orcamentos-historico': 'Orçamentos Histórico', equipamentos: 'Equipamentos' };

const EXPORT_CARDS = [
  { tipo: 'clientes', nome: 'Clientes', desc: 'Base completa de clientes', icon: Users },
  { tipo: 'catalogo', nome: 'Catálogo', desc: 'Produtos e serviços', icon: Package },
  { tipo: 'orcamentos', nome: 'Orçamentos', desc: 'Todos os orçamentos', icon: FileText },
  { tipo: 'contratos', nome: 'Contratos', desc: 'Contratos ativos e encerrados', icon: ClipboardList },
  { tipo: 'financeiro', nome: 'Financeiro', desc: 'Movimentações financeiras', icon: DollarSign },
];

export default function ImportCSV() {
  const { authFetch } = useAuth();
  const [file, setFile] = useState(null);
  const [tipo, setTipo] = useState(TIPOS_IMPORT[0]);
  const [preview, setPreview] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);

  const parseCSV = (text) => text.trim().split('\n').map(line => line.split(','));

  const handleFile = (f) => {
    if (!f || !f.name.endsWith('.csv')) return;
    setFile(f);
    setResultado(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = parseCSV(e.target.result);
      setPreview(rows.slice(0, 5));
    };
    reader.readAsText(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const res = await authFetch(`/admin/import/${tipo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: text,
      });
      const data = await res.json();
      setResultado(data);
    } catch (err) {
      setResultado({ sucesso: 0, erros: [{ linha: 0, motivo: err.message }] });
    }
    setLoading(false);
  };

  const handleExport = async (tipoExport) => {
    try {
      const res = await authFetch(`/admin/export/${tipoExport}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tipoExport}_export.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Erro ao exportar: ' + err.message);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold" style={{ color: ACCENT }}>Cargas / Import-Export</h1>

      {/* IMPORTAR */}
      <section className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Upload size={20} /> Importar CSV</h2>

        <div className="flex gap-4 items-center">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}
            className="border rounded px-3 py-2 text-sm">
            {TIPOS_IMPORT.map(t => <option key={t} value={t}>{TIPOS_LABEL[t]}</option>)}
          </select>
        </div>

        <div onDrop={onDrop} onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById('csv-input').click()}
          className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-orange-400 transition-colors"
          style={{ borderColor: file ? ACCENT : undefined }}>
          <Upload className="mx-auto mb-2 text-gray-400" size={36} />
          <p className="text-gray-500">{file ? file.name : 'Arraste seu CSV aqui'}</p>
          <input id="csv-input" type="file" accept=".csv" className="hidden"
            onChange={(e) => handleFile(e.target.files[0])} />
        </div>

        {preview.length > 0 && (
          <div className="overflow-x-auto">
            <p className="text-sm text-gray-500 mb-1">Preview (primeiras 5 linhas):</p>
            <table className="w-full text-xs border">
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className={i === 0 ? 'bg-gray-100 font-semibold' : ''}>
                    {row.map((cell, j) => <td key={j} className="border px-2 py-1">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button onClick={handleImport} disabled={!file || loading}
          className="px-5 py-2 text-white rounded font-medium disabled:opacity-50"
          style={{ backgroundColor: ACCENT }}>
          {loading ? 'Importando...' : 'Importar'}
        </button>

        {resultado && (
          <div className="space-y-3">
            <div className="flex gap-4">
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded px-4 py-2">
                <CheckCircle size={18} className="text-green-600" />
                <span className="text-sm font-medium">{resultado.sucesso ?? 0} importados com sucesso</span>
              </div>
              {resultado.erros?.length > 0 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded px-4 py-2">
                  <AlertTriangle size={18} className="text-red-600" />
                  <span className="text-sm font-medium">{resultado.erros.length} erros</span>
                </div>
              )}
            </div>
            {resultado.erros?.length > 0 && (
              <table className="w-full text-sm border">
                <thead className="bg-gray-50">
                  <tr><th className="border px-3 py-1 text-left">Linha</th><th className="border px-3 py-1 text-left">Motivo</th></tr>
                </thead>
                <tbody>
                  {resultado.erros.map((err, i) => (
                    <tr key={i}><td className="border px-3 py-1">{err.linha}</td><td className="border px-3 py-1">{err.motivo}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      {/* EXPORTAR */}
      <section className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Download size={20} /> Exportar CSV</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXPORT_CARDS.map(({ tipo: t, nome, desc, icon: Icon }) => (
            <div key={t} className="border rounded-lg p-4 flex flex-col items-start gap-2 hover:shadow transition-shadow">
              <Icon size={24} style={{ color: ACCENT }} />
              <h3 className="font-semibold">{nome}</h3>
              <p className="text-sm text-gray-500">{desc}</p>
              <button onClick={() => handleExport(t)}
                className="mt-auto px-4 py-1.5 text-sm text-white rounded"
                style={{ backgroundColor: ACCENT }}>
                Exportar CSV
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
