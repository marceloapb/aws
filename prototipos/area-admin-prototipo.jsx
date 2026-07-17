import React, { useState } from "react";
import {
  Camera, LayoutDashboard, FileText, Calendar, Package, CreditCard, Images,
  Users, Star, Settings, Bell, Search, Menu, ChevronRight, Clock, MapPin,
  AlertTriangle, FileSignature, DollarSign, Upload, LogOut, X, Instagram
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Área Logada do Admin (a casca do sistema)
// Navegação lateral entre todos os módulos + Dashboard focado em
// PRÓXIMOS EVENTOS e PENDÊNCIAS (o que o ADM vê ao logar).
// Os módulos em si já são protótipos próprios; aqui é o esqueleto
// que os une. Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

const MENU = [
  { id: "dashboard", nome: "Dashboard", icon: LayoutDashboard },
  { id: "orcamentos", nome: "Orçamentos", icon: FileText },
  { id: "agenda", nome: "Agenda", icon: Calendar },
  { id: "clientes", nome: "Clientes", icon: Users },
  { id: "catalogo", nome: "Catálogo", icon: Package },
  { id: "pagamentos", nome: "Pagamentos", icon: CreditCard },
  { id: "albuns", nome: "Álbuns", icon: Images },
  { id: "feedback", nome: "Feedback", icon: Star },
  { id: "instagram", nome: "Instagram", icon: Instagram },
  { id: "config", nome: "Configurações", icon: Settings },
];

const PROXIMOS_EVENTOS = [
  { id: 1, nome: "Casamento Marina & Rafael", data: "12/12/2026", hora: "16:00", local: "Espaço Villa Garden", dias: 5, tipo: "Casamento" },
  { id: 2, nome: "Aniversário 15 anos — Júlia", data: "18/12/2026", hora: "20:00", local: "Buffet Estrela", dias: 11, tipo: "Aniversário" },
  { id: 3, nome: "Ensaio Gestante — Camila", data: "22/12/2026", hora: "09:00", local: "Parque Ibirapuera", dias: 15, tipo: "Ensaio" },
  { id: 4, nome: "Batizado — Família Souza", data: "10/01/2027", hora: "10:00", local: "Igreja São Pedro", dias: 34, tipo: "Batizado" },
];

const PENDENCIAS = [
  { id: 1, tipo: "orcamento", texto: "Orçamento de Fernanda aguardando você enviar as opções", tempo: "há 2 dias", icon: FileText, cor: "#B45309", modulo: "orcamentos" },
  { id: 2, tipo: "contrato", texto: "Contrato do Casamento Marina & Rafael não foi assinado", tempo: "há 1 dia", icon: FileSignature, cor: "#B45309", modulo: "orcamentos" },
  { id: 3, tipo: "pagamento", texto: "Pagamento da Família Souza está atrasado (R$ 760)", tempo: "venceu 15/06", icon: DollarSign, cor: "#B91C1C", modulo: "pagamentos" },
  { id: 4, tipo: "album", texto: "Álbum do Ensaio Costa pronto para publicar", tempo: "há 3 dias", icon: Upload, cor: "#047857", modulo: "albuns" },
  { id: 5, tipo: "feedback", texto: "2 avaliações novas aguardando sua curadoria", tempo: "há 4 dias", icon: Star, cor: ACCENT, modulo: "feedback" },
];

export default function AreaAdmin() {
  const [ativo, setAtivo] = useState("dashboard");
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="flex min-h-screen bg-stone-50 text-stone-900">
      {/* sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 transform border-r border-stone-200 bg-white transition-transform lg:static lg:translate-x-0 ${menuAberto ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
            <Camera className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight">Marcelo Bloise</span>
        </div>
        <nav className="p-3">
          {MENU.map((m) => {
            const Icon = m.icon; const on = ativo === m.id;
            return (
              <button key={m.id} onClick={() => { setAtivo(m.id); setMenuAberto(false); }}
                className={`mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${on ? "text-white" : "text-stone-600 hover:bg-stone-100"}`}
                style={on ? { background: ACCENT } : {}}>
                <Icon className="h-4 w-4" /> {m.nome}
              </button>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-full border-t border-stone-100 p-3">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-100">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {menuAberto && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMenuAberto(false)} />}

      {/* conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* topbar */}
        <header className="flex items-center gap-3 border-b border-stone-200 bg-white px-5 py-3">
          <button onClick={() => setMenuAberto(true)} className="lg:hidden"><Menu className="h-5 w-5 text-stone-500" /></button>
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-stone-100 px-3 py-1.5 sm:max-w-xs">
            <Search className="h-4 w-4 text-stone-400" />
            <input placeholder="Buscar cliente, evento…" className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative">
              <Bell className="h-5 w-5 text-stone-400" />
              <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2 rounded-full" style={{ background: ACCENT }} />
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-600">MB</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {ativo === "dashboard" ? <Dashboard irPara={setAtivo} /> : <ModuloPlaceholder id={ativo} />}
        </main>
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────

function Dashboard({ irPara }) {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">Bom dia, Marcelo 👋</h1>
      <p className="mt-1 text-sm text-stone-500">Aqui está o que precisa da sua atenção hoje.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* pendências */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold tracking-tight">
              <AlertTriangle className="h-4 w-4" style={{ color: ACCENT }} /> Pendências
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">{PENDENCIAS.length}</span>
            </h2>
          </div>
          <div className="space-y-2">
            {PENDENCIAS.map((p) => {
              const Icon = p.icon;
              return (
                <button key={p.id} onClick={() => irPara(p.modulo)} className="flex w-full items-start gap-3 rounded-xl border border-stone-200 bg-white p-3.5 text-left transition hover:border-orange-300">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: p.cor + "15" }}>
                    <Icon className="h-4 w-4" style={{ color: p.cor }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm leading-snug">{p.texto}</div>
                    <div className="mt-0.5 text-xs text-stone-400">{p.tempo}</div>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-stone-300" />
                </button>
              );
            })}
          </div>
        </section>

        {/* próximos eventos */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold tracking-tight">
              <Calendar className="h-4 w-4" style={{ color: ACCENT }} /> Próximos eventos
            </h2>
            <button onClick={() => irPara("agenda")} className="text-xs font-medium text-orange-600 hover:text-orange-700">Ver agenda →</button>
          </div>
          <div className="space-y-2">
            {PROXIMOS_EVENTOS.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3.5">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg" style={{ background: ACCENT + "12" }}>
                  <span className="text-[10px] font-medium uppercase" style={{ color: ACCENT }}>{e.data.slice(3, 5)}/{e.data.slice(0, 2)}</span>
                  <span className="text-xs font-bold" style={{ color: ACCENT }}>{e.dias}d</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{e.nome}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-stone-400">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {e.data} · {e.hora}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.local}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Placeholder de módulo (cada um já é um protótipo próprio) ──

function ModuloPlaceholder({ id }) {
  const m = MENU.find((x) => x.id === id);
  const Icon = m.icon;
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: ACCENT + "12" }}>
        <Icon className="h-8 w-8" style={{ color: ACCENT }} />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{m.nome}</h1>
      <p className="mt-2 max-w-md text-sm text-stone-500">
        Este módulo já foi construído como protótipo próprio. Aqui na área logada, ele apareceria integrado neste espaço — a navegação lateral é a casca que une todos os módulos do sistema.
      </p>
    </div>
  );
}
