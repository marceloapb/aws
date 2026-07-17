import React, { useState } from "react";
import { Globe, Image as ImageIcon, Save, Eye, Info, Type, Quote } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — CMS do Site Institucional (§25, fatia 2)
// Edita o TEXTO e as IMAGENS de Início/Sobre/Contato sem precisar de deploy.
// Não edita layout/estrutura da página (isso é fixo) — só o conteúdo dentro
// dela. Portfólio e Novidades ficam fora (já têm CMS próprio, §15). Telefone,
// e-mail, WhatsApp e cidade NÃO estão aqui — já são editáveis em Configurações
// (§9, dados-empresa-prototipo.jsx); duplicar teria dois lugares editando o
// mesmo dado. Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

const CONTEUDO_SEED = {
  inicio: {
    eyebrow: "FOTOGRAFIA AUTORAL · SÃO PAULO",
    headline: "A luz certa\nno instante",
    headlineDestaque: "exato.",
    subheadline: "Casamentos e ensaios registrados como cinema — cada quadro pensado, cada emoção preservada.",
    manifesto: "Não fotografo poses. Fotografo o que é real — o olhar que escapa, o riso que ninguém pediu, o segundo antes do abraço.",
    depoimentoTexto: "Ele não fotografou o nosso casamento. Ele o transformou em memória viva.",
    depoimentoAutor: "MARINA & THIAGO · CASAMENTO",
    ctaTitulo: "Sua história merece\nesse olhar.",
    imagemFundo: null,
  },
  sobre: {
    tituloDestaque: "Sou Marcelo Bloise, fotógrafo em São Paulo.",
    paragrafo1: "Meu trabalho nasce da vontade de contar histórias reais — sem poses forçadas, sem cenas montadas. O que me move é capturar a emoção verdadeira de cada instante: o olhar que escapa, o riso espontâneo, o segundo antes do abraço.",
    paragrafo2: "Cada casal, cada família tem uma história única. Meu papel é estar presente no momento certo, com sensibilidade e técnica, para que você reviva essas emoções sempre que olhar suas fotos.",
    paragrafo3: "Trabalho com um número limitado de eventos por mês, garantindo atenção dedicada e um resultado à altura da confiança que você deposita no meu olhar.",
    estatisticas: [{ numero: "500+", rotulo: "eventos" }, { numero: "10+", rotulo: "anos" }, { numero: "4.9", rotulo: "avaliação" }],
    imagemCapa: null,
  },
  contato: {
    subtitulo: "Prefere conversar? Chame no WhatsApp. Já sabe o que quer? Peça um orçamento.",
    cardWhatsappDesc: "Para dúvidas rápidas e disponibilidade de datas. Resposta direta comigo.",
    cardOrcamentoDesc: "Já decidiu? Crie sua conta e monte um orçamento personalizado — assim capto tudo que preciso pra te atender bem.",
  },
};

export default function SiteCMS() {
  const [pagina, setPagina] = useState("inicio");
  const [conteudo, setConteudo] = useState(CONTEUDO_SEED);
  const [salvo, setSalvo] = useState(false);

  const set = (pag, campo, valor) => { setConteudo((c) => ({ ...c, [pag]: { ...c[pag], [campo]: valor } })); setSalvo(false); };
  const salvar = () => { setSalvo(true); setTimeout(() => setSalvo(false), 2000); };

  const PAGINAS = [["inicio", "Início"], ["sobre", "Sobre"], ["contato", "Contato"]];

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><Globe className="h-4 w-4 text-white" /></div>
            <span className="text-sm font-semibold tracking-tight">Site · Conteúdo (Início, Sobre, Contato)</span>
          </div>
          <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
            <Eye className="h-3.5 w-3.5" /> Ver site público
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Conteúdo do site</h1>
        <p className="mt-1 text-sm text-stone-500">Edite texto e imagens direto aqui — some pro site sem precisar de deploy. Layout da página é fixo; isto edita só o conteúdo dentro dele.</p>

        <div className="mt-5 flex gap-2 border-b border-stone-200">
          {PAGINAS.map(([k, r]) => (
            <button key={k} onClick={() => setPagina(k)} className={`border-b-2 px-3 py-2 text-sm font-semibold transition ${pagina === k ? "" : "border-transparent text-stone-400 hover:text-stone-600"}`}
              style={pagina === k ? { borderColor: ACCENT, color: ACCENT } : {}}>{r}</button>
          ))}
        </div>

        <div className="mt-5">
          {pagina === "inicio" && <FormInicio dados={conteudo.inicio} set={(c, v) => set("inicio", c, v)} />}
          {pagina === "sobre" && <FormSobre dados={conteudo.sobre} set={(c, v) => set("sobre", c, v)} />}
          {pagina === "contato" && <FormContato dados={conteudo.contato} set={(c, v) => set("contato", c, v)} />}
        </div>

        <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Telefone, WhatsApp, e-mail e cidade não estão aqui — já são editáveis em Configurações. Portfólio e Novidades têm CMS próprio.
        </p>

        <div className="sticky bottom-4 mt-6 flex justify-end">
          <button onClick={salvar} className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90" style={{ background: ACCENT }}>
            <Save className="h-4 w-4" /> {salvo ? "Salvo!" : "Salvar alterações"}
          </button>
        </div>
      </main>
    </div>
  );
}

function Campo({ label, children }) {
  return <div className="mb-4"><label className="mb-1.5 block text-xs font-semibold text-stone-600">{label}</label>{children}</div>;
}
const inp = "w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none";
const txt = inp + " resize-none";

function CampoImagem({ label, valor, onChange }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-xs font-semibold text-stone-600">{label}</label>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-300">
          {valor ? <img src={valor} alt="" className="h-full w-full rounded-lg object-cover" /> : <ImageIcon className="h-6 w-6" />}
        </div>
        <button onClick={() => onChange("(imagem enviada — mock)")} className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
          {valor ? "Trocar imagem" : "Enviar imagem"}
        </button>
        {valor && <button onClick={() => onChange(null)} className="text-xs text-red-500 hover:underline">remover</button>}
      </div>
    </div>
  );
}

function FormInicio({ dados, set }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-stone-700"><Type className="h-4 w-4 text-stone-400" /> Seção principal (hero)</div>
      <CampoImagem label="Imagem de fundo do topo" valor={dados.imagemFundo} onChange={(v) => set("imagemFundo", v)} />
      <Campo label="Frase pequena acima do título"><input value={dados.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} className={inp} /></Campo>
      <Campo label="Título principal (use quebra de linha onde quiser)"><textarea value={dados.headline} onChange={(e) => set("headline", e.target.value)} rows={2} className={txt} /></Campo>
      <Campo label="Última palavra do título (destaque em laranja)"><input value={dados.headlineDestaque} onChange={(e) => set("headlineDestaque", e.target.value)} className={inp} /></Campo>
      <Campo label="Frase de apoio abaixo do título"><textarea value={dados.subheadline} onChange={(e) => set("subheadline", e.target.value)} rows={2} className={txt} /></Campo>

      <div className="my-4 border-t border-stone-100" />
      <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-stone-700"><Quote className="h-4 w-4 text-stone-400" /> Manifesto e depoimento</div>
      <Campo label="Frase de manifesto"><textarea value={dados.manifesto} onChange={(e) => set("manifesto", e.target.value)} rows={3} className={txt} /></Campo>
      <Campo label="Depoimento em destaque"><textarea value={dados.depoimentoTexto} onChange={(e) => set("depoimentoTexto", e.target.value)} rows={2} className={txt} /></Campo>
      <Campo label="Assinatura do depoimento"><input value={dados.depoimentoAutor} onChange={(e) => set("depoimentoAutor", e.target.value)} className={inp} /></Campo>

      <div className="my-4 border-t border-stone-100" />
      <Campo label="Título da chamada final (antes do botão de orçamento)"><textarea value={dados.ctaTitulo} onChange={(e) => set("ctaTitulo", e.target.value)} rows={2} className={txt} /></Campo>
    </div>
  );
}

function FormSobre({ dados, set }) {
  const setStat = (i, campo, valor) => {
    const novas = dados.estatisticas.map((s, idx) => idx === i ? { ...s, [campo]: valor } : s);
    set("estatisticas", novas);
  };
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <CampoImagem label="Imagem de capa" valor={dados.imagemCapa} onChange={(v) => set("imagemCapa", v)} />
      <Campo label="Frase de abertura (em destaque)"><input value={dados.tituloDestaque} onChange={(e) => set("tituloDestaque", e.target.value)} className={inp} /></Campo>
      <Campo label="Parágrafo 1"><textarea value={dados.paragrafo1} onChange={(e) => set("paragrafo1", e.target.value)} rows={3} className={txt} /></Campo>
      <Campo label="Parágrafo 2"><textarea value={dados.paragrafo2} onChange={(e) => set("paragrafo2", e.target.value)} rows={3} className={txt} /></Campo>
      <Campo label="Parágrafo 3"><textarea value={dados.paragrafo3} onChange={(e) => set("paragrafo3", e.target.value)} rows={3} className={txt} /></Campo>

      <div className="my-4 border-t border-stone-100" />
      <div className="mb-2 text-xs font-semibold text-stone-600">Números em destaque</div>
      <div className="grid grid-cols-3 gap-2">
        {dados.estatisticas.map((s, i) => (
          <div key={i} className="rounded-lg border border-stone-200 p-2">
            <input value={s.numero} onChange={(e) => setStat(i, "numero", e.target.value)} className="w-full rounded-md border border-stone-200 px-2 py-1 text-center text-sm font-semibold focus:outline-none" />
            <input value={s.rotulo} onChange={(e) => setStat(i, "rotulo", e.target.value)} className="mt-1 w-full rounded-md border border-stone-200 px-2 py-1 text-center text-xs focus:outline-none" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FormContato({ dados, set }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <Campo label="Frase de apoio no topo da página"><textarea value={dados.subtitulo} onChange={(e) => set("subtitulo", e.target.value)} rows={2} className={txt} /></Campo>
      <Campo label='Descrição do card "Conversar no WhatsApp"'><textarea value={dados.cardWhatsappDesc} onChange={(e) => set("cardWhatsappDesc", e.target.value)} rows={2} className={txt} /></Campo>
      <Campo label='Descrição do card "Pedir orçamento"'><textarea value={dados.cardOrcamentoDesc} onChange={(e) => set("cardOrcamentoDesc", e.target.value)} rows={2} className={txt} /></Campo>
    </div>
  );
}
