import React, { useState } from "react";
import {
  Bell, Check, Info, Mail, MessageSquare, Monitor, UserCog, User, Users,
  CheckCheck, Dot, Zap, TrendingUp, FileSignature, CreditCard, AlertTriangle,
  ImageIcon, Clock, Star, Filter,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Domínio Notificações (dentro da Área Admin · §14)
// Duas abas:
//   (A) CENTRAL — sininho + lista de notificações in-app do ADMIN (lida/não lida).
//                 In-app é EXCLUSIVO do admin; cliente só recebe por canal externo.
//   (B) REGRAS  — matriz evento × destinatário × canal, com conjunto-padrão
//                 editável (liga/desliga cada célula). É onde "quem + qual canal"
//                 é configurado — nada hardcoded.
// Notificação é fire-and-forget (dispara 1x, sem régua) — a régua/insistência
// é do Follow-up (§20). Canal externo (e-mail/WhatsApp) é a camada compartilhada
// com o Follow-up. Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

// eventos de negócio do ciclo + ícone
const EVENTOS = [
  { id: "lead_novo", label: "Lead novo", icon: TrendingUp },
  { id: "orcamento_aceito", label: "Orçamento aceito", icon: Check },
  { id: "contrato_assinado", label: "Contrato assinado", icon: FileSignature },
  { id: "pagamento_confirmado", label: "Pagamento confirmado", icon: CreditCard },
  { id: "pagamento_atrasado", label: "Pagamento atrasado", icon: AlertTriangle },
  { id: "album_pronto", label: "Álbum publicado / pronto", icon: ImageIcon },
  { id: "album_expirar", label: "Álbum a expirar", icon: Clock },
  { id: "feedback_recebido", label: "Feedback recebido", icon: Star },
  { id: "cliente_respondeu", label: "Cliente respondeu no WhatsApp", icon: MessageSquare },
];

const CANAIS = [
  { id: "in_app", label: "Sininho (admin)", icon: Monitor, dest: "admin" },
  { id: "email_admin", label: "E-mail admin", icon: Mail, dest: "admin" },
  { id: "whats_admin", label: "WhatsApp admin", icon: MessageSquare, dest: "admin" },
  { id: "email_cliente", label: "E-mail cliente", icon: Mail, dest: "cliente" },
  { id: "whats_cliente", label: "WhatsApp cliente", icon: MessageSquare, dest: "cliente" },
];

// conjunto-padrão proposto (editável). true = canal ligado para aquele evento
const REGRAS_SEED = {
  lead_novo:            { in_app: true,  email_admin: false, whats_admin: false, email_cliente: false, whats_cliente: false },
  orcamento_aceito:     { in_app: true,  email_admin: true,  whats_admin: false, email_cliente: false, whats_cliente: false },
  contrato_assinado:    { in_app: true,  email_admin: false, whats_admin: false, email_cliente: true,  whats_cliente: false },
  pagamento_confirmado: { in_app: true,  email_admin: false, whats_admin: false, email_cliente: true,  whats_cliente: true  },
  pagamento_atrasado:   { in_app: true,  email_admin: true,  whats_admin: false, email_cliente: false, whats_cliente: false },
  album_pronto:         { in_app: true,  email_admin: false, whats_admin: false, email_cliente: true,  whats_cliente: true  },
  album_expirar:        { in_app: true,  email_admin: false, whats_admin: false, email_cliente: true,  whats_cliente: false },
  feedback_recebido:    { in_app: true,  email_admin: false, whats_admin: false, email_cliente: false, whats_cliente: false },
  cliente_respondeu:    { in_app: true,  email_admin: true,  whats_admin: true,  email_cliente: false, whats_cliente: false },
};

// notificações in-app mock (do admin)
const NOTIF_SEED = [
  { id: "n1", tipo: "lead_novo", titulo: "Novo lead", corpo: "Marina Souza pediu orçamento de pré-wedding pelo site.", quando: "há 12 min", lida: false },
  { id: "n2", tipo: "pagamento_confirmado", titulo: "Pagamento confirmado", corpo: "Sinal de R$ 1.500 do Casamento Marina & Thiago caiu (via Asaas).", quando: "há 2 h", lida: false },
  { id: "n3", tipo: "contrato_assinado", titulo: "Contrato assinado", corpo: "Família Costa assinou o contrato dos 15 anos da Beatriz.", quando: "há 5 h", lida: false },
  { id: "n4", tipo: "pagamento_atrasado", titulo: "Pagamento atrasado", corpo: "Parcela 2/3 do Estúdio X venceu ontem.", quando: "há 1 d", lida: true },
  { id: "n5", tipo: "feedback_recebido", titulo: "Novo feedback", corpo: "João & Ana deixaram uma avaliação 5★ do casamento.", quando: "há 2 d", lida: true },
];

const eventoMeta = (id) => EVENTOS.find((e) => e.id === id) || { label: id, icon: Bell };

export default function Notificacoes() {
  const [aba, setAba] = useState("central");
  const [notifs, setNotifs] = useState(NOTIF_SEED);
  const [regras, setRegras] = useState(REGRAS_SEED);

  const naoLidas = notifs.filter((n) => !n.lida).length;

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><Bell className="h-4 w-4 text-white" /></div>
          <span className="text-sm font-semibold tracking-tight">Área Admin · Notificações</span>
          {/* sininho com contador no header */}
          <div className="ml-auto relative">
            <Bell className="h-5 w-5 text-stone-400" />
            {naoLidas > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: ACCENT }}>{naoLidas}</span>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
        <p className="mt-1 text-sm text-stone-500">Todo aviso do sistema num lugar só. O sininho é seu (admin); o cliente recebe por e-mail e WhatsApp.</p>

        <div className="mt-5 flex gap-1 border-b border-stone-200">
          {[["central", "Central"], ["regras", "Regras"]].map(([k, r]) => (
            <button key={k} onClick={() => setAba(k)}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold transition ${aba === k ? "" : "border-transparent text-stone-400 hover:text-stone-600"}`}
              style={aba === k ? { borderColor: ACCENT, color: ACCENT } : {}}>
              {r}{k === "central" && naoLidas > 0 && <span className="ml-1.5 tabular-nums">({naoLidas})</span>}
            </button>
          ))}
        </div>

        {aba === "central"
          ? <AbaCentral notifs={notifs} setNotifs={setNotifs} />
          : <AbaRegras regras={regras} setRegras={setRegras} />}
      </main>
    </div>
  );
}

// ───────────────────────── CENTRAL (in-app admin) ─────────────────────────
function AbaCentral({ notifs, setNotifs }) {
  const [filtro, setFiltro] = useState("todas");

  const marcarLida = (id) => setNotifs((l) => l.map((n) => n.id === id ? { ...n, lida: true } : n));
  const marcarTodas = () => setNotifs((l) => l.map((n) => ({ ...n, lida: true })));

  const visiveis = notifs.filter((n) => filtro === "todas" || (filtro === "nao_lidas" && !n.lida));
  const naoLidas = notifs.filter((n) => !n.lida).length;

  return (
    <>
      <div className="mt-5 flex items-center justify-between">
        <div className="flex gap-2">
          {[["todas", "Todas"], ["nao_lidas", "Não lidas"]].map(([k, r]) => {
            const n = k === "todas" ? notifs.length : naoLidas;
            return (
              <button key={k} onClick={() => setFiltro(k)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${filtro === k ? "text-white" : "bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-50"}`}
                style={filtro === k ? { background: ACCENT } : {}}>{r} ({n})</button>
            );
          })}
        </div>
        {naoLidas > 0 && (
          <button onClick={marcarTodas} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
            <CheckCheck className="h-3.5 w-3.5" /> Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {visiveis.map((n) => {
          const meta = eventoMeta(n.tipo);
          const EvIcon = meta.icon;
          return (
            <button key={n.id} onClick={() => marcarLida(n.id)}
              className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${n.lida ? "border-stone-200 bg-white" : "border-stone-200 bg-orange-50/40"}`}>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${n.lida ? "bg-stone-100" : "bg-white"}`}>
                <EvIcon className="h-4 w-4" style={{ color: n.lida ? "#a8a29e" : ACCENT }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${n.lida ? "font-medium text-stone-600" : "font-semibold text-stone-800"}`}>{n.titulo}</span>
                  {!n.lida && <span className="h-2 w-2 rounded-full" style={{ background: ACCENT }} />}
                </div>
                <p className="mt-0.5 text-sm text-stone-500">{n.corpo}</p>
                <span className="mt-1 block text-xs text-stone-400">{n.quando}</span>
              </div>
            </button>
          );
        })}
        {visiveis.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-stone-200 px-5 py-10 text-center text-sm text-stone-400">Nada por aqui.</div>
        )}
      </div>

      <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Esta central é só do admin. Cada item nasceu de um evento do sistema (pagamento, contrato, lead…) segundo as regras da aba ao lado. Notificação avisa uma vez — cobrança que insiste é o Follow-up, não aqui.
      </p>
    </>
  );
}

// ───────────────────────── REGRAS (matriz) ─────────────────────────
function AbaRegras({ regras, setRegras }) {
  const toggle = (evento, canal) =>
    setRegras((r) => ({ ...r, [evento]: { ...r[evento], [canal]: !r[evento][canal] } }));

  return (
    <>
      <div className="mt-5 rounded-lg bg-stone-100 p-3 text-xs text-stone-500">
        Para cada evento, escolha <strong>quem</strong> é avisado e por <strong>qual canal</strong>. Estas são as regras-padrão sugeridas — ligue/desligue à vontade. O sininho é exclusivo do admin; o cliente só é avisado por e-mail/WhatsApp.
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-400">
              <th className="px-4 py-3 text-left font-semibold">Evento</th>
              {CANAIS.map((c) => (
                <th key={c.id} className="px-3 py-3 text-center font-semibold">
                  <div className="flex flex-col items-center gap-1">
                    <c.icon className="h-3.5 w-3.5" />
                    <span className="whitespace-nowrap normal-case">{c.label}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${c.dest === "admin" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-700"}`}>{c.dest}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EVENTOS.map((ev) => {
              const EvIcon = ev.icon;
              return (
                <tr key={ev.id} className="border-b border-stone-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <EvIcon className="h-4 w-4 text-stone-400" />
                      <span className="font-medium text-stone-700">{ev.label}</span>
                    </div>
                  </td>
                  {CANAIS.map((c) => {
                    const on = regras[ev.id][c.id];
                    return (
                      <td key={c.id} className="px-3 py-3 text-center">
                        <button onClick={() => toggle(ev.id, c.id)}
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-md transition ${on ? "text-white" : "text-stone-300 ring-1 ring-stone-200 hover:bg-stone-50"}`}
                          style={on ? { background: ACCENT } : {}}>
                          {on && <Check className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> "Pagamento atrasado" avisa você, mas não dispara cobrança ao cliente — insistir em quem deve é papel do Follow-up (§20). WhatsApp é o mesmo canal compartilhado com o Follow-up. Um evento pode acionar vários canais ao mesmo tempo.
      </p>
    </>
  );
}
