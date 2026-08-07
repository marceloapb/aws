import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, Wand2, ChevronDown } from 'lucide-react';

const ACCENT = '#EA580C';

// ═══════════════════════════════════════════════════════════════
// AI FIELD HELPER — Botão "Gerar com IA" reutilizável
// Pode ser usado em qualquer campo de texto do Site Builder
// Suporta: gerar novo texto, reescrever existente, múltiplos estilos
// ═══════════════════════════════════════════════════════════════

const ESTILOS = [
  { key: 'profissional', label: 'Profissional' },
  { key: 'emocional', label: 'Emocional' },
  { key: 'criativo', label: 'Criativo' },
  { key: 'direto', label: 'Direto' },
  { key: 'poetico', label: 'Poético' },
  { key: 'formal', label: 'Formal' },
];

/**
 * Botão de IA inline para campos de texto
 * 
 * Props:
 * - authFetch: função de fetch autenticado
 * - tipoCampo: 'titulo' | 'subtitulo' | 'conteudo' | 'botao_texto' | 'citacao'
 * - contexto: contexto adicional para a geração (ex: nome da seção)
 * - valorAtual: valor atual do campo (para reescrita)
 * - onGenerated: callback com o texto gerado
 * - compact: boolean, se true mostra apenas ícone
 */
export default function AIFieldHelper({ authFetch, tipoCampo, contexto = '', valorAtual = '', onGenerated, compact = false }) {
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState(null);

  const generateText = async (estilo = 'profissional') => {
    setLoading(true);
    setError(null);
    setShowMenu(false);

    try {
      const res = await authFetch('/admin/site/ai/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo_campo: tipoCampo, contexto, tom: estilo }),
      });
      const json = await res.json();

      if (json.success && json.data?.texto) {
        onGenerated(json.data.texto);
      } else {
        setError(json.message || 'Erro ao gerar');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const rewriteText = async (estilo = 'profissional') => {
    if (!valorAtual.trim()) {
      generateText(estilo);
      return;
    }

    setLoading(true);
    setError(null);
    setShowMenu(false);

    try {
      const res = await authFetch('/admin/site/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: valorAtual, estilo }),
      });
      const json = await res.json();

      if (json.success && json.data?.texto) {
        onGenerated(json.data.texto);
      } else {
        setError(json.message || 'Erro ao reescrever');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    // Se já tem texto, mostra menu com opções de reescrita
    if (valorAtual.trim()) {
      setShowMenu(!showMenu);
    } else {
      // Se não tem texto, gera direto
      generateText();
    }
  };

  if (compact) {
    return (
      <div className="relative inline-flex">
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="p-1.5 rounded-md hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition-all disabled:opacity-50"
          title="Gerar com IA"
        >
          {loading ? <Loader2 size={13} className="animate-spin text-orange-500" /> : <Sparkles size={13} />}
        </button>

        {showMenu && (
          <AIMenu
            hasText={!!valorAtual.trim()}
            onGenerate={generateText}
            onRewrite={rewriteText}
            onClose={() => setShowMenu(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border transition-all disabled:opacity-50
          text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-300"
      >
        {loading ? (
          <>
            <Loader2 size={10} className="animate-spin" />
            <span>Gerando...</span>
          </>
        ) : valorAtual.trim() ? (
          <>
            <RefreshCw size={10} />
            <span>Reescrever</span>
            <ChevronDown size={8} />
          </>
        ) : (
          <>
            <Sparkles size={10} />
            <span>Gerar com IA</span>
          </>
        )}
      </button>

      {error && (
        <span className="absolute -bottom-5 left-0 text-[9px] text-red-500 whitespace-nowrap">{error}</span>
      )}

      {showMenu && (
        <AIMenu
          hasText={!!valorAtual.trim()}
          onGenerate={generateText}
          onRewrite={rewriteText}
          onClose={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}

/**
 * Menu dropdown com opções de estilo para geração/reescrita
 */
function AIMenu({ hasText, onGenerate, onRewrite, onClose }) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Menu */}
      <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in zoom-in-95">
        {hasText && (
          <>
            <div className="px-3 py-1">
              <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Reescrever como</span>
            </div>
            {ESTILOS.map(e => (
              <button
                key={e.key}
                onClick={() => onRewrite(e.key)}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2 transition-colors"
              >
                <Wand2 size={11} className="text-orange-400" />
                {e.label}
              </button>
            ))}
            <div className="border-t border-gray-100 my-1" />
          </>
        )}

        <div className="px-3 py-1">
          <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Gerar novo</span>
        </div>
        {ESTILOS.slice(0, 4).map(e => (
          <button
            key={`gen-${e.key}`}
            onClick={() => onGenerate(e.key)}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2 transition-colors"
          >
            <Sparkles size={11} className="text-orange-400" />
            {e.label}
          </button>
        ))}
      </div>
    </>
  );
}

/**
 * Botão de IA para gerar FAQ completo
 */
export function AIFaqGenerator({ authFetch, onGenerated, servicos = [] }) {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/admin/site/ai/generate-faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servicos, quantidade: 5, nicho: 'fotografia' }),
      });
      const json = await res.json();

      if (json.success && json.data?.items) {
        onGenerated(json.data.items);
      }
    } catch (err) {
      console.error('AI FAQ error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={generate}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all disabled:opacity-50
        text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-sm"
    >
      {loading ? (
        <>
          <Loader2 size={12} className="animate-spin" />
          <span>Gerando FAQ...</span>
        </>
      ) : (
        <>
          <Sparkles size={12} />
          <span>Gerar FAQ com IA</span>
        </>
      )}
    </button>
  );
}

/**
 * Botão de IA para gerar Serviços completos
 */
export function AIServicesGenerator({ authFetch, onGenerated }) {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/admin/site/ai/generate-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicho: 'fotografia', quantidade: 4 }),
      });
      const json = await res.json();

      if (json.success && json.data?.items) {
        onGenerated(json.data.items);
      }
    } catch (err) {
      console.error('AI Services error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={generate}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all disabled:opacity-50
        text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-sm"
    >
      {loading ? (
        <>
          <Loader2 size={12} className="animate-spin" />
          <span>Gerando serviços...</span>
        </>
      ) : (
        <>
          <Sparkles size={12} />
          <span>Gerar Serviços com IA</span>
        </>
      )}
    </button>
  );
}

/**
 * Botão de IA para gerar SEO
 */
export function AISeoGenerator({ authFetch, tituloPagina, blocos = [], onGenerated }) {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/admin/site/ai/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo_pagina: tituloPagina, blocos, nicho: 'fotografia' }),
      });
      const json = await res.json();

      if (json.success && json.data) {
        onGenerated(json.data);
      }
    } catch (err) {
      console.error('AI SEO error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={generate}
      disabled={loading || !tituloPagina}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all disabled:opacity-50
        text-orange-600 bg-orange-50 border border-orange-200 hover:bg-orange-100 hover:border-orange-300"
    >
      {loading ? (
        <>
          <Loader2 size={12} className="animate-spin" />
          <span>Otimizando...</span>
        </>
      ) : (
        <>
          <Wand2 size={12} />
          <span>Gerar SEO com IA</span>
        </>
      )}
    </button>
  );
}
