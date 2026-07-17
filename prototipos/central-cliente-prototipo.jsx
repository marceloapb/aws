import React, { useState } from "react";
import {
  Camera, LayoutDashboard, FolderOpen, User, Bell, ChevronRight, ArrowLeft,
  FileText, FileSignature, CreditCard, Images, Star, Check, Clock, AlertCircle,
  Calendar, MapPin, Download, ChevronLeft, X
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Central do Cliente (área logada, portal completo)
// Organizado POR TRABALHO/EVENTO. Três níveis:
//   1) Painel (pendências + novidades)
//   2) Meus trabalhos (lista de eventos, inclui histórico)
//   3) Trabalho aberto (abas: proposta, contrato, pagamento, álbum, feedback)
// Respeita interno×cliente: mostra só a superfície do cliente.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";
const brl = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── Validações (dígitos verificadores) ───────────────────────

// CPF: 11 dígitos, valida os 2 dígitos verificadores
function validaCPF(v) {
  const c = (v || "").replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (base, pesoIni) => {
    let s = 0;
    for (let i = 0; i < base.length; i++) s += Number(base[i]) * (pesoIni - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = dv(c.slice(0, 9), 10);
  const d2 = dv(c.slice(0, 10), 11);
  return d1 === Number(c[9]) && d2 === Number(c[10]);
}

// CNPJ alfanumérico (regra nova 2026): 12 posições alfanuméricas + 2 dígitos verificadores.
// O valor de cada caractere = código ASCII - 48 (0-9 → 0-9, A-Z → 17-42).
function validaCNPJ(v) {
  const c = (v || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (c.length !== 14) return false;
  if (/^(.)\1{13}$/.test(c)) return false;
  const valor = (ch) => ch.charCodeAt(0) - 48;
  const calc = (len) => {
    const pesos = len === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let s = 0;
    for (let i = 0; i < len; i++) s += valor(c[i]) * pesos[i];
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(12);
  const d2 = calc(13);
  return d1 === Number(c[12]) && d2 === Number(c[13]);
}

// máscaras
const mascaraCPF = (v) => v.replace(/\D/g, "").slice(0, 11)
  .replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const mascaraCNPJ = (v) => v.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 14)
  .replace(/^(..)(.)/, "$1.$2").replace(/^(..\...)(.)/, "$1.$2").replace(/(.{8})(.)/, "$1/$2").replace(/(.{13})(.)/, "$1-$2");
// telefone: no máximo 11 dígitos → (11) 99999-9999
const mascaraTel = (v) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.replace(/(\d{0,2})/, "($1");
  if (d.length <= 6) return d.replace(/(\d{2})(\d{0,4})/, "($1) $2");
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
};
const mascaraCEP = (v) => v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");

// trabalhos do cliente (recorrente — vários ao longo dos anos)
const TRABALHOS = [
  {
    id: 1, nome: "Casamento", data: "12/12/2026", ano: "2026", status: "ativo",
    local: "Espaço Villa Garden", statusCliente: "Contrato aguardando seu aceite",
    proposta: { valor: 6900, opcao: "Pacote Completo", pagamento: "3x sem juros" },
    contrato: { status: "aguardando" },
    pagamento: { total: 6900, pago: 1657, cobrancas: [
      { desc: "Sinal", valor: 1657, venc: "10/05/2026", status: "paga" },
      { desc: "Parcela 1/3", valor: 1290, venc: "10/07/2026", status: "aberta" },
      { desc: "Parcela 2/3", valor: 1290, venc: "10/08/2026", status: "aberta" },
    ]},
    album: { status: "aguardando" },
    feedback: { status: "indisponivel" },
  },
  {
    id: 2, nome: "Ensaio Família", data: "28/06/2025", ano: "2025", status: "concluido",
    local: "Parque Ibirapuera", statusCliente: "Álbum disponível",
    proposta: { valor: 1200, opcao: "Ensaio Externo", pagamento: "À vista" },
    contrato: { status: "aceito", em: "15/05/2025" },
    pagamento: { total: 1200, pago: 1200, cobrancas: [
      { desc: "À vista", valor: 1200, venc: "20/05/2025", status: "paga" },
    ]},
    album: { status: "disponivel", fotos: 45, expira: "28/12/2025" },
    feedback: { status: "pendente" },
  },
  {
    id: 3, nome: "Aniversário Sofia", data: "10/03/2024", ano: "2024", status: "concluido",
    local: "Buffet Alegria", statusCliente: "Concluído",
    proposta: { valor: 1800, opcao: "Festa Infantil", pagamento: "2x sem juros" },
    contrato: { status: "aceito", em: "01/02/2024" },
    pagamento: { total: 1800, pago: 1800, cobrancas: [
      { desc: "Parcela 1/2", valor: 900, venc: "10/02/2024", status: "paga" },
      { desc: "Parcela 2/2", valor: 900, venc: "10/03/2024", status: "paga" },
    ]},
    album: { status: "expirado", fotos: 120 },
    feedback: { status: "enviado", estrelas: 5 },
  },
];

const NAV = [
  { id: "painel", nome: "Painel", icon: LayoutDashboard },
  { id: "eventos", nome: "Meus eventos", icon: FolderOpen },
  { id: "dados", nome: "Meus dados", icon: User },
];

export default function CentralCliente() {
  const [aba, setAba] = useState("painel");
  const [trabalhoId, setTrabalhoId] = useState(null);

  const trabalho = TRABALHOS.find((t) => t.id === trabalhoId);
  const abrir = (id) => { setTrabalhoId(id); setAba("eventos"); };

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      {/* topo */}
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
            <Camera className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Marcelo Bloise Fotografia</span>
          <div className="ml-auto flex items-center gap-3">
            <Bell className="h-5 w-5 text-stone-400" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-600">MS</div>
          </div>
        </div>
      </div>

      {/* navegação */}
      {!trabalho && (
        <div className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-4xl gap-1 px-4">
            {NAV.map((n) => {
              const Icon = n.icon;
              return (
                <button key={n.id} onClick={() => setAba(n.id)}
                  className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition ${aba === n.id ? "" : "border-transparent text-stone-500 hover:text-stone-800"}`}
                  style={aba === n.id ? { borderColor: ACCENT, color: ACCENT } : {}}>
                  <Icon className="h-4 w-4" /> {n.nome}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {trabalho ? (
        <TrabalhoAberto trabalho={trabalho} onVoltar={() => setTrabalhoId(null)} />
      ) : aba === "painel" ? (
        <Painel onAbrir={abrir} irTrabalhos={() => setAba("eventos")} />
      ) : aba === "eventos" ? (
        <MeusTrabalhos onAbrir={abrir} />
      ) : (
        <MeusDados />
      )}
    </div>
  );
}

// ── Painel (entrada) ─────────────────────────────────────────

function Painel({ onAbrir, irTrabalhos }) {
  const pendencias = [
    { id: 1, trabalho: "Casamento", texto: "Contrato aguardando seu aceite", icon: FileSignature, cor: "#B45309", acao: "Revisar contrato" },
    { id: 1, trabalho: "Casamento", texto: "Parcela 1/3 vence em 10/07", icon: CreditCard, cor: "#B45309", acao: "Ver pagamento" },
    { id: 2, trabalho: "Ensaio Família", texto: "Seu álbum está disponível!", icon: Images, cor: "#047857", acao: "Ver álbum" },
    { id: 2, trabalho: "Ensaio Família", texto: "Que tal avaliar o trabalho?", icon: Star, cor: ACCENT, acao: "Avaliar" },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Olá, Marina 👋</h1>
      <p className="mt-1 text-sm text-stone-500">Veja o que precisa da sua atenção.</p>

      <div className="mt-5 space-y-3">
        {pendencias.map((p, i) => {
          const Icon = p.icon;
          return (
            <button key={i} onClick={() => onAbrir(p.id)} className="flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 text-left transition hover:border-orange-300">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: p.cor + "15" }}>
                <Icon className="h-5 w-5" style={{ color: p.cor }} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{p.texto}</div>
                <div className="text-xs text-stone-400">{p.trabalho}</div>
              </div>
              <span className="shrink-0 text-sm font-medium text-orange-600">{p.acao} →</span>
            </button>
          );
        })}
      </div>

      <button onClick={irTrabalhos} className="mt-6 flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800">
        Ver todos os meus eventos <ChevronRight className="h-4 w-4" />
      </button>
    </main>
  );
}

// ── Meus trabalhos (lista por evento) ────────────────────────

function MeusTrabalhos({ onAbrir }) {
  const ativos = TRABALHOS.filter((t) => t.status === "ativo");
  const concluidos = TRABALHOS.filter((t) => t.status === "concluido");

  const Card = ({ t }) => (
    <button onClick={() => onAbrir(t.id)} className="flex w-full items-center gap-4 rounded-xl border border-stone-200 bg-white p-4 text-left transition hover:border-orange-300">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg" style={{ background: ACCENT + "12" }}>
        <Calendar className="h-6 w-6" style={{ color: ACCENT }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{t.nome} <span className="font-normal text-stone-400">· {t.ano}</span></div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-stone-400">
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {t.data}</span>
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {t.local}</span>
        </div>
        <div className="mt-1.5 text-xs font-medium" style={{ color: t.status === "ativo" ? "#B45309" : "#78716c" }}>{t.statusCliente}</div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-stone-300" />
    </button>
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Meus eventos</h1>
      <p className="mt-1 text-sm text-stone-500">Todos os seus eventos com o estúdio.</p>

      {ativos.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Em andamento</h2>
          <div className="space-y-3">{ativos.map((t) => <Card key={t.id} t={t} />)}</div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Histórico</h2>
        <div className="space-y-3">{concluidos.map((t) => <Card key={t.id} t={t} />)}</div>
      </div>
    </main>
  );
}

// ── Trabalho aberto (abas) ───────────────────────────────────

function TrabalhoAberto({ trabalho, onVoltar }) {
  const [secao, setSecao] = useState("proposta");
  const secoes = [
    { id: "proposta", nome: "Proposta", icon: FileText },
    { id: "contrato", nome: "Contrato", icon: FileSignature },
    { id: "pagamento", nome: "Pagamento", icon: CreditCard },
    { id: "album", nome: "Álbum", icon: Images },
    { id: "feedback", nome: "Feedback", icon: Star },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-6">
      <button onClick={onVoltar} className="mb-4 flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800">
        <ArrowLeft className="h-4 w-4" /> Meus eventos
      </button>

      <h1 className="text-2xl font-bold tracking-tight">{trabalho.nome} · {trabalho.ano}</h1>
      <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-stone-400">
        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {trabalho.data}</span>
        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {trabalho.local}</span>
      </div>

      {/* abas */}
      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-stone-200">
        {secoes.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => setSecao(s.id)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition ${secao === s.id ? "" : "border-transparent text-stone-500 hover:text-stone-800"}`}
              style={secao === s.id ? { borderColor: ACCENT, color: ACCENT } : {}}>
              <Icon className="h-4 w-4" /> {s.nome}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {secao === "proposta" && <SecaoProposta t={trabalho} />}
        {secao === "contrato" && <SecaoContrato t={trabalho} />}
        {secao === "pagamento" && <SecaoPagamento t={trabalho} />}
        {secao === "album" && <SecaoAlbum t={trabalho} />}
        {secao === "feedback" && <SecaoFeedback t={trabalho} />}
      </div>
    </main>
  );
}

function Cartao({ children }) {
  return <div className="rounded-xl border border-stone-200 bg-white p-5">{children}</div>;
}
function Selo({ cor, bg, children }) {
  return <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ color: cor, background: bg }}>{children}</span>;
}

function SecaoProposta({ t }) {
  const [verDoc, setVerDoc] = useState(false);
  return (
    <>
      <Cartao>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold">{t.proposta.opcao}</h2>
            <p className="text-sm text-stone-400">Opção escolhida</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: ACCENT }}>{brl(t.proposta.valor)}</div>
            <div className="text-xs text-stone-400">{t.proposta.pagamento}</div>
          </div>
        </div>
        <button onClick={() => setVerDoc(true)} className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>
          <FileText className="h-4 w-4" /> Ver proposta completa
        </button>
      </Cartao>
      {verDoc && <ModalDoc titulo="Proposta comercial" onClose={() => setVerDoc(false)}>
        <p><strong>Evento:</strong> {t.nome} · {t.data}</p>
        <p><strong>Local:</strong> {t.local}</p>
        <p><strong>Pacote:</strong> {t.proposta.opcao}</p>
        <hr className="my-3 border-stone-100" />
        <p className="font-semibold" style={{ color: ACCENT }}>O que está incluído</p>
        <ul className="ml-4 list-disc space-y-1 text-stone-600">
          <li>Cobertura fotográfica completa do evento</li>
          <li>Fotos tratadas e entregues em galeria online</li>
          <li>Álbum digital com acesso por 6 meses</li>
        </ul>
        <hr className="my-3 border-stone-100" />
        <p><strong>Valor:</strong> {brl(t.proposta.valor)}</p>
        <p><strong>Forma de pagamento:</strong> {t.proposta.pagamento}</p>
      </ModalDoc>}
    </>
  );
}

function SecaoContrato({ t }) {
  const [verDoc, setVerDoc] = useState(false);
  const [aceitoLocal, setAceitoLocal] = useState(t.contrato.status === "aceito");
  const [emLocal, setEmLocal] = useState(t.contrato.em);

  const assinar = () => { setAceitoLocal(true); setEmLocal("agora"); setVerDoc(false); };

  return (
    <>
      <Cartao>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Contrato de prestação de serviços</h2>
            <p className="text-sm text-stone-400">{aceitoLocal ? `Aceito em ${emLocal === "agora" ? "agora" : emLocal}` : "Revise e assine para confirmar"}</p>
          </div>
          {aceitoLocal && <Selo cor="#047857" bg="#ECFDF5">Aceito</Selo>}
        </div>
        <button onClick={() => setVerDoc(true)} className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: ACCENT }}>
          <FileSignature className="h-4 w-4" /> {aceitoLocal ? "Ver contrato" : "Revisar e assinar"}
        </button>
      </Cartao>
      {verDoc && <ModalDoc titulo="Contrato de prestação de serviços" onClose={() => setVerDoc(false)}
        rodape={!aceitoLocal && (
          <button onClick={assinar} className="w-full rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>
            Li e concordo — assinar contrato
          </button>
        )}>
        <p><strong>Contratante:</strong> Marina Silva</p>
        <p><strong>Contratado:</strong> Marcelo Bloise Fotografia</p>
        <p><strong>Objeto:</strong> {t.nome} em {t.data}, no {t.local}.</p>
        <hr className="my-3 border-stone-100" />
        <p className="font-semibold" style={{ color: ACCENT }}>Cláusulas</p>
        <p><strong>1.</strong> O contratado se compromete a realizar a cobertura fotográfica do evento descrito.</p>
        <p><strong>2.</strong> O valor total é de {brl(t.proposta.valor)}, pago via {t.proposta.pagamento}.</p>
        <p><strong>3.</strong> As fotos serão entregues em até 30 dias após o evento, em galeria online.</p>
        <p><strong>4.</strong> O acesso ao álbum digital fica disponível por 6 meses.</p>
        <p className="text-xs text-stone-400">(...demais cláusulas do modelo...)</p>
        {aceitoLocal && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">✓ Contrato aceito eletronicamente {emLocal === "agora" ? "agora" : `em ${emLocal}`}.</p>}
      </ModalDoc>}
    </>
  );
}

function SecaoPagamento({ t }) {
  const p = t.pagamento;
  const pct = Math.round((p.pago / p.total) * 100);
  return (
    <div className="space-y-4">
      <Cartao>
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-500">Pago {brl(p.pago)} de {brl(p.total)}</span>
          <span className="font-semibold" style={{ color: ACCENT }}>{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ACCENT }} />
        </div>
      </Cartao>
      <div className="space-y-2">
        {p.cobrancas.map((c, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4 text-sm">
            <div>
              <div className="font-medium">{c.desc}</div>
              <div className="text-xs text-stone-400">vence {c.venc}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="tabular-nums font-medium">{brl(c.valor)}</span>
              {c.status === "paga"
                ? <Selo cor="#047857" bg="#ECFDF5">Paga</Selo>
                : <Selo cor="#B45309" bg="#FEF9C3">Em aberto</Selo>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecaoAlbum({ t }) {
  const a = t.album;
  const [aviso, setAviso] = useState(false);
  if (a.status === "aguardando")
    return <Cartao><div className="py-6 text-center text-sm text-stone-400"><Images className="mx-auto mb-2 h-8 w-8 text-stone-300" />Seu álbum ficará disponível aqui após o evento.</div></Cartao>;
  if (a.status === "expirado")
    return <Cartao><div className="py-6 text-center text-sm text-stone-400"><Clock className="mx-auto mb-2 h-8 w-8 text-stone-300" />Este álbum expirou. Fale com o estúdio para reativar o acesso.</div></Cartao>;
  return (
    <>
      <Cartao>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Seu álbum está pronto! 🎉</h2>
            <p className="text-sm text-stone-400">{a.fotos} fotos · disponível até {a.expira}</p>
          </div>
          <button onClick={() => setAviso(true)} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>
            <Images className="h-4 w-4" /> Ver álbum
          </button>
        </div>
      </Cartao>
      {aviso && <ModalDoc titulo="Abrir álbum" onClose={() => setAviso(false)}>
        <p>Isto abre a <strong>vitrine do álbum</strong> — a experiência completa com capa, galerias, ampliar foto, download e favoritos (a tela que já construímos separadamente).</p>
        <p className="text-stone-400">A central encaminha para essa experiência dedicada, sem duplicá-la aqui.</p>
      </ModalDoc>}
    </>
  );
}

function SecaoFeedback({ t }) {
  const f = t.feedback;
  const [aviso, setAviso] = useState(false);
  if (f.status === "indisponivel")
    return <Cartao><div className="py-6 text-center text-sm text-stone-400"><Star className="mx-auto mb-2 h-8 w-8 text-stone-300" />Você poderá avaliar após receber o álbum.</div></Cartao>;
  if (f.status === "enviado")
    return (
      <Cartao>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Obrigado pela avaliação!</h2>
            <p className="text-sm text-stone-400">Você avaliou este trabalho.</p>
          </div>
          <div className="flex gap-0.5">{[1,2,3,4,5].map((n) => <Star key={n} className="h-5 w-5" style={{ color: n <= f.estrelas ? ACCENT : "#d6d3d1", fill: n <= f.estrelas ? ACCENT : "transparent" }} />)}</div>
        </div>
      </Cartao>
    );
  return (
    <>
      <Cartao>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Como foi sua experiência?</h2>
            <p className="text-sm text-stone-400">Sua opinião ajuda muito o estúdio.</p>
          </div>
          <button onClick={() => setAviso(true)} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>
            <Star className="h-4 w-4" /> Avaliar
          </button>
        </div>
      </Cartao>
      {aviso && <ModalDoc titulo="Avaliar trabalho" onClose={() => setAviso(false)}>
        <p>Isto abre o <strong>fluxo de avaliação</strong> — estrelas, comentário e autorização de depoimento (a tela que já construímos no módulo Feedback).</p>
        <p className="text-stone-400">A central encaminha para esse fluxo dedicado.</p>
      </ModalDoc>}
    </>
  );
}

// ── Modal visualizador de documento ──────────────────────────

function ModalDoc({ titulo, children, rodape, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <h2 className="font-bold tracking-tight">{titulo}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-stone-700">
          {children}
        </div>
        {rodape && <div className="border-t border-stone-100 px-6 py-4">{rodape}</div>}
      </div>
    </div>
  );
}

// ── Meus dados ───────────────────────────────────────────────

function MeusDados() {
  const [tipo, setTipo] = useState("pf");
  const [doc, setDoc] = useState("123.456.789-09");
  const [tel, setTel] = useState("(11) 99999-9999");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState({ logradouro: "", bairro: "", cidade: "", estado: "", numero: "", complemento: "" });
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const inp = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
  const lbl = "mb-1.5 block text-sm font-medium text-stone-700";

  // validação do documento conforme o tipo
  const docLimpo = doc.replace(/[^0-9A-Za-z]/g, "");
  const docValido = tipo === "pf" ? validaCPF(doc) : validaCNPJ(doc);
  const mostrarErroDoc = docLimpo.length > 0 && (tipo === "pf" ? docLimpo.length === 11 : docLimpo.length === 14) && !docValido;

  const trocarTipo = (k) => { setTipo(k); setDoc(""); };
  const onDoc = (e) => setDoc(tipo === "pf" ? mascaraCPF(e.target.value) : mascaraCNPJ(e.target.value));

  // busca de CEP (simulada — no sistema real chama a API de CEP)
  const buscarCep = (valor) => {
    const c = mascaraCEP(valor);
    setCep(c);
    if (c.replace(/\D/g, "").length === 8) {
      setBuscandoCep(true);
      setTimeout(() => {
        setEndereco((e) => ({ ...e, logradouro: "Av. Paulista", bairro: "Bela Vista", cidade: "São Paulo", estado: "SP" }));
        setBuscandoCep(false);
      }, 600);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Meus dados</h1>
      <p className="mt-1 text-sm text-stone-500">Mantenha suas informações atualizadas.</p>

      {/* dados pessoais */}
      <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold" style={{ color: ACCENT }}><User className="h-4 w-4" /> Dados pessoais</h2>

        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stone-100 text-stone-300">
            <User className="h-8 w-8" />
          </div>
          <button onClick={() => alert("No sistema real, isto abre o seletor de foto do seu dispositivo. (upload é backend, simulado no protótipo)")} className="text-sm font-medium text-orange-600 hover:text-orange-700">Trocar foto</button>
        </div>

        <div className="mb-4">
          <label className={lbl}>Tipo de cadastro</label>
          <div className="flex gap-4">
            {[["pf", "Pessoa Física"], ["pj", "Pessoa Jurídica"]].map(([k, r]) => (
              <button key={k} onClick={() => trocarTipo(k)} className="flex items-center gap-2 text-sm">
                <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${tipo === k ? "" : "border-stone-300"}`} style={tipo === k ? { borderColor: ACCENT } : {}}>
                  {tipo === k && <span className="h-2 w-2 rounded-full" style={{ background: ACCENT }} />}
                </span>{r}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>{tipo === "pf" ? "CPF" : "CNPJ"}</label>
            <input value={doc} onChange={onDoc}
              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 ${mostrarErroDoc ? "border-red-400 focus:border-red-400 focus:ring-red-100" : docValido ? "border-emerald-400 focus:border-emerald-400 focus:ring-emerald-100" : "border-stone-300 focus:border-orange-400 focus:ring-orange-100"}`}
              placeholder={tipo === "pf" ? "000.000.000-00" : "00.000.000/0000-00"} />
            {mostrarErroDoc && <p className="mt-1 flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" /> {tipo === "pf" ? "CPF" : "CNPJ"} inválido (dígito verificador não confere)</p>}
            {docValido && <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3 w-3" /> {tipo === "pf" ? "CPF" : "CNPJ"} válido</p>}
          </div>
          <div><label className={lbl}>Nome completo</label><input className={inp} defaultValue="Marina Silva" /></div>
          <div><label className={lbl}>E-mail</label><input className={inp} defaultValue="marina@email.com" type="email" /></div>
          <div>
            <label className={lbl}>WhatsApp</label>
            <input value={tel} onChange={(e) => setTel(mascaraTel(e.target.value))} className={inp} placeholder="(11) 99999-9999" />
          </div>
          <div className="sm:col-span-2"><label className={lbl}>Instagram (@)</label><input className={inp} placeholder="@seu_usuario" /></div>
        </div>
      </section>

      {/* endereço */}
      <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold" style={{ color: ACCENT }}><MapPin className="h-4 w-4" /> Endereço</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>CEP</label>
            <div className="relative">
              <input value={cep} onChange={(e) => buscarCep(e.target.value)} className={inp} placeholder="00000-000" />
              {buscandoCep && <span className="absolute right-3 top-2.5 text-xs text-stone-400">buscando…</span>}
            </div>
            <p className="mt-1 text-xs text-amber-600">⚠ Demonstração: o CEP preenche sempre um endereço de exemplo. No sistema real, consulta a API de CEP.</p>
          </div>
          <div><label className={lbl}>Logradouro</label><input value={endereco.logradouro} onChange={(e) => setEndereco({ ...endereco, logradouro: e.target.value })} className={inp} placeholder="Rua, avenida…" /></div>
          <div><label className={lbl}>Número</label><input value={endereco.numero} onChange={(e) => setEndereco({ ...endereco, numero: e.target.value })} className={inp} placeholder="Nº ou S/N" /></div>
          <div><label className={lbl}>Complemento</label><input value={endereco.complemento} onChange={(e) => setEndereco({ ...endereco, complemento: e.target.value })} className={inp} placeholder="Apto, bloco…" /></div>
          <div><label className={lbl}>Bairro</label><input value={endereco.bairro} onChange={(e) => setEndereco({ ...endereco, bairro: e.target.value })} className={inp} /></div>
          <div><label className={lbl}>Cidade</label><input value={endereco.cidade} onChange={(e) => setEndereco({ ...endereco, cidade: e.target.value })} className={inp} /></div>
          <div><label className={lbl}>Estado</label><input value={endereco.estado} onChange={(e) => setEndereco({ ...endereco, estado: e.target.value })} className={inp} /></div>
        </div>
      </section>

      <div className="mt-5 flex items-center justify-end gap-3">
        {salvo && <span className="flex items-center gap-1.5 text-sm text-emerald-600"><Check className="h-4 w-4" /> Alterações salvas!</span>}
        <button onClick={() => { setSalvo(true); setTimeout(() => setSalvo(false), 2500); }} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ background: ACCENT }}>Salvar alterações</button>
      </div>
    </main>
  );
}
