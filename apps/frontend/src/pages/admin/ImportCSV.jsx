import React, { useState, useCallback, useRef } from 'react';
import { Upload, Download, Users, Calendar, Wrench, Package, CreditCard, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, ArrowLeft, ArrowRight, RefreshCw, ExternalLink, Tag, Gift, FileSignature, ClipboardCheck, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { validateCPF } from '../../utils/formatters';
import { PageHeader } from '../../components/ui';

const ACCENT = '#EA580C';

const TEMPLATES = {
  clientes: { label: 'Clientes', icon: 'Users', desc: 'Base de clientes', cols: ['nome*','email*','telefone*','whatsapp','cpf','instagram','como_conheceu','endereco_cep','endereco_cidade','endereco_estado','data_nascimento','notas','tags'] },
  sessoes: { label: 'Sessões', icon: 'Calendar', desc: 'Sessões e eventos', cols: ['titulo*','tipo_evento*','data_evento*','horario_inicio*','horario_fim','local','cliente_email','valor','status','observacoes'] },
  equipamentos: { label: 'Equipamentos', icon: 'Wrench', desc: 'Inventário de equipamentos', cols: ['nome*','categoria*','numero_serie*','marca','modelo','valor_estimado','status','localizacao','data_compra','padrao'] },
  catalogo: { label: 'Produtos e Serviços', icon: 'Package', desc: 'Itens e serviços do seu negócio', cols: ['nome*','tipo*','valor_base*','descricao','duracao_base','valor_hora_adicional','categoria','exibir_ao_cliente','ativo'] },
  pagamentos: { label: 'Pagamentos', icon: 'CreditCard', desc: 'Cobranças e recebimentos', cols: ['cliente_email*','valor*','data_vencimento*','parcela','meio_pagamento','status','descricao','orcamento_id'] },
  tipos_evento: { label: 'Tipos de Evento', icon: 'Tag', desc: 'Categorias de sessão fotográfica', cols: ['nome*','cor','duracao_padrao_horas','valor_base','descricao'] },
  pacotes: { label: 'Pacotes Comerciais', icon: 'Gift', desc: 'Pacotes com itens e desconto', cols: ['nome*','descricao*','itens_ids','desconto_tipo','desconto_valor','exibir_ao_cliente','ativo'] },
  modelos_contrato: { label: 'Modelos de Contrato', icon: 'FileSignature', desc: 'Templates de contrato por tipo de evento', cols: ['nome*','tipo_evento*','corpo_html*','campos_manuais','ativo'] },
  modelos_checklist: { label: 'Modelos de Checklist', icon: 'ClipboardCheck', desc: 'Checklists por tipo de evento', cols: ['nome*','tipo_evento*','itens*','descricao'] },
  templates_mensagem: { label: 'Templates de Mensagens', icon: 'MessageSquare', desc: 'Templates para WhatsApp e email', cols: ['nome*','canal*','gatilho','assunto','corpo*','variaveis'] },
};

const ICON_MAP = { Users, Calendar, Wrench, Package, CreditCard, Tag, Gift, FileSignature, ClipboardCheck, MessageSquare };

const EXPORT_CARDS = [
  { tipo: 'clientes', nome: 'Clientes', icon: 'Users' },
  { tipo: 'catalogo', nome: 'Produtos e Serviços', icon: 'Package' },
  { tipo: 'sessoes', nome: 'Sessões/Agenda', icon: 'Calendar' },
  { tipo: 'pagamentos', nome: 'Cobranças', icon: 'CreditCard' },
  { tipo: 'despesas', nome: 'Despesas', icon: 'CreditCard' },
  { tipo: 'equipamentos', nome: 'Equipamentos', icon: 'Wrench' },
  { tipo: 'contratos', nome: 'Contratos', icon: 'FileSignature' },
  { tipo: 'tipos_evento', nome: 'Tipos de Evento', icon: 'Tag' },
  { tipo: 'pacotes', nome: 'Pacotes Comerciais', icon: 'Gift' },
  { tipo: 'modelos_checklist', nome: 'Modelos de Checklist', icon: 'ClipboardCheck' },
  { tipo: 'templates_mensagem', nome: 'Templates de Mensagens', icon: 'MessageSquare' },
];

const ENTITY_ROUTES = { clientes: '/admin/clientes', sessoes: '/admin/agenda', equipamentos: '/admin/equipamentos', catalogo: '/admin/catalogo', pagamentos: '/admin/financeiro', tipos_evento: '/admin/catalogo', pacotes: '/admin/catalogo', modelos_contrato: '/admin/contratos', modelos_checklist: '/admin/equipamentos', templates_mensagem: '/admin/whatsapp' };

// ═══ Helpers ═══
function parseCSV(text) {
  const sep = text.indexOf(';') !== -1 && (text.indexOf(';') < text.indexOf(',') || text.indexOf(',') === -1) ? ';' : ',';
  const lines = text.trim().split(/\r?\n/);
  return lines.map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, '')));
}

function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function isValidPhone(v) { const d = v.replace(/\D/g, ''); return d.length >= 10 && d.length <= 11; }
function isValidDate(v) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return !isNaN(Date.parse(v));
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) { const [d,m,y] = v.split('/'); return !isNaN(Date.parse(`${y}-${m}-${d}`)); }
  return false;
}

function downloadCSV(filename, content) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ImportCSV() {
  const { authFetch } = useAuth();
  const fileRef = useRef(null);

  const [step, setStep] = useState(1);
  const [entity, setEntity] = useState(null);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [validRows, setValidRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [duplicates, setDuplicates] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [result, setResult] = useState(null);

  // ═══ Step 1 ═══
  const handleSelectEntity = (key) => { setEntity(key); };
  const downloadTemplate = (key) => {
    const t = TEMPLATES[key];
    const cols = t.cols.map(c => c.replace('*', ''));
    downloadCSV(`template_${key}.csv`, cols.join(','));
  };

  // ═══ Step 2 ═══
  const handleFile = useCallback((f) => {
    if (!f || !f.name.endsWith('.csv')) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result);
      if (parsed.length > 0) { setHeaders(parsed[0]); setRows(parsed.slice(1)); }
    };
    reader.readAsText(f, 'UTF-8');
  }, []);

  const onDrop = useCallback((e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }, [handleFile]);

  // ═══ Step 3 — Validação ═══
  const runValidation = () => {
    const tpl = TEMPLATES[entity];
    const requiredCols = tpl.cols.filter(c => c.endsWith('*')).map(c => c.replace('*', ''));
    const allCols = tpl.cols.map(c => c.replace('*', ''));
    const errs = []; const valid = []; const seen = new Map(); let dupes = 0;

    rows.forEach((row, idx) => {
      const lineNum = idx + 2;
      let rowErrors = [];
      const obj = {};
      allCols.forEach((col, ci) => { obj[col] = row[ci] || ''; });

      // Required check
      requiredCols.forEach(col => {
        const ci = allCols.indexOf(col);
        if (!row[ci] || row[ci].trim() === '') rowErrors.push({ linha: lineNum, coluna: col, valor: '', erro: 'Campo obrigatório vazio', sugestao: `Preencha o campo ${col}` });
      });

      // Email validation
      ['email', 'cliente_email'].forEach(col => {
        const ci = allCols.indexOf(col);
        if (ci >= 0 && row[ci] && row[ci].trim() && !isValidEmail(row[ci])) rowErrors.push({ linha: lineNum, coluna: col, valor: row[ci], erro: 'Email inválido', sugestao: 'Use formato nome@dominio.com' });
      });

      // CPF validation
      const cpfIdx = allCols.indexOf('cpf');
      if (cpfIdx >= 0 && row[cpfIdx] && row[cpfIdx].trim()) {
        if (!validateCPF(row[cpfIdx])) rowErrors.push({ linha: lineNum, coluna: 'cpf', valor: row[cpfIdx], erro: 'CPF inválido', sugestao: 'Verifique os dígitos verificadores' });
      }

      // Phone validation
      const telIdx = allCols.indexOf('telefone');
      if (telIdx >= 0 && row[telIdx] && row[telIdx].trim()) {
        if (!isValidPhone(row[telIdx])) rowErrors.push({ linha: lineNum, coluna: 'telefone', valor: row[telIdx], erro: 'Telefone inválido', sugestao: 'Use 10 ou 11 dígitos' });
      }

      // Date validation
      ['data', 'data_nascimento', 'data_vencimento'].forEach(col => {
        const ci = allCols.indexOf(col);
        if (ci >= 0 && row[ci] && row[ci].trim() && !isValidDate(row[ci])) rowErrors.push({ linha: lineNum, coluna: col, valor: row[ci], erro: 'Data inválida', sugestao: 'Use DD/MM/YYYY ou YYYY-MM-DD' });
      });

      // Duplicates detection
      const emailIdx = allCols.indexOf('email') >= 0 ? allCols.indexOf('email') : allCols.indexOf('cliente_email');
      const dupKey = emailIdx >= 0 && row[emailIdx] ? row[emailIdx].toLowerCase() : (cpfIdx >= 0 && row[cpfIdx] ? row[cpfIdx].replace(/\D/g,'') : null);
      if (dupKey && dupKey.trim()) {
        if (seen.has(dupKey)) { dupes++; rowErrors.push({ linha: lineNum, coluna: 'duplicata', valor: dupKey, erro: 'Registro duplicado', sugestao: `Igual à linha ${seen.get(dupKey)}` }); }
        else seen.set(dupKey, lineNum);
      }

      if (rowErrors.length === 0) valid.push(row);
      else errs.push(...rowErrors);
    });

    setValidRows(valid); setErrors(errs); setDuplicates(dupes); setStep(3);
  };

  // ═══ Step 4 — Import ═══
  const runImport = async () => {
    setStep(4); setProgress(0); setImportTotal(validRows.length);
    const allCols = TEMPLATES[entity].cols.map(c => c.replace('*', ''));
    const records = validRows.map(row => {
      const obj = {}; allCols.forEach((col, i) => { if (row[i]) obj[col] = row[i]; }); return obj;
    });

    const batchSize = 25; const batches = [];
    for (let i = 0; i < records.length; i += batchSize) batches.push(records.slice(i, i + batchSize));

    let successes = 0; const failures = [];
    for (let i = 0; i < batches.length; i++) {
      try {
        const res = await authFetch(`/admin/import/${entity}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records: batches[i] }) });
        const data = await res.json();
        successes += data.sucesso || batches[i].length;
        if (data.erros) failures.push(...data.erros);
      } catch (err) { batches[i].forEach((_, j) => failures.push({ linha: i * batchSize + j + 2, motivo: err.message })); }
      setProgress((i + 1) * batchSize > records.length ? records.length : (i + 1) * batchSize);
    }
    setResult({ successes, failures }); setStep(5);
  };

  // ═══ Step 5 — Download failures ═══
  const downloadFailures = () => {
    if (!result?.failures?.length) return;
    const allCols = TEMPLATES[entity].cols.map(c => c.replace('*', ''));
    const content = allCols.join(',') + '\n' + result.failures.map(f => f.record ? Object.values(f.record).join(',') : `Linha ${f.linha}: ${f.motivo}`).join('\n');
    downloadCSV(`falhas_${entity}.csv`, content);
  };

  const reset = () => { setStep(1); setEntity(null); setFile(null); setRows([]); setHeaders([]); setValidRows([]); setErrors([]); setDuplicates(0); setResult(null); setProgress(0); };

  // ═══ Export ═══
  const handleExport = async (tipo) => {
    try {
      const res = await authFetch(`/admin/export/${tipo}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${tipo}_export.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert('Erro ao exportar: ' + err.message); }
  };

  // ═══ RENDER ═══
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Upload}
        title="Importar / Exportar Dados"
        subtitle="Importe dados via CSV ou exporte suas informações"
      />

      {/* Wizard Steps Indicator */}
      <div className="flex items-center gap-2 text-sm mb-4">
        {['Entidade', 'Upload', 'Validação', 'Importação', 'Resultado'].map((s, i) => (
          <React.Fragment key={i}>
            <span className={`px-3 py-1 rounded-full font-medium ${step === i + 1 ? 'text-white' : step > i + 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
              style={step === i + 1 ? { backgroundColor: ACCENT } : {}}>
              {i + 1}. {s}
            </span>
            {i < 4 && <span className="text-gray-300">→</span>}
          </React.Fragment>
        ))}
      </div>

      {/* ═══ STEP 1 — Selecionar Entidade ═══ */}
      {step === 1 && (
        <section className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-lg font-semibold">Selecione a entidade para importação</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(TEMPLATES).map(([key, tpl]) => {
              const Icon = ICON_MAP[tpl.icon];
              const selected = entity === key;
              return (
                <div key={key} onClick={() => handleSelectEntity(key)}
                  className={`border-2 rounded-lg p-5 cursor-pointer transition-all hover:shadow-md ${selected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <Icon size={28} style={{ color: ACCENT }} />
                    <div>
                      <h3 className="font-semibold text-base">{tpl.label}</h3>
                      <p className="text-xs text-gray-500">{tpl.desc}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{tpl.cols.length} colunas</p>
                  <button onClick={(e) => { e.stopPropagation(); downloadTemplate(key); }}
                    className="text-xs px-3 py-1 rounded border border-orange-300 text-orange-600 hover:bg-orange-50">
                    📥 Baixar Template CSV
                  </button>
                </div>
              );
            })}
          </div>

          {entity && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Colunas — {TEMPLATES[entity].label}</h3>
              <table className="w-full text-sm border rounded">
                <thead className="bg-gray-50">
                  <tr><th className="border px-3 py-2 text-left">Coluna</th><th className="border px-3 py-2 text-left">Obrigatória</th></tr>
                </thead>
                <tbody>
                  {TEMPLATES[entity].cols.map(col => (
                    <tr key={col}><td className="border px-3 py-1">{col.replace('*','')}</td><td className="border px-3 py-1">{col.endsWith('*') ? <span className="text-red-600 font-medium">Sim</span> : 'Não'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={() => entity && setStep(2)} disabled={!entity}
              className="flex items-center gap-2 px-5 py-2 text-white rounded font-medium disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
              Próximo <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* ═══ STEP 2 — Upload + Preview ═══ */}
      {step === 2 && (
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setStep(1)} className="text-gray-500 hover:text-gray-700"><ArrowLeft size={18} /></button>
            <h2 className="text-lg font-semibold">Upload do CSV — {TEMPLATES[entity].label}</h2>
          </div>

          <div onDrop={onDrop} onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-orange-400 transition-colors"
            style={{ borderColor: file ? ACCENT : undefined }}>
            <Upload className="mx-auto mb-3 text-gray-400" size={40} />
            <p className="text-gray-600 font-medium">{file ? file.name : 'Arraste seu CSV aqui ou clique para selecionar'}</p>
            <p className="text-xs text-gray-400 mt-1">Aceita separador vírgula (,) ou ponto-e-vírgula (;)</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          </div>

          {rows.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 font-medium">Preview — {rows.length} registros encontrados</p>
              <div className="overflow-x-auto max-h-96 border rounded">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>{headers.map((h, i) => <th key={i} className="border px-2 py-2 text-left font-bold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {row.map((cell, j) => <td key={j} className="border px-2 py-1">{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={runValidation} disabled={rows.length === 0}
              className="flex items-center gap-2 px-5 py-2 text-white rounded font-medium disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
              Próximo: Validar <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* ═══ STEP 3 — Validação ═══ */}
      {step === 3 && (
        <section className="bg-white rounded-lg shadow p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setStep(2)} className="text-gray-500 hover:text-gray-700"><ArrowLeft size={18} /></button>
            <h2 className="text-lg font-semibold">Validação — {TEMPLATES[entity].label}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{validRows.length}</p>
              <p className="text-sm text-green-600">✅ Válidos prontos para importar</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{errors.length}</p>
              <p className="text-sm text-red-600">⚠️ Com erros (ver detalhes)</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-700">{duplicates}</p>
              <p className="text-sm text-yellow-600">🔄 Duplicatas detectadas</p>
            </div>
          </div>

          {errors.length > 0 && (
            <div>
              <button onClick={() => setShowErrors(!showErrors)} className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                {showErrors ? <ChevronUp size={16} /> : <ChevronDown size={16} />} Relatório de erros ({errors.length})
              </button>
              {showErrors && (
                <div className="overflow-x-auto mt-2 max-h-64 overflow-y-auto border rounded">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr><th className="border px-2 py-1">Linha</th><th className="border px-2 py-1">Coluna</th><th className="border px-2 py-1">Valor</th><th className="border px-2 py-1">Erro</th><th className="border px-2 py-1">Sugestão</th></tr>
                    </thead>
                    <tbody>
                      {errors.map((err, i) => (
                        <tr key={i} className="hover:bg-red-50">
                          <td className="border px-2 py-1">{err.linha}</td>
                          <td className="border px-2 py-1">{err.coluna}</td>
                          <td className="border px-2 py-1 max-w-32 truncate">{err.valor}</td>
                          <td className="border px-2 py-1 text-red-600">{err.erro}</td>
                          <td className="border px-2 py-1 text-gray-500">{err.sugestao}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button onClick={() => { setStep(2); setFile(null); setRows([]); setHeaders([]); }}
              className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">
              Corrigir e Reimportar
            </button>
            <button onClick={runImport} disabled={validRows.length === 0}
              className="flex items-center gap-2 px-5 py-2 text-white rounded font-medium disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
              Importar Válidos ({validRows.length}) <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* ═══ STEP 4 — Importação ═══ */}
      {step === 4 && (
        <section className="bg-white rounded-lg shadow p-6 space-y-5">
          <h2 className="text-lg font-semibold">Importando — {TEMPLATES[entity].label}</h2>
          <div className="space-y-3">
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(progress / importTotal) * 100}%`, backgroundColor: ACCENT }} />
            </div>
            <p className="text-center text-sm text-gray-600">
              Importando... <span className="font-bold">{progress}/{importTotal}</span>
            </p>
            <div className="flex justify-center">
              <RefreshCw size={24} className="animate-spin" style={{ color: ACCENT }} />
            </div>
          </div>
        </section>
      )}

      {/* ═══ STEP 5 — Resultado ═══ */}
      {step === 5 && result && (
        <section className="bg-white rounded-lg shadow p-6 space-y-5">
          <h2 className="text-lg font-semibold">Resultado da Importação</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <CheckCircle size={36} className="mx-auto mb-2 text-green-600" />
              <p className="text-3xl font-bold text-green-700">{result.successes}</p>
              <p className="text-sm text-green-600">✅ Importados com sucesso</p>
            </div>
            {result.failures.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertTriangle size={36} className="mx-auto mb-2 text-red-600" />
                <p className="text-3xl font-bold text-red-700">{result.failures.length}</p>
                <p className="text-sm text-red-600">⚠️ Falharam no servidor</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {result.failures.length > 0 && (
              <button onClick={downloadFailures} className="flex items-center gap-2 px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">
                <Download size={16} /> Baixar CSV dos que falharam
              </button>
            )}
            <button onClick={reset} className="flex items-center gap-2 px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">
              <RefreshCw size={16} /> Nova importação
            </button>
            <a href={ENTITY_ROUTES[entity]} className="flex items-center gap-2 px-5 py-2 text-white rounded font-medium" style={{ backgroundColor: ACCENT }}>
              <ExternalLink size={16} /> Ver registros importados
            </a>
          </div>
        </section>
      )}

      {/* ═══ SEÇÃO EXPORT ═══ */}
      <section className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Download size={20} /> Exportar CSV</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {EXPORT_CARDS.map(({ tipo, nome, icon }) => {
            const Icon = ICON_MAP[icon];
            return (
              <div key={tipo} className="border rounded-lg p-4 flex flex-col items-center gap-2 hover:shadow transition-shadow text-center">
                <Icon size={28} style={{ color: ACCENT }} />
                <h3 className="font-semibold text-sm">{nome}</h3>
                <button onClick={() => handleExport(tipo)}
                  className="mt-auto px-4 py-1.5 text-xs text-white rounded" style={{ backgroundColor: ACCENT }}>
                  Exportar CSV
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
