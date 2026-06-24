export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-gray-500">Página {page} de {totalPages}</p>
      <div className="flex gap-2">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 hover:bg-gray-50">
          Anterior
        </button>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 hover:bg-gray-50">
          Próxima
        </button>
      </div>
    </div>
  );
}
