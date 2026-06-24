export default function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="text-center py-12">
      <span className="text-4xl">{icon}</span>
      <h3 className="mt-2 text-sm font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
