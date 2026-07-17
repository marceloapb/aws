import React, { useState } from "react";
import {
  UploadCloud, Download, Camera, Package, CalendarDays, ShoppingCart,
  FileSignature, ListChecks, Check, AlertTriangle, X, Info,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Cargas de Cadastro (importação em massa via CSV)
// Canal ALTERNATIVO de entrada de dados para 6 domínios que já existem no
// sistema (Equipamentos §27, Catálogo §5, Tipo de Evento §5/§27, Pacotes §5,
// Modelo de Contrato §8, Modelo de Checklist §27) — não cria domínio novo,
// só um jeito mais rápido de povoar em lote. Duplicata (mesmo nome,
// case-insensitive) é SEMPRE ignorada — nunca atualiza, nunca duplica. Erro
// numa linha não trava as demais. "Datas Importantes" e "Templates de
// Mensagens" ficam de fora por decisão do usuário. Dados em memória —
// parsing de CSV real (FileReader), mas grava só no estado local, não
// persiste de verdade nem sincroniza com os outros protótipos.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

const CATEGORIAS = [
  {
    key: "equipamentos", nome: "Equipamentos", icon: Camera,
    descricao: "Câmeras, lentes, iluminação e acessórios para gestão de inventário e checklists.",
    colunas: ["nome", "categoria", "marca", "modelo"],
    existentesSeed: ["Câmera Principal", "Lente 24-70mm"],
  },
  {
    key: "produtos", nome: "Produtos e Serviços", icon: Package,
    descricao: "Cadastro de produtos, serviços, adicionais, valores base e itens usados na precificação.",
    colunas: ["nome", "categoria", "valor_base"],
    existentesSeed: ["Álbum 30x30", "Hora extra"],
  },
  {
    key: "tipos_evento", nome: "Tipos de Evento", icon: CalendarDays,
    descricao: "Classificação de eventos atendidos (Casamento, Aniversário Infantil, Ensaios).",
    colunas: ["nome", "valor_base", "duracao_horas"],
    existentesSeed: ["Casamento", "Aniversário", "Batizado"],
  },
  {
    key: "pacotes", nome: "Pacotes Comerciais", icon: ShoppingCart,
    descricao: "Combinações predefinidas de serviços para agilizar propostas e orçamentos.",
    colunas: ["nome", "itens_incluidos", "valor"],
    existentesSeed: ["Pacote Essencial"],
  },
  {
    key: "contratos", nome: "Modelos de Contrato", icon: FileSignature,
    descricao: "Textos padrão e minutas de contratos vinculados aos diferentes tipos de serviço.",
    colunas: ["nome", "tipo_evento", "texto"],
    existentesSeed: ["Contrato Casamento Padrão"],
  },
  {
    key: "checklists", nome: "Modelos de Checklist", icon: ListChecks,
    descricao: "Importar modelos de checklist e seus itens.",
    colunas: ["nome_checklist", "tipo_evento", "equipamento"],
    existentesSeed: ["Checklist Casamento"],
  },
];

export default function CargasDeCadastro() {
  const [importando, setImportando] = useState(null); // categoria sendo importada
  const [existentes, setExistentes] = useState(() =>
    Object.fromEntries(CATEGORIAS.map((c) => [c.key, [...c.existentesSeed]]))
  );

  const baixarModelo = (cat) => {
    const csv = cat.colunas.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `modelo-${cat.key}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><UploadCloud className="h-4 w-4 text-white" /></div>
          <span className="text-sm font-semibold tracking-tight">Configurações · Cargas de Cadastro</span>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Cargas de Cadastro</h1>
        <p className="mt-1 text-sm text-stone-500">Importação em massa via CSV — canal alternativo aos formulários manuais, não os substitui.</p>

        <div className="mt-6 space-y-4">
          {CATEGORIAS.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.key} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50"><Icon className="h-5 w-5" style={{ color: ACCENT }} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-stone-800">{cat.nome}</span>
                      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600"><Check className="h-3 w-3" /> Disponível</span>
                    </div>
                    <p className="mt-1 text-sm text-stone-500">{cat.descricao}</p>
                    <p className="mt-1 text-xs text-stone-400">{existentes[cat.key].length} já cadastrado(s) nesta categoria.</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => baixarModelo(cat)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
                        <Download className="h-3.5 w-3.5" /> Modelo CSV
                      </button>
                      <button onClick={() => setImportando(cat)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
                        <UploadCloud className="h-3.5 w-3.5" /> Importar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Linha com nome já existente (comparação sem diferenciar maiúsculas/minúsculas) é sempre ignorada — nunca atualiza, nunca duplica.
        </p>
      </main>

      {importando && (
        <ModalImportar categoria={importando} existentes={existentes[importando.key]}
          onFechar={() => setImportando(null)}
          onConcluir={(novos) => setExistentes((e) => ({ ...e, [importando.key]: [...e[importando.key], ...novos] }))} />
      )}
    </div>
  );
}

function parseCSV(texto) {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (linhas.length === 0) return { cabecalho: [], linhas: [] };
  const cabecalho = linhas[0].split(",").map((c) => c.trim());
  const linhasDados = linhas.slice(1).map((l) => l.split(",").map((c) => c.trim()));
  return { cabecalho, linhas: linhasDados };
}

function ModalImportar({ categoria, existentes, onFechar, onConcluir }) {
  const [arquivo, setArquivo] = useState(null);
  const [conteudo, setConteudo] = useState("");
  const [resultado, setResultado] = useState(null); // { importados, ignorados, erros }
  const [erroArquivo, setErroArquivo] = useState(null);

  const onSelecionarArquivo = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setArquivo(f);
    setErroArquivo(null);
    setResultado(null);
    const reader = new FileReader();
    reader.onload = (ev) => setConteudo(ev.target.result);
    reader.readAsText(f);
  };

  const processar = () => {
    const { cabecalho, linhas } = parseCSV(conteudo);

    // cabeçalho tem que bater com o esperado — senão rejeita o arquivo inteiro
    const cabecalhoOk = categoria.colunas.every((c) => cabecalho.includes(c));
    if (!cabecalhoOk) {
      setErroArquivo(`Cabeçalho não confere. Esperado: ${categoria.colunas.join(", ")}`);
      return;
    }
    if (linhas.length === 0) {
      setErroArquivo("Arquivo só tem cabeçalho — nada para importar.");
      return;
    }

    const idxNome = cabecalho.indexOf(categoria.colunas[0]); // primeira coluna é sempre o "nome"
    const existentesLower = new Set(existentes.map((n) => n.toLowerCase()));
    const importados = []; const ignorados = []; const erros = [];

    linhas.forEach((linha, i) => {
      if (linha.length < cabecalho.length || linha.some((c) => c === "")) {
        erros.push({ linha: i + 2, motivo: "Campo obrigatório vazio" });
        return;
      }
      const nome = linha[idxNome];
      if (existentesLower.has(nome.toLowerCase()) || importados.some((n) => n.toLowerCase() === nome.toLowerCase())) {
        ignorados.push({ linha: i + 2, nome });
        return;
      }
      importados.push(nome);
    });

    setResultado({ importados, ignorados, erros });
  };

  const confirmar = () => {
    onConcluir(resultado.importados);
    onFechar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onFechar}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold tracking-tight">Importar · {categoria.nome}</h3>
        <p className="mt-1 text-xs text-stone-500">Colunas esperadas: {categoria.colunas.join(", ")}</p>

        {!resultado && (
          <>
            <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-stone-300 px-5 py-8 text-center text-sm text-stone-500 hover:bg-stone-50">
              <UploadCloud className="h-6 w-6 text-stone-400" />
              {arquivo ? <span className="font-medium text-stone-700">{arquivo.name}</span> : "Clique para escolher o arquivo CSV"}
              <input type="file" accept=".csv" onChange={onSelecionarArquivo} className="hidden" />
            </label>

            {erroArquivo && (
              <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {erroArquivo}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">Cancelar</button>
              <button onClick={processar} disabled={!arquivo} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ background: ACCENT }}>
                <UploadCloud className="h-4 w-4" /> Processar arquivo
              </button>
            </div>
          </>
        )}

        {resultado && (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-emerald-50 py-2">
                <div className="text-lg font-bold tabular-nums text-emerald-600">{resultado.importados.length}</div>
                <div className="text-[11px] text-emerald-600">importados</div>
              </div>
              <div className="rounded-lg bg-amber-50 py-2">
                <div className="text-lg font-bold tabular-nums text-amber-600">{resultado.ignorados.length}</div>
                <div className="text-[11px] text-amber-600">ignorados (duplicata)</div>
              </div>
              <div className="rounded-lg bg-red-50 py-2">
                <div className="text-lg font-bold tabular-nums text-red-600">{resultado.erros.length}</div>
                <div className="text-[11px] text-red-600">com erro</div>
              </div>
            </div>

            {resultado.ignorados.length > 0 && (
              <div className="mt-3 rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
                <div className="font-semibold text-stone-600">Ignorados (já existiam):</div>
                {resultado.ignorados.map((x, i) => <div key={i}>linha {x.linha} — "{x.nome}"</div>)}
              </div>
            )}
            {resultado.erros.length > 0 && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-600">
                <div className="font-semibold">Erros:</div>
                {resultado.erros.map((x, i) => <div key={i}>linha {x.linha} — {x.motivo}</div>)}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">Fechar sem salvar</button>
              <button onClick={confirmar} disabled={resultado.importados.length === 0} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ background: ACCENT }}>
                <Check className="h-4 w-4" /> Confirmar importação ({resultado.importados.length})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
