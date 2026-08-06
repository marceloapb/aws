import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  Bold, Italic, Underline, List, ListOrdered, Image, Link2,
  Heading1, Heading2, Quote, Minus, AlignLeft, AlignCenter,
  Loader2, Undo2, Redo2, Code
} from 'lucide-react';

const ACCENT = '#EA580C';

/**
 * Editor de texto rico baseado em contentEditable.
 * Props:
 *  - value: HTML string
 *  - onChange: (html: string) => void
 *  - onImageUpload: (file: File) => Promise<string> — retorna URL da imagem
 *  - placeholder: string
 *  - minHeight: string (default '400px')
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

  // Sync value prop → editor content (only on initial or external change)
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
    // Tab indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      execCommand('insertHTML', '&emsp;');
    }
  };

  // Paste - strip formatting except images
  const handlePaste = (e) => {
    // Allow images in paste
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

    // For text paste, keep html if available
    const html = e.clipboardData?.getData('text/html');
    if (html) {
      e.preventDefault();
      // Clean unwanted styles but keep structure
      const cleaned = cleanPastedHtml(html);
      execCommand('insertHTML', cleaned);
    }
  };

  const cleanPastedHtml = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    // Remove script/style tags
    div.querySelectorAll('script, style, meta, link').forEach(el => el.remove());
    // Remove inline styles but keep structure
    div.querySelectorAll('*').forEach(el => {
      el.removeAttribute('style');
      el.removeAttribute('class');
    });
    return div.innerHTML;
  };

  // Drag & drop images
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

  // Image upload
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
        const imgHtml = `<figure class="editor-image"><img src="${url}" alt="" style="max-width:100%;height:auto;border-radius:8px;margin:16px 0;" /><figcaption></figcaption></figure><p><br/></p>`;
        execCommand('insertHTML', imgHtml);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  // Insert link
  const handleLinkClick = () => {
    const url = prompt('URL do link:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  // Insert horizontal rule
  const handleHrClick = () => {
    execCommand('insertHTML', '<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;" />');
  };

  // Toolbar button component
  const ToolBtn = ({ icon: Icon, title, onClick, active, disabled }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <Icon size={16} />
    </button>
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-orange-200 focus-within:border-transparent transition-all">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-gray-50 border-b border-gray-200">
        {/* Text formatting */}
        <ToolBtn icon={Bold} title="Negrito (Ctrl+B)" onClick={() => execCommand('bold')} />
        <ToolBtn icon={Italic} title="Itálico (Ctrl+I)" onClick={() => execCommand('italic')} />
        <ToolBtn icon={Underline} title="Sublinhado (Ctrl+U)" onClick={() => execCommand('underline')} />

        <div className="w-px h-5 bg-gray-300 mx-1.5" />

        {/* Headings */}
        <ToolBtn icon={Heading1} title="Título H2" onClick={() => execCommand('formatBlock', 'h2')} />
        <ToolBtn icon={Heading2} title="Subtítulo H3" onClick={() => execCommand('formatBlock', 'h3')} />

        <div className="w-px h-5 bg-gray-300 mx-1.5" />

        {/* Lists */}
        <ToolBtn icon={List} title="Lista" onClick={() => execCommand('insertUnorderedList')} />
        <ToolBtn icon={ListOrdered} title="Lista numerada" onClick={() => execCommand('insertOrderedList')} />
        <ToolBtn icon={Quote} title="Citação" onClick={() => execCommand('formatBlock', 'blockquote')} />

        <div className="w-px h-5 bg-gray-300 mx-1.5" />

        {/* Alignment */}
        <ToolBtn icon={AlignLeft} title="Alinhar esquerda" onClick={() => execCommand('justifyLeft')} />
        <ToolBtn icon={AlignCenter} title="Centralizar" onClick={() => execCommand('justifyCenter')} />

        <div className="w-px h-5 bg-gray-300 mx-1.5" />

        {/* Media & links */}
        <ToolBtn icon={Image} title="Inserir imagem" onClick={handleImageClick} disabled={uploading} />
        <ToolBtn icon={Link2} title="Inserir link" onClick={handleLinkClick} />
        <ToolBtn icon={Minus} title="Linha separadora" onClick={handleHrClick} />

        <div className="w-px h-5 bg-gray-300 mx-1.5" />

        {/* Undo/Redo */}
        <ToolBtn icon={Undo2} title="Desfazer" onClick={() => execCommand('undo')} />
        <ToolBtn icon={Redo2} title="Refazer" onClick={() => execCommand('redo')} />

        {/* Upload indicator */}
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
