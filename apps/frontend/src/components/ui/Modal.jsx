import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Modal — overlay com conteúdo centralizado
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {string} props.title
 * @param {'sm'|'md'|'lg'|'xl'} props.size
 * @param {boolean} props.fullScreenMobile - Se true, modal ocupa tela inteira no mobile
 * @param {ReactNode} props.footer
 */
export default function Modal({ isOpen, onClose, title, size = 'md', fullScreenMobile = false, footer, children }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' };

  const mobileFullScreenClasses = fullScreenMobile
    ? 'sm:rounded-xl sm:max-h-[90vh] h-full sm:h-auto w-full sm:w-full rounded-none max-h-full'
    : 'rounded-xl max-h-[90vh]';

  const containerClasses = fullScreenMobile
    ? 'fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4'
    : 'fixed inset-0 z-50 flex items-center justify-center p-4';

  return (
    <div className={containerClasses}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white w-full ${sizes[size]} ${mobileFullScreenClasses} flex flex-col shadow-xl`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate pr-2">{title}</h2>
          <button onClick={onClose} className="p-2 -mr-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 overscroll-contain">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
