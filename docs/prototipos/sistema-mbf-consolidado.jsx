import React, { useState } from "react";
import {
  Camera, User, Layers, Home, Image, Newspaper, FileText, Calendar, CreditCard,
  DollarSign, Star, Settings, Instagram, Bell, ChevronRight, Package,
  Eye, Heart, MessageCircle, Bookmark, TrendingUp, Share2, Clock, CheckCircle2,
  Sparkles, Layout, Download, ArrowLeft, ArrowRight, MapPin, FileSignature,
  AlertTriangle, Images, Send
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// SISTEMA MBF — Protótipo consolidado com NAVEGAÇÃO REAL
// N1: elos entre telas do menu (ex.: "Publicar Instagram" no álbum
//     leva à tela Instagram; "Assinar contrato" na área do cliente
//     leva à tela Contrato).
// N2: abrir detalhe em cards principais (orçamento, contrato, álbum,
//     evento) — voltar retorna à listagem.
// Estado compartilhado entre visões pra simular o ciclo cliente↔admin.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const G = [
  "linear-gradient(135deg,#a8c0ff,#3f2b96)", "linear-gradient(135deg,#f6d365,#fda085)",
  "linear-gradient(135deg,#84fab0,#8fd3f4)", "linear-gradient(135deg,#fccb90,#d57eeb)",
  "linear-gradient(135deg,#e0c3fc,#8ec5fc)", "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#5ee7df,#b490ca)", "linear-gradient(135deg,#c79081,#dfa579)",
  "linear-gradient(135deg,#fa709a,#fee140)", "linear-gradient(135deg,#30cfd0,#330867)",
  "linear-gradient(135deg,#667eea,#764ba2)", "linear-gradient(135deg,#f77062,#fe5196)",
];

// dados-mock compartilhados (simulando o ciclo cliente↔admin)
const ORCAMENTOS = [
  { id: 1, cliente: "Marina & Rafael", evento: "Casamento", data: "12/12/2026", local: "Villa Garden", valor: "R$ 8.500", status: "Aceito" },
  { id: 2, cliente: "Família Costa", evento: "Ensaio", data: "20/07/2026", local: "Estúdio", valor: "R$ 1.200", status: "Em negociação" },
  { id: 3, cliente: "Júlia", evento: "15 anos", data: "15/09/2026", local: "Salão Real", valor: "R$ 4.800", status: "Enviado" },
];
const ALBUNS = [
  { id: 1, titulo: "Casamento Marina & Rafael", fotos: 342, status: "Entregue", cliente: "Marina & Rafael", data: "12/12/2026" },
  { id: 2, titulo: "Ensaio Família Costa", fotos: 87, status: "Em edição", cliente: "Família Costa", data: "20/07/2026" },
  { id: 3, titulo: "15 anos Júlia", fotos: 210, status: "Entregue", cliente: "Júlia", data: "15/09/2026" },
];
const EVENTOS = [
  { id: 1, dia: 12, mes: "07", hora: "17h", cliente: "Marina & Rafael", tipo: "Casamento", local: "Villa Garden" },
  { id: 2, dia: 15, mes: "07", hora: "10h", cliente: "Família Costa", tipo: "Ensaio", local: "Estúdio" },
  { id: 3, dia: 20, mes: "07", hora: "20h", cliente: "Júlia", tipo: "15 anos", local: "Salão Real" },
];

export default function SistemaMBF() {
  const [visao, setVisao] = useState("cliente");
  const [telaCli, setTelaCli] = useState("site");
  const [telaAdm, setTelaAdm] = useState("dashboard");
  // detalhes (N2)
  const [orcamentoAberto, setOrcamentoAberto] = useState(null);
  const [albumAberto, setAlbumAberto] = useState(null);
  const [eventoAberto, setEventoAberto] = useState(null);

  const irPara = (visaoNova, telaNova) => {
    setVisao(visaoNova);
    if (visaoNova === "cliente") setTelaCli(telaNova);
    else setTelaAdm(telaNova);
    setOrcamentoAberto(null); setAlbumAberto(null); setEventoAberto(null);
  };

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <button onClick={() => irPara(visao, visao === "cliente" ? "site" : "dashboard")} className="flex items-center gap-2 hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><Camera className="h-4 w-4 text-white" /></div>
            <span className="text-sm font-bold tracking-tight">SISTEMA MBF</span>
          </button>
          <div className="flex gap-1 rounded-lg bg-stone-100 p-1">
            {[["cliente", "Visão Cliente", User], ["admin", "Visão Admin", Layers]].map(([k, r, Icon]) => (
              <button key={k} onClick={() => irPara(k, k === "cliente" ? telaCli : telaAdm)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${visao === k ? "bg-white shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
                style={visao === k ? { color: ACCENT } : {}}>
                <Icon className="h-3.5 w-3.5" /> {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visao === "cliente"
        ? <VisaoCliente tela={telaCli} setTela={setTelaCli} irPara={irPara} />
        : <VisaoAdmin tela={telaAdm} setTela={setTelaAdm} irPara={irPara}
            orcamentoAberto={orcamentoAberto} setOrcamentoAberto={setOrcamentoAberto}
            albumAberto={albumAberto} setAlbumAberto={setAlbumAberto}
            eventoAberto={eventoAberto} setEventoAberto={setEventoAberto} />}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// VISÃO CLIENTE
// ═════════════════════════════════════════════════════════════

function VisaoCliente({ tela, setTela, irPara }) {
  const telas = [
    { id: "site", nome: "Site público", icon: Home },
    { id: "portfolio", nome: "Portfólio", icon: Image },
    { id: "novidades", nome: "Novidades", icon: Newspaper },
    { id: "orcamento", nome: "Solicitar orçamento", icon: FileText },
    { id: "central", nome: "Área do cliente", icon: User },
    { id: "contrato", nome: "Contrato", icon: FileSignature },
    { id: "pagamento", nome: "Pagamento", icon: CreditCard },
    { id: "vitrine", nome: "Vitrine do álbum", icon: Images },
    { id: "feedback", nome: "Deixar feedback", icon: Star },
  ];
  return (
    <div className="mx-auto flex max-w-6xl gap-4 px-6 py-6">
      <aside className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-20 space-y-1">
          {telas.map((t) => <NavItem key={t.id} t={t} on={tela === t.id} onClick={() => setTela(t.id)} />)}
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        {tela === "site" && <ClienteSite setTela={setTela} />}
        {tela === "portfolio" && <ClientePortfolio setTela={setTela} />}
        {tela === "novidades" && <ClienteNovidades />}
        {tela === "orcamento" && <ClienteOrcamento irPara={irPara} setTela={setTela} />}
        {tela === "central" && <ClienteCentral setTela={setTela} />}
        {tela === "contrato" && <ClienteContrato setTela={setTela} />}
        {tela === "pagamento" && <ClientePagamento setTela={setTela} />}
        {tela === "vitrine" && <ClienteVitrine setTela={setTela} />}
        {tela === "feedback" && <ClienteFeedback setTela={setTela} />}
      </main>
    </div>
  );
}

function NavItem({ t, on, onClick }) {
  return (
    <button onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${on ? "text-white" : "text-stone-600 hover:bg-white"}`}
      style={on ? { background: ACCENT } : {}}>
      <t.icon className="h-4 w-4" /> {t.nome}
    </button>
  );
}

function ClienteSite({ setTela }) {
  return (
    <Tela titulo="Site público" sub="A porta de entrada: home, portfólio, novidades, contato. Captação de leads.">
      <div className="overflow-hidden rounded-2xl" style={{ background: G[10], height: 240 }}>
        <div className="flex h-full items-end p-6">
          <div className="text-white">
            <div className="text-xs uppercase tracking-widest opacity-80">Marcelo Bloise Fotografia</div>
            <h2 className="mt-1 text-3xl font-bold">Momentos que ficam</h2>
            <button onClick={() => setTela("orcamento")} className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-semibold hover:opacity-90" style={{ color: ACCENT }}>Solicitar orçamento →</button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {G.slice(0, 4).map((g, i) => (
          <button key={i} onClick={() => setTela("portfolio")} className="aspect-square rounded-lg transition hover:scale-105" style={{ background: g }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 pt-2">
        <button onClick={() => setTela("portfolio")} className="rounded-lg border border-stone-200 bg-white p-4 text-left hover:bg-stone-50">
          <Image className="mb-2 h-5 w-5" style={{ color: ACCENT }} />
          <div className="text-sm font-semibold">Portfólio</div>
          <div className="text-xs text-stone-500">Ver trabalhos</div>
        </button>
        <button onClick={() => setTela("novidades")} className="rounded-lg border border-stone-200 bg-white p-4 text-left hover:bg-stone-50">
          <Newspaper className="mb-2 h-5 w-5" style={{ color: ACCENT }} />
          <div className="text-sm font-semibold">Novidades</div>
          <div className="text-xs text-stone-500">Blog e dicas</div>
        </button>
        <button onClick={() => setTela("orcamento")} className="rounded-lg border border-stone-200 bg-white p-4 text-left hover:bg-stone-50">
          <FileText className="mb-2 h-5 w-5" style={{ color: ACCENT }} />
          <div className="text-sm font-semibold">Orçamento</div>
          <div className="text-xs text-stone-500">Fale conosco</div>
        </button>
      </div>
    </Tela>
  );
}

function ClientePortfolio({ setTela }) {
  const cats = ["Casamento", "Ensaio", "15 anos", "Corporativo"];
  const [c, setC] = useState(cats[0]);
  return (
    <Tela titulo="Portfólio público" sub="Categorias com fotos selecionadas. Gostou? Peça orçamento.">
      <div className="flex flex-wrap gap-2">
        {cats.map((x) => (
          <button key={x} onClick={() => setC(x)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${c === x ? "text-white" : "bg-white text-stone-500 ring-1 ring-stone-200"}`} style={c === x ? { background: ACCENT } : {}}>{x}</button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {G.map((g, i) => <div key={i} className="aspect-square rounded-lg" style={{ background: g }} />)}
      </div>
      <button onClick={() => setTela("orcamento")} className="mt-4 w-full rounded-xl py-3 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
        Gostou? Solicite seu orçamento →
      </button>
    </Tela>
  );
}

function ClienteNovidades() {
  return (
    <Tela titulo="Novidades" sub="Blog/publicações do estúdio — SEO e engajamento.">
      {[
        { t: "5 dicas para o ensaio pré-casamento", d: "há 3 dias", g: G[0] },
        { t: "Casamento no Villa Garden — bastidores", d: "há 2 semanas", g: G[3] },
      ].map((n, i) => (
        <button key={i} className="flex w-full gap-4 rounded-xl border border-stone-200 bg-white p-3 text-left hover:bg-stone-50">
          <div className="h-20 w-28 shrink-0 rounded-lg" style={{ background: n.g }} />
          <div>
            <h3 className="font-semibold">{n.t}</h3>
            <p className="mt-1 text-xs text-stone-400">{n.d}</p>
            <p className="mt-2 text-sm text-stone-600">Resumo curto do post que atrai o clique para leitura completa…</p>
          </div>
        </button>
      ))}
    </Tela>
  );
}

function ClienteOrcamento({ setTela }) {
  const [step, setStep] = useState(1);
  return (
    <Tela titulo="Solicitar orçamento" sub="Fluxo 4 etapas: cadastro → tipo → detalhes → aguardar proposta.">
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "" : "bg-stone-200"}`} style={s <= step ? { background: ACCENT } : {}} />
        ))}
      </div>
      {step === 1 && <Bloco titulo="1. Identifique-se"><Campo label="Nome" v="Marina Silva" /><Campo label="E-mail" v="marina@email.com" /><Campo label="WhatsApp" v="(11) 99999-9999" /></Bloco>}
      {step === 2 && <Bloco titulo="2. Tipo de evento">{["Casamento", "Ensaio", "15 anos", "Corporativo"].map((x) => <button key={x} onClick={() => setStep(3)} className="block w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-left text-sm hover:bg-stone-50">{x}</button>)}</Bloco>}
      {step === 3 && <Bloco titulo="3. Detalhes"><Campo label="Data prevista" v="12/12/2026" /><Campo label="Local" v="Villa Garden — SP" /><Campo label="Observações" v="Cerimônia às 17h" area /></Bloco>}
      {step === 4 && (
        <div className="space-y-3">
          <div className="rounded-xl bg-emerald-50 p-5 text-sm text-emerald-700">
            <CheckCircle2 className="mb-2 h-6 w-6" /> Solicitação enviada! Você receberá a proposta em até 48h.
          </div>
          <button onClick={() => setTela("central")} className="w-full rounded-xl py-3 text-sm font-semibold text-white" style={{ background: ACCENT }}>
            Ir para minha área do cliente →
          </button>
        </div>
      )}
      {step < 4 && (
        <div className="flex justify-between">
          <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-stone-500 disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Voltar</button>
          <button onClick={() => setStep(step + 1)} className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: ACCENT }}>{step === 3 ? "Enviar" : "Continuar"} <ArrowRight className="h-4 w-4" /></button>
        </div>
      )}
    </Tela>
  );
}

function ClienteCentral({ setTela }) {
  return (
    <Tela titulo="Área do cliente" sub="Painel do cliente logado. Clique em cada card para agir.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { t: "Orçamento", v: "Aceito", icon: FileText, ir: null },
          { t: "Contrato", v: "Assinar →", icon: FileSignature, ir: "contrato" },
          { t: "Pagamento", v: "1/3 pago →", icon: CreditCard, ir: "pagamento" },
          { t: "Álbum", v: "Ver →", icon: Images, ir: "vitrine" },
        ].map((c) => (
          <button key={c.t} onClick={() => c.ir && setTela(c.ir)} disabled={!c.ir}
            className={`rounded-xl border border-stone-200 bg-white p-3 text-left transition ${c.ir ? "hover:border-orange-300 hover:shadow-sm" : "opacity-60"}`}>
            <c.icon className="h-4 w-4 text-stone-400" />
            <div className="mt-2 text-xs text-stone-500">{c.t}</div>
            <div className="mt-0.5 text-sm font-semibold">{c.v}</div>
          </button>
        ))}
      </div>
      <Bloco titulo="Próximas ações">
        <button onClick={() => setTela("contrato")} className="flex w-full items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-left text-sm hover:bg-amber-100">
          <span className="flex items-center gap-2"><FileSignature className="h-4 w-4 text-amber-600" /> Assinar contrato do Casamento</span>
          <ChevronRight className="h-4 w-4 text-amber-600" />
        </button>
        <button onClick={() => setTela("pagamento")} className="flex w-full items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-left text-sm hover:bg-blue-100">
          <span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-blue-600" /> Parcela 2/3 vence em 12/09</span>
          <ChevronRight className="h-4 w-4 text-blue-600" />
        </button>
        <button onClick={() => setTela("vitrine")} className="flex w-full items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-left text-sm hover:bg-emerald-100">
          <span className="flex items-center gap-2"><Images className="h-4 w-4 text-emerald-600" /> Álbum pronto — ver fotos</span>
          <ChevronRight className="h-4 w-4 text-emerald-600" />
        </button>
      </Bloco>
      <Bloco titulo="Meus dados">
        <Campo label="Nome" v="Marina Silva" />
        <Campo label="CPF/CNPJ" v="123.456.789-00" />
        <Campo label="CEP" v="04567-000" />
      </Bloco>
    </Tela>
  );
}

function ClienteContrato({ setTela }) {
  const [assinado, setAssinado] = useState(false);
  return (
    <Tela titulo="Contrato" sub="Leitura + assinatura eletrônica (registro de IP e data).">
      <button onClick={() => setTela("central")} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"><ArrowLeft className="h-4 w-4" /> voltar à área do cliente</button>
      <div className="rounded-xl border border-stone-200 bg-white p-5 text-sm leading-relaxed">
        <h3 className="font-bold">Contrato de Prestação de Serviços Fotográficos</h3>
        <p className="mt-3 text-stone-600"><strong>Contratante:</strong> Marina Silva</p>
        <p className="text-stone-600"><strong>Contratado:</strong> Marcelo Bloise Fotografia — CNPJ 37.476.502/0001-01</p>
        <p className="mt-3 text-stone-600"><strong>Objeto:</strong> Cobertura fotográfica do casamento em 12/12/2026…</p>
        <p className="mt-2 text-stone-400">[texto completo do contrato]</p>
      </div>
      {assinado ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" /> Contrato assinado! Próximo passo: pagamento da entrada.
          </div>
          <button onClick={() => setTela("pagamento")} className="w-full rounded-xl py-3 text-sm font-semibold text-white" style={{ background: ACCENT }}>
            Ir para pagamento →
          </button>
        </div>
      ) : (
        <button onClick={() => setAssinado(true)} className="w-full rounded-xl py-3 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>Aceito os termos e assino digitalmente</button>
      )}
    </Tela>
  );
}

function ClientePagamento({ setTela }) {
  return (
    <Tela titulo="Pagamento" sub="Parcelas com status. Pix, boleto ou cartão.">
      <button onClick={() => setTela("central")} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"><ArrowLeft className="h-4 w-4" /> voltar à área do cliente</button>
      {[
        { p: "Entrada (30%)", v: "R$ 2.550,00", s: "pago", d: "Pago em 15/06" },
        { p: "Parcela 2/3", v: "R$ 2.975,00", s: "pendente", d: "Vence 12/09" },
        { p: "Parcela 3/3", v: "R$ 2.975,00", s: "futuro", d: "Vence 12/12" },
      ].map((x, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4">
          <div>
            <div className="text-sm font-semibold">{x.p}</div>
            <div className="text-xs text-stone-400">{x.d}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold tabular-nums">{x.v}</div>
            {x.s === "pago" && <span className="text-xs text-emerald-600">✓ Pago</span>}
            {x.s === "pendente" && <button className="rounded-lg px-3 py-1 text-xs font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>Pagar</button>}
            {x.s === "futuro" && <span className="text-xs text-stone-400">A vencer</span>}
          </div>
        </div>
      ))}
    </Tela>
  );
}

function ClienteVitrine({ setTela }) {
  return (
    <Tela titulo="Vitrine do álbum" sub="Fotos entregues. Baixar, favoritar, compartilhar.">
      <button onClick={() => setTela("central")} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"><ArrowLeft className="h-4 w-4" /> voltar à área do cliente</button>
      <div className="rounded-2xl bg-stone-900 p-4">
        <div className="text-center text-white">
          <h2 className="text-xl font-bold">Casamento Marina & Rafael</h2>
          <p className="text-xs text-stone-400">12/12/2026 · Villa Garden</p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {G.map((g, i) => <button key={i} className="aspect-square rounded transition hover:scale-105" style={{ background: g }} />)}
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <button className="flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold"><Download className="h-3.5 w-3.5" /> Baixar tudo</button>
          <button className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white"><Share2 className="h-3.5 w-3.5" /> Compartilhar</button>
        </div>
      </div>
      <button onClick={() => setTela("feedback")} className="w-full rounded-xl py-3 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
        Deixar meu feedback →
      </button>
    </Tela>
  );
}

function ClienteFeedback({ setTela }) {
  const [n, setN] = useState(5);
  const [enviado, setEnviado] = useState(false);
  return (
    <Tela titulo="Deixar feedback" sub="Depois da entrega, o cliente avalia. Nota + texto.">
      <button onClick={() => setTela("vitrine")} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"><ArrowLeft className="h-4 w-4" /> voltar à vitrine</button>
      {enviado ? (
        <div className="rounded-xl bg-emerald-50 p-5 text-sm text-emerald-700">
          <CheckCircle2 className="mb-2 h-6 w-6" /> Feedback enviado! Obrigado por compartilhar sua experiência.
        </div>
      ) : (
        <Bloco titulo="Como foi sua experiência?">
          <div className="flex gap-1">{[1, 2, 3, 4, 5].map((s) => <button key={s} onClick={() => setN(s)}><Star className="h-8 w-8" style={{ color: s <= n ? "#f59e0b" : "#e7e5e4", fill: s <= n ? "#f59e0b" : "none" }} /></button>)}</div>
          <textarea rows={4} className="w-full rounded-lg border border-stone-300 p-3 text-sm" placeholder="Conte como foi o trabalho…" defaultValue="Trabalho impecável, tudo perfeito!" />
          <button onClick={() => setEnviado(true)} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: ACCENT }}>Enviar feedback</button>
        </Bloco>
      )}
    </Tela>
  );
}

// ═════════════════════════════════════════════════════════════
// VISÃO ADMIN
// ═════════════════════════════════════════════════════════════

function VisaoAdmin({ tela, setTela, irPara, orcamentoAberto, setOrcamentoAberto, albumAberto, setAlbumAberto, eventoAberto, setEventoAberto }) {
  const telas = [
    { id: "dashboard", nome: "Dashboard", icon: Home },
    { id: "catalogo", nome: "Catálogo", icon: Package },
    { id: "orcamento", nome: "Orçamentos", icon: FileText },
    { id: "agenda", nome: "Agenda", icon: Calendar },
    { id: "contratos", nome: "Contratos", icon: FileSignature },
    { id: "pagamentos", nome: "Pagamentos", icon: DollarSign },
    { id: "albuns", nome: "Álbuns", icon: Images },
    { id: "portfolio", nome: "Portfólio", icon: Image },
    { id: "novidades", nome: "Novidades", icon: Newspaper },
    { id: "feedback", nome: "Feedback", icon: Star },
    { id: "instagram", nome: "Instagram", icon: Instagram },
    { id: "config", nome: "Configurações", icon: Settings },
  ];
  return (
    <div className="mx-auto flex max-w-6xl gap-4 px-6 py-6">
      <aside className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-20 space-y-0.5">
          {telas.map((t) => <NavItem key={t.id} t={t} on={tela === t.id} onClick={() => { setTela(t.id); setOrcamentoAberto(null); setAlbumAberto(null); setEventoAberto(null); }} />)}
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        {tela === "dashboard" && <AdminDashboard setTela={setTela} />}
        {tela === "catalogo" && <AdminCatalogo />}
        {tela === "orcamento" && (orcamentoAberto ? <AdminOrcamentoDetalhe o={orcamentoAberto} voltar={() => setOrcamentoAberto(null)} irContrato={() => { setOrcamentoAberto(null); setTela("contratos"); }} /> : <AdminOrcamentos abrir={setOrcamentoAberto} />)}
        {tela === "agenda" && (eventoAberto ? <AdminEventoDetalhe e={eventoAberto} voltar={() => setEventoAberto(null)} irAlbum={() => { setEventoAberto(null); setTela("albuns"); }} /> : <AdminAgenda abrir={setEventoAberto} />)}
        {tela === "contratos" && <AdminContratos />}
        {tela === "pagamentos" && <AdminPagamentos />}
        {tela === "albuns" && (albumAberto ? <AdminAlbumDetalhe a={albumAberto} voltar={() => setAlbumAberto(null)} irInstagram={() => { setAlbumAberto(null); setTela("instagram"); }} /> : <AdminAlbuns abrir={setAlbumAberto} />)}
        {tela === "portfolio" && <AdminPortfolio />}
        {tela === "novidades" && <AdminNovidades />}
        {tela === "feedback" && <AdminFeedback />}
        {tela === "instagram" && <AdminInstagram />}
        {tela === "config" && <AdminConfig />}
      </main>
    </div>
  );
}

function AdminDashboard({ setTela }) {
  return (
    <Tela titulo="Dashboard" sub="Visão geral. Clique nos cards para ir aos módulos.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { t: "Orçamentos abertos", v: "7", ir: "orcamento" },
          { t: "Contratos p/ assinar", v: "2", ir: "contratos" },
          { t: "A receber (mês)", v: "R$ 12.4k", ir: "pagamentos" },
          { t: "Eventos próx. 30d", v: "5", ir: "agenda" },
        ].map((k, i) => (
          <button key={i} onClick={() => setTela(k.ir)} className="rounded-xl border border-stone-200 bg-white p-3 text-left transition hover:border-orange-300 hover:shadow-sm">
            <div className="text-xs text-stone-500">{k.t}</div>
            <div className="mt-1 text-xl font-bold">{k.v}</div>
          </button>
        ))}
      </div>
      <Bloco titulo="Alertas">
        <button onClick={() => setTela("contratos")} className="flex w-full items-center gap-3 rounded-lg bg-stone-50 px-3 py-2 text-left text-sm hover:bg-stone-100">
          <AlertTriangle className="h-4 w-4" style={{ color: ACCENT }} /> Contrato Marina & Rafael pendente há 5 dias
          <ChevronRight className="ml-auto h-4 w-4 text-stone-400" />
        </button>
        <button onClick={() => setTela("feedback")} className="flex w-full items-center gap-3 rounded-lg bg-stone-50 px-3 py-2 text-left text-sm hover:bg-stone-100">
          <Bell className="h-4 w-4" style={{ color: ACCENT }} /> 2 avaliações novas aguardando curadoria
          <ChevronRight className="ml-auto h-4 w-4 text-stone-400" />
        </button>
        <button onClick={() => setTela("pagamentos")} className="flex w-full items-center gap-3 rounded-lg bg-stone-50 px-3 py-2 text-left text-sm hover:bg-stone-100">
          <Clock className="h-4 w-4" style={{ color: ACCENT }} /> Pagamento vence hoje — Família Costa
          <ChevronRight className="ml-auto h-4 w-4 text-stone-400" />
        </button>
      </Bloco>
    </Tela>
  );
}

function AdminCatalogo() {
  return (
    <Tela titulo="Catálogo" sub="Itens, pacotes e categorias. Base do orçamento.">
      <div className="flex gap-2">{["Itens", "Pacotes", "Categorias"].map((x, i) => <button key={x} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${i === 1 ? "text-white" : "bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-50"}`} style={i === 1 ? { background: ACCENT } : {}}>{x}</button>)}</div>
      {[
        { n: "Pacote Casamento Completo", p: "R$ 8.500", d: "Cobertura 10h + álbum + 300 fotos" },
        { n: "Pacote Ensaio Casal", p: "R$ 1.200", d: "2h + 80 fotos editadas" },
        { n: "Pacote 15 anos Premium", p: "R$ 4.800", d: "8h + álbum + book" },
      ].map((p, i) => (
        <button key={i} className="flex w-full items-start justify-between rounded-xl border border-stone-200 bg-white p-4 text-left hover:bg-stone-50">
          <div><div className="font-semibold">{p.n}</div><div className="mt-1 text-xs text-stone-500">{p.d}</div></div>
          <div className="text-right"><div className="font-bold" style={{ color: ACCENT }}>{p.p}</div><div className="mt-1 text-xs text-stone-500">Editar →</div></div>
        </button>
      ))}
    </Tela>
  );
}

function AdminOrcamentos({ abrir }) {
  return (
    <Tela titulo="Orçamentos" sub="Clique num orçamento para abrir o detalhe.">
      {ORCAMENTOS.map((o) => {
        const cor = o.status === "Aceito" ? "emerald" : o.status === "Em negociação" ? "amber" : "blue";
        return (
          <button key={o.id} onClick={() => abrir(o)} className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white p-4 text-left transition hover:border-orange-300 hover:shadow-sm">
            <div><div className="font-semibold">{o.cliente}</div><div className="mt-0.5 text-xs text-stone-500">{o.evento} · {o.data}</div></div>
            <div className="text-right"><div className="text-sm font-bold">{o.valor}</div><Badge cor={cor}>{o.status}</Badge></div>
          </button>
        );
      })}
    </Tela>
  );
}

function AdminOrcamentoDetalhe({ o, voltar, irContrato }) {
  return (
    <Tela titulo={`Orçamento — ${o.cliente}`} sub={`${o.evento} · ${o.data} · ${o.local}`}>
      <button onClick={voltar} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"><ArrowLeft className="h-4 w-4" /> voltar à lista</button>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi t="Valor" v={o.valor} cor="emerald" />
        <Kpi t="Status" v={o.status} cor="amber" />
      </div>
      <Bloco titulo="Composição">
        <div className="flex justify-between text-sm"><span>Pacote base</span><span className="font-semibold">R$ 6.000</span></div>
        <div className="flex justify-between text-sm"><span>Extras (álbum premium)</span><span className="font-semibold">R$ 1.500</span></div>
        <div className="flex justify-between text-sm"><span>Deslocamento</span><span className="font-semibold">R$ 1.000</span></div>
        <div className="flex justify-between border-t border-stone-200 pt-2 text-sm font-bold"><span>Total</span><span style={{ color: ACCENT }}>{o.valor}</span></div>
      </Bloco>
      {o.status === "Aceito" && (
        <button onClick={irContrato} className="w-full rounded-xl py-3 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
          Gerar contrato para este orçamento →
        </button>
      )}
    </Tela>
  );
}

function AdminAgenda({ abrir }) {
  const dias = Array.from({ length: 30 }, (_, i) => i + 1);
  return (
    <Tela titulo="Agenda" sub="Reservas + sync com Google Calendar. Clique num evento para detalhes.">
      <div className="grid grid-cols-7 gap-1">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <div key={i} className="text-center text-xs text-stone-400">{d}</div>)}
        {dias.map((d) => {
          const evt = EVENTOS.find((e) => e.dia === d);
          return (
            <button key={d} onClick={() => evt && abrir(evt)} disabled={!evt}
              className={`flex aspect-square items-center justify-center rounded text-xs ${evt ? "font-bold text-white transition hover:scale-110" : "bg-white text-stone-500 ring-1 ring-stone-200"}`}
              style={evt ? { background: ACCENT } : {}}>{d}</button>
          );
        })}
      </div>
      <Bloco titulo="Próximos eventos">
        {EVENTOS.map((e) => (
          <button key={e.id} onClick={() => abrir(e)} className="flex w-full items-center gap-3 rounded-lg bg-stone-50 p-3 text-left hover:bg-stone-100">
            <div className="text-center"><div className="text-xs font-bold" style={{ color: ACCENT }}>{e.dia}/{e.mes}</div><div className="text-xs text-stone-400">{e.hora}</div></div>
            <div className="flex-1"><div className="text-sm font-semibold">{e.tipo} — {e.cliente}</div><div className="flex items-center gap-1 text-xs text-stone-500"><MapPin className="h-3 w-3" /> {e.local}</div></div>
            <ChevronRight className="h-4 w-4 text-stone-400" />
          </button>
        ))}
      </Bloco>
    </Tela>
  );
}

function AdminEventoDetalhe({ e, voltar, irAlbum }) {
  return (
    <Tela titulo={`${e.tipo} — ${e.cliente}`} sub={`${e.dia}/${e.mes} às ${e.hora} · ${e.local}`}>
      <button onClick={voltar} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"><ArrowLeft className="h-4 w-4" /> voltar à agenda</button>
      <div className="grid grid-cols-3 gap-3">
        <Kpi t="Cliente" v={e.cliente} cor="emerald" />
        <Kpi t="Local" v={e.local} cor="amber" />
        <Kpi t="Horário" v={e.hora} cor="red" />
      </div>
      <Bloco titulo="Ações">
        <button onClick={irAlbum} className="flex w-full items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-left text-sm hover:bg-stone-100">
          <span className="flex items-center gap-2"><Images className="h-4 w-4" style={{ color: ACCENT }} /> Abrir álbum deste evento</span>
          <ChevronRight className="h-4 w-4 text-stone-400" />
        </button>
        <button className="flex w-full items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-left text-sm hover:bg-stone-100">
          <span className="flex items-center gap-2"><Send className="h-4 w-4" style={{ color: ACCENT }} /> Enviar lembrete ao cliente (WhatsApp)</span>
          <ChevronRight className="h-4 w-4 text-stone-400" />
        </button>
      </Bloco>
    </Tela>
  );
}

function AdminContratos() {
  return (
    <Tela titulo="Contratos" sub="Modelo configurável, geração após aceite, assinatura eletrônica.">
      {[
        { c: "Marina & Rafael", s: "Assinado", d: "Assinado em 20/06 · IP 187.xxx", cor: "emerald" },
        { c: "Família Costa", s: "Aguardando", d: "Enviado há 3 dias", cor: "amber" },
      ].map((x, i) => (
        <button key={i} className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white p-4 text-left hover:bg-stone-50">
          <div><div className="font-semibold">{x.c}</div><div className="mt-0.5 text-xs text-stone-500">{x.d}</div></div>
          <Badge cor={x.cor}>{x.s}</Badge>
        </button>
      ))}
    </Tela>
  );
}

function AdminPagamentos() {
  return (
    <Tela titulo="Pagamentos" sub="Parcelas por contrato, integração com gateway (Pix/boleto/cartão).">
      <div className="grid grid-cols-3 gap-3">
        <Kpi t="Recebido (mês)" v="R$ 8.750" cor="emerald" />
        <Kpi t="A vencer" v="R$ 3.500" cor="amber" />
        <Kpi t="Em atraso" v="R$ 1.750" cor="red" />
      </div>
      <Bloco titulo="Parcelas em aberto">
        {[
          { c: "Marina & Rafael", p: "2/3", v: "R$ 2.975", d: "Vence 12/09" },
          { c: "Família Costa", p: "1/2", v: "R$ 600", d: "Venceu 30/06 — 2 dias" },
        ].map((x, i) => (
          <button key={i} className="flex w-full justify-between rounded-lg bg-stone-50 p-3 text-left text-sm hover:bg-stone-100">
            <div><strong>{x.c}</strong> · parcela {x.p}<div className="text-xs text-stone-500">{x.d}</div></div>
            <div className="font-bold tabular-nums">{x.v}</div>
          </button>
        ))}
      </Bloco>
    </Tela>
  );
}

function AdminAlbuns({ abrir }) {
  return (
    <Tela titulo="Álbuns" sub="Clique num álbum para abrir a gestão e publicar no Instagram.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ALBUNS.map((a, i) => (
          <button key={a.id} onClick={() => abrir(a)} className="overflow-hidden rounded-xl border border-stone-200 bg-white text-left transition hover:border-orange-300 hover:shadow-sm">
            <div className="h-24" style={{ background: G[i] }} />
            <div className="p-3">
              <div className="text-sm font-semibold">{a.titulo}</div>
              <div className="mt-0.5 text-xs text-stone-500">{a.fotos} fotos · {a.status}</div>
              <div className="mt-2 flex items-center gap-1 text-xs font-medium" style={{ color: ACCENT }}>Abrir →</div>
            </div>
          </button>
        ))}
      </div>
    </Tela>
  );
}

function AdminAlbumDetalhe({ a, voltar, irInstagram }) {
  return (
    <Tela titulo={a.titulo} sub={`${a.cliente} · ${a.data} · ${a.fotos} fotos · ${a.status}`}>
      <button onClick={voltar} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"><ArrowLeft className="h-4 w-4" /> voltar à lista</button>
      <div className="grid grid-cols-6 gap-2">
        {G.map((g, i) => <div key={i} className="aspect-square rounded" style={{ background: g }} />)}
      </div>
      <Bloco titulo="Ações do álbum">
        <button onClick={irInstagram} className="flex w-full items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-left text-sm hover:bg-stone-100">
          <span className="flex items-center gap-2"><Instagram className="h-4 w-4" style={{ color: ACCENT }} /> Publicar no Instagram</span>
          <ChevronRight className="h-4 w-4 text-stone-400" />
        </button>
        <button className="flex w-full items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-left text-sm hover:bg-stone-100">
          <span className="flex items-center gap-2"><Share2 className="h-4 w-4" style={{ color: ACCENT }} /> Enviar link da vitrine ao cliente</span>
          <ChevronRight className="h-4 w-4 text-stone-400" />
        </button>
        <button className="flex w-full items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-left text-sm hover:bg-stone-100">
          <span className="flex items-center gap-2"><Image className="h-4 w-4" style={{ color: ACCENT }} /> Selecionar fotos para portfólio</span>
          <ChevronRight className="h-4 w-4 text-stone-400" />
        </button>
      </Bloco>
    </Tela>
  );
}

function AdminPortfolio() {
  return (
    <Tela titulo="Portfólio (admin)" sub="Curadoria das fotos que vão pro portfólio público.">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {G.map((g, i) => (
          <button key={i} className="relative aspect-square rounded-lg transition hover:scale-105" style={{ background: g }}>
            {i < 4 && <div className="absolute inset-0 flex items-end p-1"><span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: ACCENT }}>público</span></div>}
          </button>
        ))}
      </div>
    </Tela>
  );
}

function AdminNovidades() {
  return (
    <Tela titulo="Novidades (admin)" sub="Editor de posts com formatação, capa, publicação agendada.">
      {[
        { t: "5 dicas para o ensaio pré-casamento", s: "Publicado", d: "há 3 dias", cor: "emerald" },
        { t: "Casamento no Villa Garden — bastidores", s: "Publicado", d: "há 2 semanas", cor: "emerald" },
        { t: "Rascunho: Guia de escolha de fotógrafo", s: "Não publicado", d: "atualizado hoje", cor: "stone" },
      ].map((n, i) => (
        <button key={i} className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white p-4 text-left hover:bg-stone-50">
          <div><div className="font-semibold">{n.t}</div><div className="mt-0.5 text-xs text-stone-500">{n.d}</div></div>
          <Badge cor={n.cor}>{n.s}</Badge>
        </button>
      ))}
    </Tela>
  );
}

function AdminFeedback() {
  return (
    <Tela titulo="Feedback (admin)" sub="Curadoria dos depoimentos, aprovação para virarem públicos.">
      {[
        { c: "Marina Silva", n: 5, t: "Trabalho impecável, tudo perfeito!", s: "Aprovado", cor: "emerald" },
        { c: "Família Costa", n: 5, t: "Superou nossas expectativas.", s: "Aguardando", cor: "amber" },
      ].map((f, i) => (
        <div key={i} className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex justify-between">
            <div><div className="text-sm font-semibold">{f.c}</div><div className="mt-0.5 flex">{Array.from({ length: f.n }).map((_, j) => <Star key={j} className="h-3 w-3" style={{ color: "#f59e0b", fill: "#f59e0b" }} />)}</div></div>
            <Badge cor={f.cor}>{f.s}</Badge>
          </div>
          <p className="mt-2 text-sm italic text-stone-600">"{f.t}"</p>
          {f.s === "Aguardando" && (
            <div className="mt-3 flex gap-2">
              <button className="rounded-lg px-3 py-1 text-xs font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>Aprovar</button>
              <button className="rounded-lg px-3 py-1 text-xs font-semibold text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">Rejeitar</button>
            </div>
          )}
        </div>
      ))}
    </Tela>
  );
}

function AdminInstagram() {
  const [aba, setAba] = useState("central");
  return (
    <Tela titulo="Instagram" sub="Central de publicações + Insights + Story com IA.">
      <div className="flex gap-2">
        {[["central", "Central + Insights"], ["story", "Story com IA"]].map(([k, r]) => (
          <button key={k} onClick={() => setAba(k)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${aba === k ? "text-white" : "bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-50"}`} style={aba === k ? { background: ACCENT } : {}}>{r}</button>
        ))}
      </div>
      {aba === "central" ? <InstagramCentralMini /> : <InstagramStoryMini />}
    </Tela>
  );
}

function InstagramCentralMini() {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4" style={{ color: ACCENT }} /><span className="text-sm font-semibold">Últimos 7 dias</span></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricaMini label="Seguidores" v="4,3k" delta="+34" />
          <MetricaMini label="Alcance" v="12,4k" />
          <MetricaMini label="Visitas" v="186" />
          <MetricaMini label="Cliques" v="43" />
        </div>
      </div>
      {[
        { a: "Casamento Marina & Rafael", tipo: "carrossel", l: "Um dia inesquecível…", s: "Publicado 28/06", m: { c: "847", co: "42", al: "5,2k", sv: "68" } },
        { a: "Casamento Marina & Rafael", tipo: "story", modo: "Tpl. Clássico", l: "Marina & Rafael · Villa Garden", s: "Publicado 29/06", ms: { v: "1,2k", r: "18", sa: "62" } },
        { a: "15 anos Júlia", tipo: "story", modo: "IA livre", l: "Júlia · 15 anos", s: "Agendado 03/07", cu: "0,83" },
      ].map((p, i) => (
        <button key={i} className="w-full rounded-xl border border-stone-200 bg-white p-3 text-left hover:bg-stone-50">
          <div className="flex items-center gap-1 text-xs font-medium" style={{ color: ACCENT }}><Camera className="h-3 w-3" /> {p.a}</div>
          <p className="mt-1 text-sm">{p.l}</p>
          <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
            {p.tipo === "story" && <span className="rounded-full bg-purple-50 px-2 py-0.5 font-medium text-purple-700">Story · {p.modo}</span>}
            <span className="text-stone-400">{p.s}</span>
            {p.cu && <span className="text-stone-400">R$ {p.cu}</span>}
          </div>
          {p.m && <div className="mt-2 grid grid-cols-4 gap-2 border-t border-stone-100 pt-2 text-center">
            <div><Heart className="mx-auto h-3 w-3 text-stone-400" /><div className="text-xs font-bold">{p.m.c}</div></div>
            <div><MessageCircle className="mx-auto h-3 w-3 text-stone-400" /><div className="text-xs font-bold">{p.m.co}</div></div>
            <div><Eye className="mx-auto h-3 w-3 text-stone-400" /><div className="text-xs font-bold">{p.m.al}</div></div>
            <div><Bookmark className="mx-auto h-3 w-3 text-stone-400" /><div className="text-xs font-bold">{p.m.sv}</div></div>
          </div>}
          {p.ms && <div className="mt-2 grid grid-cols-3 gap-2 border-t border-stone-100 pt-2 text-center">
            <div><Eye className="mx-auto h-3 w-3 text-stone-400" /><div className="text-xs font-bold">{p.ms.v}</div><div className="text-[9px] uppercase text-stone-400">Views</div></div>
            <div><MessageCircle className="mx-auto h-3 w-3 text-stone-400" /><div className="text-xs font-bold">{p.ms.r}</div><div className="text-[9px] uppercase text-stone-400">Respostas</div></div>
            <div><Share2 className="mx-auto h-3 w-3 text-stone-400" /><div className="text-xs font-bold">{p.ms.sa}</div><div className="text-[9px] uppercase text-stone-400">Saídas</div></div>
          </div>}
        </button>
      ))}
    </div>
  );
}

function InstagramStoryMini() {
  const [modo, setModo] = useState("t1");
  const [gerado, setGerado] = useState(false);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { id: "t1", n: "Clássico", p: "Padrão", g: "#1a1a1a", c: "R$ 0,08" },
          { id: "t2", n: "Minimalista", p: "Template", g: "#f5f5f4", c: "R$ 0,08" },
          { id: "t3", n: "Colorido", p: "Template", g: "linear-gradient(135deg,#EA580C,#DC2626)", c: "R$ 0,08" },
          { id: "ia", n: "IA livre", p: "Arte generativa", g: "linear-gradient(135deg,#EA580C,#f093fb)", c: "R$ 0,83", premium: true },
        ].map((m) => (
          <button key={m.id} onClick={() => { setModo(m.id); setGerado(false); }} className={`relative rounded-xl border-2 p-2 text-left ${modo === m.id ? "" : "border-stone-200 hover:bg-stone-50"}`} style={modo === m.id ? { borderColor: ACCENT } : {}}>
            <div className="h-14 w-full rounded" style={{ background: m.g }} />
            <div className="mt-1.5 flex items-center gap-1">
              {m.id === "ia" ? <Sparkles className="h-3.5 w-3.5" /> : <Layout className="h-3.5 w-3.5" />}
              <span className="text-xs font-semibold">{m.n}</span>
              {m.premium && <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0 text-[8px] font-bold uppercase text-amber-700">P</span>}
            </div>
            <div className="mt-0.5 flex justify-between text-[10px] text-stone-400"><span>{m.p}</span><span>{m.c}</span></div>
          </button>
        ))}
      </div>
      {!gerado ? (
        <button onClick={() => setGerado(true)} className="w-full rounded-xl py-3 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>
          <Sparkles className="mr-1 inline h-4 w-4" /> Gerar Story {modo === "ia" ? "com IA livre" : "com template"}
        </button>
      ) : (
        <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="mb-2 h-5 w-5" /> Story gerado! (mock — no protótipo dedicado <code>instagram-story-ia-prototipo.jsx</code> tem o preview 9:16 completo)
        </div>
      )}
    </div>
  );
}

function AdminConfig() {
  return (
    <Tela titulo="Configurações" sub="Empresa, integrações (gateway, Calendar, IG, WhatsApp), follow-up, prompts de IA.">
      {[
        { t: "Dados da empresa", d: "CNPJ, endereço, marca" },
        { t: "Gateway de pagamento", d: "Mercado Pago · configurado" },
        { t: "Google Calendar", d: "Sincronizado" },
        { t: "Instagram Business", d: "Token válido até 12/2026" },
        { t: "WhatsApp Cloud API", d: "Templates aprovados: 4" },
        { t: "Follow-up automático", d: "5 regras ativas" },
        { t: "Prompts de IA (Stories)", d: "Configuráveis por tipo de evento" },
      ].map((c, i) => (
        <button key={i} className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white p-4 hover:bg-stone-50">
          <div className="text-left"><div className="text-sm font-semibold">{c.t}</div><div className="text-xs text-stone-500">{c.d}</div></div>
          <ChevronRight className="h-4 w-4 text-stone-400" />
        </button>
      ))}
    </Tela>
  );
}

// ── Reutilizáveis ─────────────────────────────────────────────

function Tela({ titulo, sub, children }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
        {sub && <p className="mt-1 text-sm text-stone-500">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function Bloco({ titulo, children }) {
  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      {titulo && <div className="text-sm font-semibold">{titulo}</div>}
      {children}
    </div>
  );
}

function Campo({ label, v, area }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</div>
      {area
        ? <textarea rows={2} defaultValue={v} className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-sm" />
        : <input defaultValue={v} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />}
    </div>
  );
}

function Kpi({ t, v, cor }) {
  const bg = { emerald: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", red: "bg-red-50 text-red-700" }[cor];
  return (
    <div className={`rounded-xl p-3 ${bg}`}>
      <div className="text-xs font-medium">{t}</div>
      <div className="mt-1 text-lg font-bold tabular-nums">{v}</div>
    </div>
  );
}

function Badge({ cor, children }) {
  const bg = { emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", blue: "bg-blue-50 text-blue-600", red: "bg-red-50 text-red-600", stone: "bg-stone-100 text-stone-500" }[cor];
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${bg}`}>{children}</span>;
}

function MetricaMini({ label, v, delta }) {
  return (
    <div className="rounded-lg bg-stone-50 p-2">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1"><span className="text-lg font-bold tabular-nums">{v}</span>{delta && <span className="text-xs font-medium text-emerald-600">{delta}</span>}</div>
    </div>
  );
}
