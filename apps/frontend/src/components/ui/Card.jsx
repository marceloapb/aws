export default function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {title && <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{title}</h4>}
      {children}
    </div>
  );
}
