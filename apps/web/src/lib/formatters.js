export const formatarMoeda = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
export const formatarData = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '';
export const formatarDataHora = (d) => d ? new Date(d).toLocaleString('pt-BR') : '';
export const formatarCPF = (v) => v ? v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '';
export const formatarTelefone = (v) => {
  if (!v) return '';
  const n = v.replace(/\D/g, '');
  return n.length === 11 ? n.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : n.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
};
export const formatarBytes = (b) => {
  if (!b) return '0 B';
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(1)} ${['B', 'KB', 'MB', 'GB'][i]}`;
};
export const statusLabel = (s) => ({ pendente: 'Pendente', pago: 'Pago', vencido: 'Vencido', cancelado: 'Cancelado', estornado: 'Estornado', ativo: 'Ativo', expirado: 'Expirado', rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado', rejeitado: 'Rejeitado', assinado: 'Assinado', agendado: 'Agendado', publicado: 'Publicado', erro: 'Erro' }[s] || s);
export const statusColor = (s) => ({ pendente: 'bg-yellow-100 text-yellow-800', pago: 'bg-green-100 text-green-800', vencido: 'bg-red-100 text-red-800', cancelado: 'bg-gray-100 text-gray-800', ativo: 'bg-green-100 text-green-800', expirado: 'bg-red-100 text-red-800', aprovado: 'bg-green-100 text-green-800', enviado: 'bg-blue-100 text-blue-800', assinado: 'bg-green-100 text-green-800', publicado: 'bg-green-100 text-green-800', agendado: 'bg-blue-100 text-blue-800', erro: 'bg-red-100 text-red-800' }[s] || 'bg-gray-100 text-gray-800');
