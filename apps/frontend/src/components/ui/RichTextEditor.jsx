import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const ACCENT = '#EA580C';

// Toolbar icons como SVG inline (evita dependência de versão do lucide)
const ToolIcon = ({ children, ...props }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {children}
  </svg>
);

const icons = {
  bold: <ToolIcon><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></ToolIcon>,
  italic: <ToolIcon><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></ToolIcon>,
  underline: <ToolIcon><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></ToolIcon>,
  h2: <span className="text-xs font-bold leading-none">H2</span>,
  h3: <span className="text-xs font-bold leading-none">H3</span>,
  ul: <ToolIcon><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></ToolIcon>,
  ol: <ToolIcon><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></ToolIcon>,
  quote: <ToolIcon><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z"/></ToolIcon>,
  alignLeft: <ToolIcon><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></ToolIcon>,
  alignCenter: <ToolIcon><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></ToolIcon>,
  image: <ToolIcon><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></ToolIcon>,
  link: <ToolIcon><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></ToolIcon>,
  hr: <ToolIcon><line x1="5" y1="12" x2="19" y2="12"/></ToolIcon>,
  undo: <ToolIcon><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></ToolIcon>,
  redo: <ToolIcon><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></ToolIcon>,
};

/**
 * Editor de texto rico baseado em contentEditable.
 */
export default function RichTextEditor({
  value = '',
  onChange,
  onImageUpload,
  placeholder = 'Comece a escrever...',
  minHeight = '400px',
}) {
  const editorRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!value);
  const fileInputRef = useRef(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
        checkEmpty();
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const checkEmpty = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText.trim();
    setIsEmpty(text === '' || text === '\n');
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    checkEmpty();
    onChange(editorRef.current.innerHTML);
  };

  const execCommand = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    handleInput();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      execCommand('insertHTML', '&emsp;');
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/') && onImageUpload) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) uploadAndInsertImage(file);
          return;
        }
      }
    }
    const html = e.clipboardData?.getData('text/html');
    if (html) {
      e.preventDefault();
      const cleaned = cleanPastedHtml(html);
      execCommand('insertHTML', cleaned);
    }
  };

  const cleanPastedHtml = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('script, style, meta, link').forEach(el => el.remove());
    div.querySelectorAll('*').forEach(el => {
      el.removeAttribute('style');
      el.removeAttribute('class');
    });
    return div.innerHTML;
  };

  const handleDrop = async (e) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0 && onImageUpload) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        await uploadAndInsertImage(file);
      }
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    await uploadAndInsertImage(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadAndInsertImage = async (file) => {
    if (!onImageUpload) return;
    try {
      setUploading(true);
      const url = await onImageUpload(file);
      if (url) {
        editorRef.current?.focus();
        const imgHtml = `<figure><img src="${url}" alt="" style="max-width:100%;height:auto;border-radius:8px;margin:16px 0;" /><figcaption></figcaption></figure><p><br/></p>`;
        execCommand('insertHTML', imgHtml);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleLinkClick = () => {
    const url = prompt('URL do link:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const handleHrClick = () => {
    execCommand('insertHTML', '<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;" />');
  };

  const ToolBtn = ({ icon, title, onClick, disabled }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
    >
      {icon}
    </button>
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-orange-200 focus-within:border-transparent transition-all">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-gray-50 border-b border-gray-200">
        <ToolBtn icon={icons.bold} title="Negrito (Ctrl+B)" onClick={() => execCommand('bold')} />
        <ToolBtn icon={icons.italic} title="Itálico (Ctrl+I)" onClick={() => execCommand('italic')} />
        <ToolBtn icon={icons.underline} title="Sublinhado (Ctrl+U)" onClick={() => execCommand('underline')} />

        <div className="w-px h-5 bg-gray-300 mx-1.5" />

        <ToolBtn icon={icons.h2} title="Título H2" onClick={() => execCommand('formatBlock', 'h2')} />
        <ToolBtn icon={icons.h3} title="Subtítulo H3" onClick={() => execCommand('formatBlock', 'h3')} />

        <div className="w-px h-5 bg-gray-300 mx-1.5" />

        <ToolBtn icon={icons.ul} title="Lista" onClick={() => execCommand('insertUnorderedList')} />
        <ToolBtn icon={icons.ol} title="Lista numerada" onClick={() => execCommand('insertOrderedList')} />
        <ToolBtn icon={icons.quote} title="Citação" onClick={() => execCommand('formatBlock', 'blockquote')} />

        <div className="w-px h-5 bg-gray-300 mx-1.5" />

        <ToolBtn icon={icons.alignLeft} title="Alinhar esquerda" onClick={() => execCommand('justifyLeft')} />
        <ToolBtn icon={icons.alignCenter} title="Centralizar" onClick={() => execCommand('justifyCenter')} />

        <div className="w-px h-5 bg-gray-300 mx-1.5" />

        <ToolBtn icon={icons.image} title="Inserir imagem" onClick={handleImageClick} disabled={uploading} />
        <ToolBtn icon={icons.link} title="Inserir link" onClick={handleLinkClick} />
        <ToolBtn icon={icons.hr} title="Linha separadora" onClick={handleHrClick} />

        <div className="w-px h-5 bg-gray-300 mx-1.5" />

        <ToolBtn icon={icons.undo} title="Desfazer" onClick={() => execCommand('undo')} />
        <ToolBtn icon={icons.redo} title="Refazer" onClick={() => execCommand('redo')} />

        {uploading && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
            <Loader2 size={14} className="animate-spin" />
            <span>Enviando imagem...</span>
          </div>
        )}
      </div>

      {/* Editor area */}
      <div className="relative">
        {isEmpty && (
          <div className="absolute top-4 left-4 text-gray-400 text-sm pointer-events-none select-none">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="outline-none px-4 py-4 text-sm text-gray-800 leading-relaxed overflow-y-auto
            [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-gray-900
            [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-gray-900
            [&_p]:mb-3 [&_p]:leading-relaxed
            [&_blockquote]:border-l-4 [&_blockquote]:border-orange-400 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-4
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3
            [&_li]:mb-1
            [&_a]:text-orange-600 [&_a]:underline
            [&_img]:rounded-lg [&_img]:max-w-full [&_img]:h-auto [&_img]:my-4
            [&_hr]:my-6 [&_hr]:border-gray-200
            [&_figure]:my-4 [&_figure]:text-center
            [&_figcaption]:text-xs [&_figcaption]:text-gray-500 [&_figcaption]:mt-2"
          style={{ minHeight }}
          suppressContentEditableWarning
        />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
