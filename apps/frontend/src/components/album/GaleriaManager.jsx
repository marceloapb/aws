import React, { useState, useRef } from 'react';
import { GripVertical, Pencil, Trash2, Plus, Check, X, Image, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';

const ACCENT = '#EA580C';
const MAX_GALERIAS = 20;

export default function GaleriaManager({ albumId, galerias = [], onUpdate, activeGaleria, onSelect }) {
  const { authFetch } = useAuth();
  const toast = useToast();

  const [showNova, setShowNova] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const handleCreate = async () => {
    if (!novoNome.trim()) return;
    setCreating(true);
    try {
      const res = await authFetch(`/admin/albuns/${albumId}/galerias`, {
        method: 'POST',
        body: JSON.stringify({ nome: novoNome.trim() }),
      });
      if (!res.ok) throw new Error('Falha ao criar galeria');
      toast.success('Galeria criada');
      setNovoNome('');
      setShowNova(false);
      onUpdate?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (galeria) => { setEditingId(galeria.id); setEditValue(galeria.nome); };

  const handleRename = async (galeriaId) => {
    if (!editValue.trim()) { setEditingId(null); return; }
    try {
      const res = await authFetch(`/admin/albuns/${albumId}/galerias/${galeriaId}`, {
        method: 'PUT',
        body: JSON.stringify({ nome: editValue.trim() }),
      });
      if (!res.ok) throw new Error('Falha ao renomear');
      toast.success('Galeria renomeada');
      setEditingId(null);
      onUpdate?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (galeria) => {
    if (galeria.foto_count > 0) { toast.warning('Só é possível excluir galerias vazias'); return; }
    if (!window.confirm(`Excluir galeria "${galeria.nome}"?`)) return;
    try {
      const res = await authFetch(`/admin/albuns/${albumId}/galerias/${galeria.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir');
      toast.success('Galeria excluída');
      onUpdate?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDragStart = (e, idx) => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e, idx) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverIdx(idx); };
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

  const handleDrop = async (e, targetIdx) => {
    e.preventDefault();
    const sourceIdx = dragIdx;
    setDragIdx(null);
    setDragOverIdx(null);
    if (sourceIdx === null || sourceIdx === targetIdx) return;

    const newOrder = [...galerias];
    const [moved] = newOrder.splice(sourceIdx, 1);
    newOrder.splice(targetIdx, 0, moved);

    try {
      await authFetch(`/admin/albuns/${albumId}/galerias/reordenar`, {
        method: 'PUT',
        body: JSON.stringify({ ordem: newOrder.map((g) => g.id) }),
      });
      onUpdate?.();
    } catch (err) {
      toast.error('Falha ao reordenar');
    }
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        {galerias.map((galeria, idx) => {
          const isActive = galeria.id === activeGaleria;
          const isEditing = editingId === galeria.id;
          const isDragging = dragIdx === idx;
          const isDragOver = dragOverIdx === idx;

          return (
            <div
              key={galeria.id}
              draggable={!isEditing}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, idx)}
              onClick={() => !isEditing && onSelect?.(galeria.id)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${isActive ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50 border border-transparent'} ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-orange-400 border-dashed' : ''}`}
            >
              <GripVertical size={14} className="flex-shrink-0 text-gray-300 group-hover:text-gray-500 cursor-grab" />

              {isEditing ? (
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRename(galeria.id); if (e.key === 'Escape') setEditingId(null); }}
                    autoFocus className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-orange-300"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button onClick={(e) => { e.stopPropagation(); handleRename(galeria.id); }} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={14} /></button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm truncate block ${isActive ? 'font-medium text-gray-900' : 'text-gray-700'}`}>{galeria.nome}</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-gray-400"><Image size={12} />{galeria.foto_count ?? 0}</span>
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <button onClick={(e) => { e.stopPropagation(); startEdit(galeria); }} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600" title="Renomear"><Pencil size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(galeria); }} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title="Excluir"><Trash2 size={12} /></button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {galerias.length >= MAX_GALERIAS && (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-yellow-700 bg-yellow-50 rounded-lg">
          <AlertTriangle size={14} /><span>Limite de {MAX_GALERIAS} galerias atingido</span>
        </div>
      )}

      {showNova ? (
        <div className="flex items-center gap-2 px-3 py-2">
          <input
            type="text" value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setShowNova(false); setNovoNome(''); } }}
            placeholder="Nome da galeria" autoFocus
            className="flex-1 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-300"
          />
          <button onClick={handleCreate} disabled={creating || !novoNome.trim()} className="p-1.5 text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-all" style={{ backgroundColor: ACCENT }}><Check size={14} /></button>
          <button onClick={() => { setShowNova(false); setNovoNome(''); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={14} /></button>
        </div>
      ) : (
        galerias.length < MAX_GALERIAS && (
          <button onClick={() => setShowNova(true)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all">
            <Plus size={14} />Nova Galeria
          </button>
        )
      )}
    </div>
  );
}
