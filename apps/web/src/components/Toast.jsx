export default function Toast({ toasts }) {
  if (!toasts || toasts.length === 0) return null;
  const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500', warning: 'bg-yellow-500' };
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className={`${colors[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg text-sm`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
