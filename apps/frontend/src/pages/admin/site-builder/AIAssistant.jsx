import React, { useState, useRef, useEffect } from 'react';
import {
  Bot, X, Send, Sparkles, FileText, Search, Wand2,
  MessageSquare, Loader2, ChevronDown, Zap, Layout
} from 'lucide-react';

const ACCENT = '#EA580C';

// ═══════════════════════════════════════════════════════════════
// AI ASSISTANT — Chat/prompt flutuante para criar páginas com IA
// Inclui: chat livre, atalhos rápidos, criação de página inteira
// ═══════════════════════════════════════════════════════════════

const QUICK_ACTIONS = [
  { id: 'page-home', label: 'Criar página Home', icon: Layout, prompt: 'Crie uma página Home profissional com hero fullscreen, galeria e CTA' },
  { id: 'page-sobre', label: 'Criar página Sobre', icon: FileText, prompt: 'Crie uma página Sobre mim para fotógrafo, com texto de apresentação e depoimentos' },
  { id: 'page-servicos', label: 'Criar página Serviços', icon: Zap, prompt: 'Crie uma página de Serviços com cards, descrições e FAQ' },
  { id: 'page-contato', label: 'Criar página Contato', icon: MessageSquare, prompt: 'Crie uma página de Contato com CTA e FAQ' },
  { id: 'suggest', label: 'Sugerir melhorias', icon: Search, prompt: 'Analise minha página atual e sugira melhorias de conteúdo e layout' },
  { id: 'seo', label: 'Otimizar SEO', icon: Wand2, prompt: 'Gere SEO otimizado para minha página atual' },
];

export default function AIAssistant({ authFetch, onPageGenerated, currentPage, onClose, isOpen }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Olá! Sou seu assistente de IA para criação de sites. Posso ajudar com:\n\n• Criar páginas inteiras a partir de uma descrição\n• Gerar textos, títulos e CTAs\n• Otimizar SEO\n• Sugerir blocos e melhorias\n\nComo posso ajudar?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setShowQuickActions(false);

    try {
      // Detect if user wants to generate a full page
      const isPageRequest = /cri[ae]|gere? (uma )?p[aá]gina|montar? (uma )?p[aá]gina|fazer? (uma )?p[aá]gina/i.test(text);

      if (isPageRequest) {
        // Generate full page
        const res = await authFetch('/admin/site/ai/generate-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            descricao: text,
            tipo_pagina: 'landing',
            nicho: 'fotografia',
          }),
        });
        const json = await res.json();

        if (json.success && json.data) {
          const page = json.data;
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Pronto! Criei a página "${page.titulo}" com ${page.blocos.length} blocos:\n\n${page.blocos.map((b, i) => `${i + 1}. **${b.type}** — ${b.props?.titulo || b.variant || ''}`).join('\n')}\n\nSEO: ${page.seo_titulo}\n\nDeseja aplicar esta página?`,
            action: { type: 'apply-page', data: page },
          }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: `Desculpe, não consegui gerar a página. ${json.message || 'Tente novamente.'}` }]);
        }
      } else {
        // Regular chat
        const res = await authFetch('/admin/site/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mensagem: text,
            contexto_pagina: currentPage ? {
              titulo: currentPage.titulo,
              blocos_count: currentPage.blocos?.length || 0,
            } : null,
          }),
        });
        const json = await res.json();

        if (json.success) {
          setMessages(prev => [...prev, { role: 'assistant', content: json.data.resposta }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: `Erro: ${json.message || 'Tente novamente.'}` }]);
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro de conexão. Verifique sua internet e tente novamente.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPage = (pageData) => {
    onPageGenerated?.(pageData);
    setMessages(prev => [...prev, { role: 'assistant', content: '✅ Página aplicada com sucesso! Você pode editar os blocos no editor visual.' }]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-[420px] h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm">
          <Bot size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-gray-900">Assistente IA</h3>
          <p className="text-[10px] text-gray-500">Powered by Amazon Bedrock</p>
        </div>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-orange-500 text-white rounded-br-md'
                : 'bg-gray-100 text-gray-800 rounded-bl-md'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {/* Action button for page generation */}
              {msg.action?.type === 'apply-page' && (
                <button
                  onClick={() => handleApplyPage(msg.action.data)}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-xl text-xs font-semibold hover:bg-orange-50 transition-colors border border-orange-200 shadow-sm"
                >
                  <Sparkles size={14} /> Aplicar página
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-orange-500" />
              <span className="text-sm text-gray-500">Gerando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {showQuickActions && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-1 mb-2">
            <Zap size={10} className="text-orange-500" />
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Ações rápidas</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => sendMessage(action.prompt)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-orange-50 hover:text-orange-700 border border-gray-100 hover:border-orange-200 transition-all text-left"
              >
                <action.icon size={12} className="text-gray-400 shrink-0" />
                <span className="truncate">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-end gap-2 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100 transition-all px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Crie uma página sobre mim focada em casamentos..."
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-gray-400 min-h-[20px] max-h-[80px]"
            rows={1}
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white disabled:opacity-30 transition-all hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-[9px] text-gray-400 mt-1.5 text-center">
          Dica: Peça "crie uma página..." para gerar páginas completas com IA
        </p>
      </div>
    </div>
  );
}
