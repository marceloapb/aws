import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import AdminLayout from '../layouts/AdminLayout.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

export default function PrivateRoute({ role }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner size="lg" />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;

  if (role === 'admin') return <AdminLayout />;

  return <Outlet />;
}
