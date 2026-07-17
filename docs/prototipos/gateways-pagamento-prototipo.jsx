import React, { useState } from "react";
import {
  CreditCard, Check, X, Settings, Info, Star, AlertTriangle, Save, Eye, EyeOff,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Protótipo — Gateways de Pagamento (menu ADM · Financeiro/Pagamentos)
// Painel de configuração dos provedores de pagamento: ativar/desativar,
// credenciais, modo Sandbox/Produção e definir o padrão para novas cobranças.
// Cada gateway declara suas CAPACIDADES (matriz) — o sistema só roteia o que
// o gateway ativo suporta. "Manual" = a camada de controle de hoje, como um
// gateway (registro/baixa na mão), sempre disponível como fallback.
// Dados em memória.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#EA580C";

// ─────────────────────────────────────────────────────────────
// Esquema de credenciais POR PROVEDOR — cada gateway autentica diferente.
// Fontes: docs oficiais (Asaas, Mercado Pago, Pagar.me, PagBank verificados
// via documentação em jul/2026). Provedores marcados com verificar:true têm
// o esquema baseado no padrão de mercado e DEVEM ser confirmados na doc
// oficial antes de implementar — não assumir como definitivo.
// ─────────────────────────────────────────────────────────────
const CRED_SCHEMA = {
  asaas: { verificar: false, campos: [
    { key: "apiKey", label: "Chave de API (access_token)", secret: true, hint: "Começa com $aact_prod_ (produção) ou $aact_hmlg_ (sandbox). Painel → Integrações → Chave de API." },
    { key: "webhookToken", label: "Token do webhook", secret: true, opcional: true, hint: "Enviado no header asaas-access-token nas chamadas do Asaas pro sistema. Opcional, mas recomendado." },
  ]},
  mercadopago: { verificar: false, campos: [
    { key: "accessToken", label: "Access Token (privado)", secret: true, hint: "Painel → Suas integrações → Credenciais. Nunca expor no front." },
    { key: "publicKey", label: "Public Key", secret: false, hint: "Chave pública, usada no front pra tokenizar cartão." },
  ]},
  pagarme: { verificar: false, campos: [
    { key: "secretKey", label: "Chave Secreta (ak_)", secret: true, hint: "Prefixo ak_live_ ou ak_test_. Autenticação principal da company." },
    { key: "encryptionKey", label: "Encryption Key (ek_)", secret: false, hint: "Prefixo ek_. Usada só pra gerar chaves públicas de encriptação." },
  ]},
  pagbank: { verificar: false, campos: [
    { key: "email", label: "E-mail da conta", secret: false, hint: "Mesmo e-mail do cadastro PagBank/PagSeguro." },
    { key: "token", label: "Token de autenticação", secret: true, hint: "Painel → Preferências → Integrações → Gerar Token. Gerar novo invalida o anterior." },
  ]},
  inter: { verificar: false, campos: [
    { key: "clientId", label: "Client ID", secret: false, hint: "Emitido no Internet Banking Inter → API." },
    { key: "clientSecret", label: "Client Secret", secret: true, hint: "Par do Client ID." },
    { key: "cert", label: "Certificado mTLS (.crt/.key)", secret: true, hint: "O Inter exige certificado digital mTLS além do Client ID/Secret — passo extra de segurança." },
  ]},
  infinitepay: { verificar: false, campos: [
    { key: "clientId", label: "Client ID", secret: false, hint: "Dashboard InfinitePay → Configurações → Credenciais. OAuth2 (client_credentials)." },
    { key: "clientSecret", label: "Client Secret", secret: true, hint: "Par do Client ID. Gera access_token JWT via /v2/oauth/token." },
  ]},
  picpay: { verificar: false, campos: [
    { key: "clientId", label: "Client ID", secret: false, hint: "Painel Lojista PicPay → Credenciais. OAuth2 (client_credentials). Token expira em 5 min." },
    { key: "clientSecret", label: "Client Secret", secret: true, hint: "Exibido só na geração. Modelo antigo (x-picpay-token/x-seller-token) está sendo descontinuado." },
  ]},
  sumup: { verificar: false, campos: [
    { key: "apiKey", label: "Chave de API (sk_)", secret: true, hint: "Prefixo sk_live_ ou sk_test_. me.sumup.com → Settings → For Developers → API Keys. Ideal p/ conta única." },
  ]},
  stone: { verificar: true, campos: [
    { key: "clientId", label: "Client ID / Stone Code", secret: false, hint: "A Stone tem várias APIs (a de e-commerce direta exige contato comercial). Confirmar credenciais na doc do produto contratado." },
    { key: "secret", label: "Secret / Token", secret: true, hint: "Confirmar formato na doc oficial do produto Stone/Ton contratado." },
  ]},
  manual: { verificar: false, campos: [] },
};

// tipos possíveis (colunas da matriz)
const TIPOS = ["link", "pix", "boleto", "bolepix", "cartao", "maquininha", "webhook", "manual"];
const TIPO_LABEL = {
  link: "Link", pix: "Pix", boleto: "Boleto", bolepix: "Bolepix",
  cartao: "Cartão", maquininha: "Maquininha", webhook: "Webhook", manual: "Manual",
};

// capacidades EXATAS do print enviado pelo usuário
const GATEWAYS_SEED = [
  { id: "asaas", nome: "Asaas", ativo: false, modo: "sandbox", credenciado: false, padrao: false, caps: ["link", "pix", "boleto", "cartao", "webhook"] },
  { id: "inter", nome: "Banco Inter", ativo: false, modo: "sandbox", credenciado: false, padrao: false, caps: ["pix", "boleto", "webhook"] },
  { id: "infinitepay", nome: "InfinitePay", ativo: false, modo: "sandbox", credenciado: false, padrao: false, caps: ["link", "cartao", "webhook"] },
  { id: "manual", nome: "Manual", ativo: false, modo: "sandbox", credenciado: true, padrao: false, caps: ["manual"] },
  { id: "mercadopago", nome: "Mercado Pago", ativo: false, modo: "sandbox", credenciado: false, padrao: false, caps: ["link", "pix", "cartao", "webhook"] },
  { id: "pagbank", nome: "PagBank", ativo: false, modo: "sandbox", credenciado: false, padrao: false, caps: ["link", "pix", "boleto", "cartao", "webhook"] },
  { id: "pagarme", nome: "Pagar.me", ativo: false, modo: "sandbox", credenciado: false, padrao: false, caps: ["link", "pix", "boleto", "cartao", "webhook"] },
  { id: "picpay", nome: "PicPay", ativo: false, modo: "sandbox", credenciado: false, padrao: false, caps: ["link", "pix", "webhook"] },
  { id: "stone", nome: "Stone/Ton", ativo: false, modo: "sandbox", credenciado: false, padrao: false, caps: ["cartao", "maquininha", "webhook"] },
  { id: "sumup", nome: "SumUp", ativo: false, modo: "sandbox", credenciado: false, padrao: false, caps: ["cartao", "maquininha"] },
];

export default function GatewaysPagamento() {
  const [gateways, setGateways] = useState(GATEWAYS_SEED);
  const [config, setConfig] = useState(null); // gateway sendo configurado no modal

  const toggleAtivo = (id) =>
    setGateways((l) => l.map((g) => {
      if (g.id !== id) return g;
      // só ativa se tiver credencial
      if (!g.credenciado && !g.ativo) return g;
      return { ...g, ativo: !g.ativo, padrao: g.ativo ? false : g.padrao };
    }));

  const definirPadrao = (id) =>
    setGateways((l) => l.map((g) => ({ ...g, padrao: g.id === id })));

  const salvarConfig = (atualizado) => {
    setGateways((l) => l.map((g) => g.id === atualizado.id ? atualizado : g));
    setConfig(null);
  };

  const padraoAtual = gateways.find((g) => g.padrao);

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-50 text-stone-900">
      {/* header */}
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}><CreditCard className="h-4 w-4 text-white" /></div>
          <span className="text-sm font-semibold tracking-tight">Financeiro · Gateways de pagamento</span>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Gateways de Pagamento</h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-500">
          Configure as integrações com provedores (InfinitePay, Ton, Asaas, Mercado Pago…). Ative os gateways desejados, informe as credenciais e defina qual será o padrão para novas cobranças.
        </p>

        {/* aviso de padrão */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm">
          <Star className="h-4 w-4 shrink-0" style={{ color: ACCENT }} />
          {padraoAtual
            ? <span>Gateway padrão para novas cobranças: <span className="font-semibold">{padraoAtual.nome}</span></span>
            : <span className="text-stone-500">Nenhum gateway padrão definido — cobranças automáticas ficam indisponíveis até você escolher um.</span>}
        </div>

        {/* grade de gateways */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {gateways.map((g) => (
            <div key={g.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold tracking-tight">{g.nome}</span>
                    {g.padrao && <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ background: ACCENT }}><Star className="h-3 w-3" /> padrão</span>}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600 ring-1 ring-amber-200">
                      {g.modo === "sandbox" ? "Sandbox" : "Produção"}
                    </span>
                    {g.credenciado
                      ? <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><Check className="h-3 w-3" /> Configurado</span>
                      : <span className="flex items-center gap-1 text-xs font-medium text-amber-600"><Info className="h-3 w-3" /> Faltam credenciais</span>}
                  </div>
                </div>
                {/* toggle ativo */}
                <button
                  onClick={() => toggleAtivo(g.id)}
                  disabled={!g.credenciado}
                  title={!g.credenciado ? "Configure as credenciais antes de ativar" : ""}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${g.ativo ? "" : "bg-stone-300"} ${!g.credenciado ? "cursor-not-allowed opacity-40" : ""}`}
                  style={g.ativo ? { background: ACCENT } : {}}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${g.ativo ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>

              {/* tipos suportados */}
              <div className="mt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">Tipos suportados</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {g.caps.map((c) => (
                    <span key={c} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">{TIPO_LABEL[c]}</span>
                  ))}
                </div>
              </div>

              {/* ações */}
              <div className="mt-4 flex gap-2">
                <button onClick={() => setConfig(g)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
                  <Settings className="h-4 w-4" /> Configurar
                </button>
                {g.ativo && !g.padrao && (
                  <button onClick={() => definirPadrao(g.id)} className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium hover:bg-stone-50 ring-1" style={{ color: ACCENT, borderColor: ACCENT, boxShadow: `inset 0 0 0 1px ${ACCENT}` }}>
                    <Star className="h-4 w-4" /> Tornar padrão
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* matriz de capacidades */}
        <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-base font-bold tracking-tight" style={{ color: ACCENT }}>Matriz de tipos de pagamento suportados</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
                  <th className="py-2 pr-4 font-semibold">Gateway</th>
                  {TIPOS.map((t) => <th key={t} className="px-2 py-2 text-center font-semibold">{TIPO_LABEL[t]}</th>)}
                </tr>
              </thead>
              <tbody>
                {gateways.map((g) => (
                  <tr key={g.id} className="border-b border-stone-100">
                    <td className="py-2.5 pr-4 font-medium">{g.nome}</td>
                    {TIPOS.map((t) => (
                      <td key={t} className="px-2 py-2.5 text-center">
                        {g.caps.includes(t)
                          ? <Check className="mx-auto h-4 w-4 text-emerald-500" />
                          : <span className="mx-auto block h-3.5 w-3.5 rounded-full ring-1 ring-stone-200" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-5 flex items-start gap-1.5 text-xs text-stone-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> O sistema usa o gateway <strong>padrão</strong> para novas cobranças. Se o padrão não suportar o tipo pedido (ver matriz), a cobrança é bloqueada com aviso — sem troca automática. O gateway <strong>Manual</strong> está sempre disponível como fallback (registro e baixa na mão). Cada provedor real exige integração e homologação próprias; ativar aqui pressupõe credenciais válidas.
        </p>
      </main>

      {config && <ModalConfig gateway={config} onFechar={() => setConfig(null)} onSalvar={salvarConfig} />}
    </div>
  );
}

function ModalConfig({ gateway, onFechar, onSalvar }) {
  const schema = CRED_SCHEMA[gateway.id] || { verificar: false, campos: [] };
  const ehManual = gateway.id === "manual";
  const [valores, setValores] = useState({});
  const [modo, setModo] = useState(gateway.modo);
  const [visiveis, setVisiveis] = useState({}); // quais secrets estão revelados
  const set = (k, v) => setValores((s) => ({ ...s, [k]: v }));
  const toggleVer = (k) => setVisiveis((s) => ({ ...s, [k]: !s[k] }));

  // credenciado = todos os campos obrigatórios preenchidos
  const obrigatorios = schema.campos.filter((c) => !c.opcional);
  const completo = ehManual || obrigatorios.every((c) => (valores[c.key] || "").trim() !== "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onFechar}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold tracking-tight">Configurar {gateway.nome}</h3>
        <p className="mt-0.5 text-sm text-stone-500">
          {ehManual ? "Registro manual — não exige credenciais. Sempre disponível como fallback." : "Cada provedor autentica de um jeito próprio. Informe as credenciais específicas abaixo."}
        </p>

        {/* aviso de esquema não verificado */}
        {schema.verificar && !ehManual && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Os campos abaixo seguem o padrão de mercado, mas <strong>não foram confirmados na doc oficial</strong> deste provedor. Verifique antes de implementar de verdade.</span>
          </div>
        )}

        {!ehManual && (
          <>
            {schema.campos.map((campo) => (
              <div key={campo.key} className="mt-3">
                <label className="block text-xs font-semibold text-stone-600">
                  {campo.label}{campo.opcional && <span className="font-normal text-stone-400"> (opcional)</span>}
                </label>
                {campo.secret ? (
                  <div className="mt-1 flex items-center rounded-lg border border-stone-200">
                    <input type={visiveis[campo.key] ? "text" : "password"} value={valores[campo.key] || ""} onChange={(e) => set(campo.key, e.target.value)} placeholder="••••••••"
                      className="w-full rounded-lg bg-transparent px-3 py-2 text-sm focus:outline-none" />
                    <button onClick={() => toggleVer(campo.key)} className="px-3 text-stone-400 hover:text-stone-600">
                      {visiveis[campo.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                ) : (
                  <input value={valores[campo.key] || ""} onChange={(e) => set(campo.key, e.target.value)} placeholder="cole o valor do provedor"
                    className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none" />
                )}
                {campo.hint && <p className="mt-1 text-xs text-stone-400">{campo.hint}</p>}
              </div>
            ))}

            <p className="mt-2 flex items-start gap-1 text-xs text-stone-400"><Info className="mt-0.5 h-3 w-3 shrink-0" /> Segredos ficam em cofre criptografado (LGPD). Nunca em texto plano nem no front.</p>

            <label className="mt-3 block text-xs font-semibold text-stone-600">Modo</label>
            <div className="mt-1 flex gap-2">
              {[["sandbox", "Sandbox (teste)"], ["producao", "Produção"]].map(([k, r]) => (
                <button key={k} onClick={() => setModo(k)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${modo === k ? "text-white" : "text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50"}`}
                  style={modo === k ? { background: ACCENT } : {}}>{r}</button>
              ))}
            </div>
          </>
        )}

        <div className="mt-4 rounded-lg bg-stone-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">Este gateway faz</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {gateway.caps.map((c) => <span key={c} className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-stone-600 ring-1 ring-stone-200">{TIPO_LABEL[c]}</span>)}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">Cancelar</button>
          <button
            onClick={() => onSalvar({ ...gateway, modo, credenciado: completo })}
            disabled={!completo}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ background: ACCENT }}>
            <Save className="h-4 w-4" /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
