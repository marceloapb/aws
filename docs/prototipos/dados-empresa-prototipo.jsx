import React, { useState } from "react";
import {
  Camera, Building2, MapPin, Share2, Clock, Image as ImageIcon, Check, Info, Globe
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Dados da Empresa (seção de Configurações do ADM)
// Sem bloco bancário (entra com o módulo Pagamento, feito com o
// devido cuidado de LGPD/segurança). Identidade visual padrão.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const inp = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-stone-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

const mascararCnpj = (v) => v.replace(/\D/g, "").slice(0, 14)
  .replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
  .replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
const mascararCep = (v) => v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
const mascararTel = (v) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const CEPS_DEMO = { "02021020": { rua: "Rua José Margarido", cidade: "São Paulo", uf: "SP" } };

export default function DadosEmpresa() {
  const [f, setF] = useState({
    nome: "Marcelo Bloise Fotografia", cnpj: "37.476.502/0001-01", website: "https://marcelobloisefotografia.com.br",
    descricao: "", logo: null,
    rua: "Rua José Margarido", numero: "185", complemento: "", cep: "02021-020", cidade: "São Paulo", uf: "SP",
    email: "contato@bloise.com.br", telefone: "", whatsapp: "(11) 99471-5161",
    instagram: "https://instagram.com/marceloapb", facebook: "", youtube: "", tiktok: "",
    diasFunc: "", horarioFunc: "",
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const onCep = (v) => {
    const m = mascararCep(v); set("cep", m);
    const d = m.replace(/\D/g, "");
    if (d.length === 8 && CEPS_DEMO[d]) { const r = CEPS_DEMO[d]; setF((p) => ({ ...p, cep: m, rua: r.rua, cidade: r.cidade, uf: r.uf })); }
  };

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}
         className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
            <Camera className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Configurações · Dados da Empresa</span>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Dados da empresa</h1>
        <p className="mt-1 text-sm text-stone-500">
          Usados no rodapé do orçamento, na lista de preços e como ponto de partida para calcular a distância
          até os eventos.
        </p>

        <div className="mt-6 space-y-5">
          {/* Informações principais */}
          <Secao titulo="Informações principais" icon={Building2}>
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="space-y-4">
                <Campo label="Nome da empresa"><input value={f.nome} onChange={(e) => set("nome", e.target.value)} className={inp} /></Campo>
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="CNPJ"><input value={f.cnpj} onChange={(e) => set("cnpj", mascararCnpj(e.target.value))} inputMode="numeric" className={inp} /></Campo>
                  <Campo label="Website"><input value={f.website} onChange={(e) => set("website", e.target.value)} className={inp} placeholder="https://" /></Campo>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">Logo</label>
                <div className="flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 text-stone-400 transition hover:border-orange-300 hover:text-orange-500 cursor-pointer">
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-xs">Enviar</span>
                </div>
              </div>
            </div>
            <Campo label="Descrição (sobre)"><textarea rows={2} value={f.descricao} onChange={(e) => set("descricao", e.target.value)} className={inp} placeholder="Breve descrição sobre o estúdio e o estilo de fotografia." /></Campo>
          </Secao>

          {/* Endereço */}
          <Secao titulo="Endereço" icon={MapPin}>
            <div className="grid grid-cols-3 gap-3">
              <Campo label="CEP"><input value={f.cep} onChange={(e) => onCep(e.target.value)} inputMode="numeric" className={inp} placeholder="00000-000" /></Campo>
              <div className="col-span-2"><Campo label="Rua"><input value={f.rua} onChange={(e) => set("rua", e.target.value)} className={inp} /></Campo></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Campo label="Número"><input value={f.numero} onChange={(e) => set("numero", e.target.value)} className={inp} /></Campo>
              <Campo label="Cidade"><input value={f.cidade} onChange={(e) => set("cidade", e.target.value)} className={inp} /></Campo>
              <Campo label="UF"><input value={f.uf} onChange={(e) => set("uf", e.target.value)} className={inp} maxLength={2} /></Campo>
            </div>
            <Campo label="Complemento"><input value={f.complemento} onChange={(e) => set("complemento", e.target.value)} className={inp} placeholder="Opcional" /></Campo>
            <p className="flex items-start gap-1.5 text-xs text-stone-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Este endereço é a origem usada para calcular a distância até cada evento (visível só para você).
            </p>
          </Secao>

          {/* Contato */}
          <Secao titulo="Contato" icon={Globe}>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="E-mail principal"><input value={f.email} onChange={(e) => set("email", e.target.value)} className={inp} type="email" /></Campo>
              <Campo label="Telefone fixo"><input value={f.telefone} onChange={(e) => set("telefone", mascararTel(e.target.value))} inputMode="numeric" className={inp} placeholder="(11) 0000-0000" /></Campo>
            </div>
            <Campo label="WhatsApp"><input value={f.whatsapp} onChange={(e) => set("whatsapp", mascararTel(e.target.value))} inputMode="numeric" className={inp} placeholder="(11) 99999-9999" /></Campo>
          </Secao>

          {/* Redes sociais (dormem até o site existir) */}
          <Secao titulo="Redes sociais" icon={Share2}
            nota="Ficam guardadas e serão exibidas quando o site público existir.">
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Instagram"><input value={f.instagram} onChange={(e) => set("instagram", e.target.value)} className={inp} placeholder="https://instagram.com/..." /></Campo>
              <Campo label="Facebook"><input value={f.facebook} onChange={(e) => set("facebook", e.target.value)} className={inp} placeholder="https://facebook.com/..." /></Campo>
              <Campo label="YouTube"><input value={f.youtube} onChange={(e) => set("youtube", e.target.value)} className={inp} placeholder="https://youtube.com/..." /></Campo>
              <Campo label="TikTok"><input value={f.tiktok} onChange={(e) => set("tiktok", e.target.value)} className={inp} placeholder="https://tiktok.com/@..." /></Campo>
            </div>
          </Secao>

          {/* Funcionamento (dorme até o site existir) */}
          <Secao titulo="Funcionamento" icon={Clock}
            nota="Também voltado ao site público; sem uso nas telas do MVP atual.">
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Dias de funcionamento"><input value={f.diasFunc} onChange={(e) => set("diasFunc", e.target.value)} className={inp} placeholder="Ex.: Segunda a sexta" /></Campo>
              <Campo label="Horário de atendimento"><input value={f.horarioFunc} onChange={(e) => set("horarioFunc", e.target.value)} className={inp} placeholder="Ex.: 09:00 às 18:00" /></Campo>
            </div>
          </Secao>
        </div>

        <button className="mt-6 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>
          <Check className="h-4 w-4" /> Salvar dados da empresa
        </button>
      </main>
    </div>
  );
}

function Secao({ titulo, icon: Icon, nota, children }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="mb-1 flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: ACCENT }} />
        <h2 className="font-semibold tracking-tight">{titulo}</h2>
      </div>
      {nota && <p className="mb-4 text-xs text-stone-400">{nota}</p>}
      <div className={`space-y-3 ${nota ? "" : "mt-4"}`}>{children}</div>
    </div>
  );
}
function Campo({ label, children }) {
  return <div><label className="mb-1.5 block text-sm font-medium text-stone-700">{label}</label>{children}</div>;
}
