import React, { useState, useRef } from 'react';
import { GripVertical, Check, Trash2, FolderInput, ImageIcon, CheckSquare, Square } from 'lucide-react';

const ACCENT = '#EA580C';

export default function FotoGrid({ fotos = [], selectedIds = [], onSelect, onSelectAll, onDelete, onMove, onSetCover, onReorder, galerias = [] }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [showMoveDropdown, setShowMoveDropdown] = useState(false);

  const hasSelection = selectedIds.length > 0;
  const allSelected = fotos.length > 0 && selectedIds.length === fotos.length;

  // Drag reorder
  const handleDragStart = (e, idx) => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    const sourceIdx = dragIdx;
    setDragIdx(null);
    setDragOverIdx(null);
    if (sourceIdx === null || sourceIdx === targetIdx) return;
    const newOrder = [...fotos];
    const [moved] = newOrder.splice(sourceIdx, 1);
    newOrder.splice(targetIdx, 0, moved);
    onReorder?.(newOrder.map((f) => f.id));
  };

  // Empty state
  if (fotos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ImageIcon size={48} className="text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-500">Nenhuma foto</h3>
        <p className="text-sm text-gray-400 mt-1">Faça upload de fotos para começar</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {hasSelection && (
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-white border rounded-xl shadow-sm">
          <button
            onClick={() => onSelectAll?.(!allSelected)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
          >
            {allSelected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
            {allSelected ? 'Desmarcar todas' : 'Selecionar todas'}
          </button>
          <span className="text-sm text-gray-500">{selectedIds.length} selecionada(s)</span>
          <div className="flex-1" />

          <button
            onClick={() => onDelete?.(selectedIds)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <Trash2 size={14} />Excluir
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMoveDropdown(!showMoveDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
            >
              <FolderInput size={14} />Mover
            </button>
            {showMoveDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-lg shadow-lg py-1 z-20">
                {galerias.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => { onMove?.(selectedIds, g.id); setShowMoveDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {g.nome}
                  </button>
                ))}
                {galerias.length === 0 && <p className="px-4 py-2 text-sm text-gray-400">Nenhuma galeria</p>}
              </div>
            )}
          </div>

          <button
            onClick={() => onSetCover?.(selectedIds[0])}
            disabled={selectedIds.length !== 1}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ImageIcon size={14} />Definir capa
          </button>
        </div>
      )}

      {/* Photo grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {fotos.map((foto, idx) => {
          const isSelected = selectedIds.includes(foto.id);
          const isDragging = dragIdx === idx;
          const isDragOver = dragOverIdx === idx;

          return (
            <div
              key={foto.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, idx)}
              className={`relative group aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1'} ${isDragging ? 'opacity-50 scale-95' : ''} ${isDragOver ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`}
              onClick={() => onSelect?.(foto.id)}
            >
              <img
                src={foto.thumb_url || foto.url}
                alt={foto.nome || `Foto ${idx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />

              {/* Hover overlay */}
              <div className={`absolute inset-0 transition-opacity ${isSelected ? 'bg-blue-500/20' : 'bg-black/0 group-hover:bg-black/10'}`} />

              {/* Checkbox */}
              <div className={`absolute top-2 left-2 w-5 h-5 rounded flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500' : 'bg-white/80 border border-gray-300 opacity-0 group-hover:opacity-100'}`}>
                {isSelected && <Check size={12} className="text-white" />}
              </div>

              {/* Drag handle */}
              <div className="absolute top-2 right-2 p-1 rounded bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                <GripVertical size={12} className="text-gray-600" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
