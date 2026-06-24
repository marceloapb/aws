import { Menu, User } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export default function Header({ title, onMenuClick }) {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden text-gray-500 hover:text-gray-700">
          <Menu className="h-6 w-6" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
          {user?.name || 'Fotógrafo'}
        </span>
        <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
          <User className="h-4 w-4 text-primary-600" />
        </div>
      </div>
    </header>
  );
}
