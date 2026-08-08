import React, { useState } from 'react';
import { GripVertical, Check, Trash2, FolderInput, ImageIcon, CheckSquare, Square } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const ACCENT = '#EA580C';

// Sortable photo item component
function SortablePhoto({ foto, idx, isSelected, onSelect, selectedIds }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: foto.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const [loaded, setLoaded] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-blue-500 ring-offset-2'
          : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1'
      } ${isDragging ? 'scale-95 shadow-xl' : ''}`}
      onClick={() => onSelect?.(foto.id)}
    >
      {/* Skeleton shimmer while loading */}
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer" />
        </div>
      )}

      <img
        src={foto.thumb_url || foto.url}
        alt={foto.nome || `Foto ${idx + 1}`}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
      />

      {/* Hover overlay */}
      <div className={`absolute inset-0 transition-opacity ${isSelected ? 'bg-blue-500/20' : 'bg-black/0 group-hover:bg-black/10'}`} />

      {/* Checkbox */}
      <div className={`absolute top-2 left-2 w-5 h-5 rounded flex items-center justify-center transition-all ${
        isSelected ? 'bg-blue-500' : 'bg-white/80 border border-gray-300 opacity-0 group-hover:opacity-100'
      }`}>
        {isSelected && <Check size={12} className="text-white" />}
      </div>

      {/* Drag handle — visible on hover, touch-friendly */}
      <div
        className="absolute top-2 right-2 p-2 rounded bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} className="text-gray-600" />
      </div>
    </div>
  );
}

// Drag overlay thumbnail
function DragOverlayItem({ foto }) {
  if (!foto) return null;
  return (
    <div className="aspect-square w-32 rounded-lg overflow-hidden shadow-2xl ring-2 ring-orange-400 opacity-90">
      <img
        src={foto.thumb_url || foto.url}
        alt={foto.nome || 'Foto'}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export default function FotoGrid({ fotos = [], selectedIds = [], onSelect, onSelectAll, onDelete, onMove, onSetCover, onReorder, galerias = [] }) {
  const [showMoveDropdown, setShowMoveDropdown] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const hasSelection = selectedIds.length > 0;
  const allSelected = fotos.length > 0 && selectedIds.length === fotos.length;

  // @dnd-kit sensors — PointerSensor for mouse, TouchSensor for mobile
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = fotos.findIndex((f) => f.id === active.id);
    const newIndex = fotos.findIndex((f) => f.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(fotos, oldIndex, newIndex);
    onReorder?.(newOrder.map((f) => f.id));
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeFoto = activeId ? fotos.find((f) => f.id === activeId) : null;

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
      {/* Bulk action bar — responsive with wrap */}
      {hasSelection && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-white border rounded-xl shadow-sm">
          <button
            onClick={() => onSelectAll?.(!allSelected)}
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 hover:text-gray-800"
          >
            {allSelected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
            <span className="hidden sm:inline">{allSelected ? 'Desmarcar todas' : 'Selecionar todas'}</span>
            <span className="sm:hidden">{allSelected ? 'Todas' : 'Todas'}</span>
          </button>
          <span className="text-xs sm:text-sm text-gray-500">{selectedIds.length} sel.</span>
          <div className="flex-1 min-w-0" />

          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <button
              onClick={() => onDelete?.(selectedIds)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all"
            >
              <Trash2 size={14} /><span className="hidden xs:inline">Excluir</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMoveDropdown(!showMoveDropdown)}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
              >
                <FolderInput size={14} /><span className="hidden xs:inline">Mover</span>
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
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ImageIcon size={14} /><span className="hidden sm:inline">Definir capa</span><span className="sm:hidden">Capa</span>
            </button>
          </div>
        </div>
      )}

      {/* Photo grid with @dnd-kit */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={fotos.map((f) => f.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {fotos.map((foto, idx) => (
              <SortablePhoto
                key={foto.id}
                foto={foto}
                idx={idx}
                isSelected={selectedIds.includes(foto.id)}
                onSelect={onSelect}
                selectedIds={selectedIds}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          <DragOverlayItem foto={activeFoto} />
        </DragOverlay>
      </DndContext>
    </div>
  );
}
