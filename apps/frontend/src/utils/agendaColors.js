export const STATUS_COLORS = {
  confirmado: { pill: 'bg-emerald-500 text-white', border: 'border-l-4 border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  pendente: { pill: 'bg-orange-500 text-white', border: 'border-l-4 border-l-orange-500', badge: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  reserva: { pill: 'bg-orange-500 text-white', border: 'border-l-4 border-l-orange-500', badge: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  bloqueado: { pill: 'bg-gray-400 text-white', border: 'border-l-4 border-l-gray-400', badge: 'bg-gray-100 text-gray-800', dot: 'bg-gray-400' },
  bloqueio: { pill: 'bg-gray-400 text-white', border: 'border-l-4 border-l-gray-400', badge: 'bg-gray-100 text-gray-800', dot: 'bg-gray-400' },
  cancelado: { pill: 'bg-red-500 text-white', border: 'border-l-4 border-l-red-500', badge: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
};

export const TIPO_COLORS = {
  Casamento: 'bg-pink-500',
  Ensaio: 'bg-blue-500',
  Corporativo: 'bg-green-500',
  Aniversário: 'bg-purple-500',
  Batizado: 'bg-sky-500',
  Newborn: 'bg-rose-400',
  '15 anos': 'bg-fuchsia-500',
  Bloqueio: 'bg-gray-400',
  Outro: 'bg-slate-500',
};

export function getStatusColor(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.pendente;
}

export function getTipoColor(tipo) {
  return TIPO_COLORS[tipo] || TIPO_COLORS.Outro;
}
