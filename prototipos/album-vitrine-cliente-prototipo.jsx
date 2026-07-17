import React, { useState } from "react";
import {
  Camera, Download, Heart, X, ChevronLeft, ChevronRight, ArrowDown, Check, Info, Lock
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Experiência do cliente: a VITRINE do álbum
// Capa · galerias · ampliar (lightbox) · download (uma/todas) ·
// favoritos (seleção). Respeita as regras do álbum (download on/off).
// Fotos são placeholders (servidas pelo serviço de mídia: thumb na
// grade, média ao ampliar, original no download).
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

const GRADIENTES = [
  "linear-gradient(135deg,#a8c0ff,#3f2b96)", "linear-gradient(135deg,#f6d365,#fda085)",
  "linear-gradient(135deg,#84fab0,#8fd3f4)", "linear-gradient(135deg,#fccb90,#d57eeb)",
  "linear-gradient(135deg,#e0c3fc,#8ec5fc)", "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#5ee7df,#b490ca)", "linear-gradient(135deg,#c79081,#dfa579)",
  "linear-gradient(135deg,#fa709a,#fee140)", "linear-gradient(135deg,#30cfd0,#330867)",
  "linear-gradient(135deg,#a1c4fd,#c2e9fb)", "linear-gradient(135deg,#ff9a9e,#fecfef)",
];

// álbum publicado (vindo da gestão); config define o que o cliente pode
const GALERIAS_COMPLETAS = [
  { nome: "Cerimônia", fotos: Array.from({ length: 8 }, (_, i) => ({ id: 100 + i, grad: GRADIENTES[i % GRADIENTES.length] })) },
  { nome: "Festa", fotos: Array.from({ length: 10 }, (_, i) => ({ id: 200 + i, grad: GRADIENTES[(i + 3) % GRADIENTES.length] })) },
];
const montarAlbum = (qtdGalerias) => ({
  titulo: "Marina & Rafael",
  data: "12 de dezembro de 2026",
  estudio: "Marcelo Bloise Fotografia",
  permite_download: true,
  permite_selecao: true,
  galerias: GALERIAS_COMPLETAS.slice(0, qtdGalerias),
});

const PRECOS_PRORROGACAO = { 1: 150, 3: 350, 6: 600, 12: 1000 }; // espelha o configurado em album-gestao (preços editáveis pelo admin)

export default function VitrineCliente() {
  const [qtdGalerias, setQtdGalerias] = useState(2); // alternador de demo: 1 ou 2
  const ALBUM = montarAlbum(qtdGalerias);
  const [expirado, setExpirado] = useState(false); // alternador de demo do estado de expiração
  const [reativado, setReativado] = useState(false);
  const [entrou, setEntrou] = useState(false);
  const [galeriaAberta, setGaleriaAberta] = useState(null); // índice da galeria, ou null = grade de galerias
  const [favoritos, setFavoritos] = useState(new Set());
  const [lightbox, setLightbox] = useState(null);

  const umaGaleria = ALBUM.galerias.length === 1;
  const toggleFav = (id) => setFavoritos((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ao entrar: se só há uma galeria, abre ela direto (pula a grade de galerias)
  const entrar = () => { setEntrou(true); if (umaGaleria) setGaleriaAberta(0); };

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-950 text-white">
      {/* alternador só para demonstração da regra */}
      <div className="flex flex-wrap items-center justify-center gap-2 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
        <span>Demo — testar com:</span>
        {[[1, "1 galeria (vai direto)"], [2, "2 galerias (mostra grade)"]].map(([n, r]) => (
          <button key={n} onClick={() => { setQtdGalerias(n); setEntrou(false); setGaleriaAberta(null); }}
            className={`rounded-full px-3 py-1 font-medium transition ${qtdGalerias === n ? "bg-amber-400 text-stone-900" : "bg-white/10 hover:bg-white/20"}`}>{r}</button>
        ))}
        <span className="mx-1 opacity-40">·</span>
        <button onClick={() => { setExpirado((v) => !v); setReativado(false); }}
          className={`rounded-full px-3 py-1 font-medium transition ${expirado ? "bg-red-400 text-stone-900" : "bg-white/10 hover:bg-white/20"}`}>
          {expirado ? "Álbum expirado (clique p/ reverter)" : "Simular álbum expirado"}
        </button>
      </div>

      {expirado && !reativado ? (
        <TelaExpirado onReativar={() => setReativado(true)} />
      ) : !entrou ? (
        <Capa album={ALBUM} onEntrar={entrar} />
      ) : galeriaAberta === null ? (
        <GradeGalerias album={ALBUM} totalFav={favoritos.size} onAbrir={setGaleriaAberta} />
      ) : (
        <FotosGaleria
          album={ALBUM} galeriaIdx={galeriaAberta} favoritos={favoritos} toggleFav={toggleFav}
          totalFav={favoritos.size}
          // com uma galeria só, não há "voltar para galerias" — volta para a capa
          onVoltar={umaGaleria ? null : () => setGaleriaAberta(null)}
          onAmpliar={(fi) => setLightbox({ galeriaIdx: galeriaAberta, fotoIdx: fi })} />
      )}

      {lightbox && (
        <Lightbox album={ALBUM} pos={lightbox} setPos={setLightbox} favoritos={favoritos} toggleFav={toggleFav} />
      )}
    </div>
  );
}

// ── Álbum expirado — reativação paga ────────────────────────────

function TelaExpirado({ onReativar }) {
  const [faixa, setFaixa] = useState(1);
  const [pagando, setPagando] = useState(null); // "online" | "manual" | null
  const [confirmadoManual, setConfirmadoManual] = useState(false);

  if (pagando === "online") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20"><Check className="h-7 w-7 text-emerald-400" /></div>
        <h1 className="text-xl font-bold">Pagamento confirmado</h1>
        <p className="max-w-xs text-sm text-white/60">Seu álbum foi reativado automaticamente por {faixa === 1 ? "1 mês" : faixa === 12 ? "1 ano" : `${faixa} meses`}.</p>
        <button onClick={onReativar} className="mt-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: ACCENT }}>Ver meu álbum</button>
      </div>
    );
  }
  if (pagando === "manual" && !confirmadoManual) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20"><Clock className="h-7 w-7 text-amber-400" /></div>
        <h1 className="text-xl font-bold">Pagamento em análise</h1>
        <p className="max-w-xs text-sm text-white/60">Pagamentos fora do link online (dinheiro/Pix direto) são confirmados manualmente pelo estúdio. Você recebe um aviso no WhatsApp assim que o álbum for reativado.</p>
        <button onClick={() => setConfirmadoManual(true)} className="mt-2 text-xs text-white/40 underline">(demo) simular admin confirmando</button>
      </div>
    );
  }
  if (confirmadoManual) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20"><Check className="h-7 w-7 text-emerald-400" /></div>
        <h1 className="text-xl font-bold">Álbum reativado</h1>
        <p className="max-w-xs text-sm text-white/60">O estúdio confirmou seu pagamento e reativou o acesso por {faixa === 1 ? "1 mês" : faixa === 12 ? "1 ano" : `${faixa} meses`}.</p>
        <button onClick={onReativar} className="mt-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: ACCENT }}>Ver meu álbum</button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <Lock className="h-10 w-10 text-white/30" />
      <div>
        <h1 className="text-xl font-bold">Este álbum expirou</h1>
        <p className="mt-1 max-w-xs text-sm text-white/60">O prazo de acesso combinado terminou. Suas fotos continuam guardadas — escolha um período pra reativar o acesso.</p>
      </div>
      <div className="grid w-full max-w-xs grid-cols-2 gap-2">
        {[1, 3, 6, 12].map((m) => (
          <button key={m} onClick={() => setFaixa(m)}
            className={`rounded-xl border p-3 text-sm transition ${faixa === m ? "border-orange-400 bg-orange-400/10" : "border-white/10 hover:bg-white/5"}`}>
            <div className="font-semibold">{m === 1 ? "1 mês" : m === 12 ? "1 ano" : `${m} meses`}</div>
            <div className="text-xs text-white/50 tabular-nums">R$ {PRECOS_PRORROGACAO[m]}</div>
          </button>
        ))}
      </div>
      <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
        <button onClick={() => setPagando("online")} className="rounded-full px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>Pagar online (Pix/cartão)</button>
        <button onClick={() => setPagando("manual")} className="rounded-full px-5 py-2.5 text-sm font-medium text-white/70 ring-1 ring-white/20 hover:bg-white/5">Já paguei por fora (dinheiro/Pix direto)</button>
      </div>
      <p className="max-w-xs text-xs text-white/30">Pagamento online reativa na hora. Pago fora do sistema, o estúdio confirma manualmente.</p>
    </div>
  );
}

// ── Capa ──────────────────────────────────────────────────────

function Capa({ album, onEntrar }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)" }} />
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 px-6 text-center">
        <div className="mb-4 flex items-center justify-center gap-2 text-sm font-medium uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
          <Camera className="h-4 w-4" /> {album.estudio}
        </div>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">{album.titulo}</h1>
        <div className="mt-3 text-lg text-white/70">{album.data}</div>
        <button onClick={onEntrar}
          className="mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90" style={{ background: ACCENT }}>
          Ver fotos <ArrowDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Grade de galerias (entrada, nível 1) ─────────────────────

function GradeGalerias({ album, totalFav, onAbrir }) {
  return (
    <div className="min-h-screen bg-stone-950 pb-20">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-stone-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-3">
          <div>
            <div className="font-semibold">{album.titulo}</div>
            <div className="text-xs text-white/50">{album.data}</div>
          </div>
          <div className="flex items-center gap-2">
            {album.permite_selecao && totalFav > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium">
                <Heart className="h-3.5 w-3.5 fill-current" style={{ color: ACCENT }} /> {totalFav} selecionada{totalFav !== 1 ? "s" : ""}
              </span>
            )}
            {album.permite_download && (
              <button className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white shadow transition hover:opacity-90" style={{ background: ACCENT }}>
                <Download className="h-4 w-4" /> Baixar álbum inteiro
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <h1 className="mt-8 text-2xl font-bold tracking-tight">Galerias</h1>
        <p className="mt-1 text-sm text-white/50">Escolha um momento para ver as fotos.</p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {album.galerias.map((g, gi) => (
            <button key={gi} onClick={() => onAbrir(gi)}
              className="group relative h-52 overflow-hidden rounded-2xl text-left" style={{ background: g.fotos[0].grad }}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/0 transition group-hover:from-black/80" />
              <div className="absolute bottom-0 left-0 p-5">
                <div className="text-xl font-bold">{g.nome}</div>
                <div className="text-sm text-white/70">{g.fotos.length} fotos</div>
              </div>
              <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 opacity-0 transition group-hover:opacity-100">
                <ChevronRight className="h-5 w-5" />
              </div>
            </button>
          ))}
        </div>

        <p className="mt-10 flex items-center justify-center gap-1.5 text-center text-xs text-white/30">
          <Info className="h-3.5 w-3.5" /> {album.estudio} · álbum disponível por tempo limitado
        </p>
      </main>
    </div>
  );
}

// ── Fotos de uma galeria (nível 2) ───────────────────────────

function FotosGaleria({ album, galeriaIdx, favoritos, toggleFav, totalFav, onVoltar, onAmpliar }) {
  const g = album.galerias[galeriaIdx];
  return (
    <div className="min-h-screen bg-stone-950 pb-20">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-stone-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-3">
          {onVoltar ? (
            <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white">
              <ChevronLeft className="h-4 w-4" /> Galerias
            </button>
          ) : <span className="w-16" />}
          <div className="text-center">
            <div className="font-semibold">{g.nome}</div>
            <div className="text-xs text-white/50">{g.fotos.length} fotos</div>
          </div>
          <div className="flex items-center gap-2">
            {album.permite_selecao && totalFav > 0 && (
              <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium sm:flex">
                <Heart className="h-3.5 w-3.5 fill-current" style={{ color: ACCENT }} /> {totalFav}
              </span>
            )}
            {album.permite_download && (
              <button className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white shadow transition hover:opacity-90" style={{ background: ACCENT }}>
                <Download className="h-4 w-4" /> Baixar esta galeria
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <div className="mt-5 flex items-center gap-1.5 text-sm text-white/60">
          <Info className="h-4 w-4" /> Clique em qualquer foto para abrir em tela cheia.
        </div>
        {album.permite_selecao && (
          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-white/5 px-4 py-2.5 text-sm text-white/60">
            <Heart className="h-4 w-4" style={{ color: ACCENT }} /> Toque no coração para marcar suas favoritas — o fotógrafo verá sua seleção.
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {g.fotos.map((f, fi) => {
            const fav = favoritos.has(f.id);
            return (
              <div key={f.id} onClick={() => onAmpliar(fi)}
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg" style={{ background: f.grad }}>
                <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
                {album.permite_selecao && (
                  <button onClick={(e) => { e.stopPropagation(); toggleFav(f.id); }}
                    className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full transition ${fav ? "bg-white/90" : "bg-black/30 opacity-0 group-hover:opacity-100"}`}>
                    <Heart className={`h-4 w-4 ${fav ? "fill-current" : "text-white"}`} style={fav ? { color: ACCENT } : {}} />
                  </button>
                )}
                {album.permite_download && (
                  <button onClick={(e) => { e.stopPropagation(); }}
                    className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white opacity-0 transition group-hover:opacity-100">
                    <Download className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

// ── Lightbox (ampliar foto) ───────────────────────────────────

function Lightbox({ album, pos, setPos, favoritos, toggleFav }) {
  const galeria = album.galerias[pos.galeriaIdx];
  const foto = galeria.fotos[pos.fotoIdx];
  const fav = favoritos.has(foto.id);

  const navegar = (dir) => {
    let { galeriaIdx, fotoIdx } = pos;
    fotoIdx += dir;
    if (fotoIdx < 0) {
      galeriaIdx = (galeriaIdx - 1 + album.galerias.length) % album.galerias.length;
      fotoIdx = album.galerias[galeriaIdx].fotos.length - 1;
    } else if (fotoIdx >= galeria.fotos.length) {
      galeriaIdx = (galeriaIdx + 1) % album.galerias.length;
      fotoIdx = 0;
    }
    setPos({ galeriaIdx, fotoIdx });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      {/* topo */}
      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-sm text-white/60">{galeria.nome}</span>
        <div className="flex items-center gap-2">
          {album.permite_selecao && (
            <button onClick={() => toggleFav(foto.id)} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${fav ? "bg-white/90 text-stone-900" : "bg-white/10 text-white hover:bg-white/20"}`}>
              <Heart className={`h-4 w-4 ${fav ? "fill-current" : ""}`} style={fav ? { color: ACCENT } : {}} /> {fav ? "Favorita" : "Favoritar"}
            </button>
          )}
          {album.permite_download && (
            <button className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white shadow transition hover:opacity-90" style={{ background: ACCENT }}>
              <Download className="h-4 w-4" /> Baixar
            </button>
          )}
          <button onClick={() => setPos(null)} className="rounded-full p-1.5 text-white/70 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
      </div>

      {/* foto */}
      <div className="relative flex flex-1 items-center justify-center px-4 pb-6">
        <button onClick={() => navegar(-1)} className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"><ChevronLeft className="h-6 w-6" /></button>
        <div className="h-full max-h-[75vh] w-full max-w-3xl rounded-xl" style={{ background: foto.grad }} />
        <button onClick={() => navegar(1)} className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"><ChevronRight className="h-6 w-6" /></button>
      </div>
    </div>
  );
}
