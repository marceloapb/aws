import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.js';
import AdminLayout from './layouts/AdminLayout.jsx';
import ClienteLayout from './layouts/ClienteLayout.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Agenda from './pages/admin/Agenda.jsx';
import Clientes from './pages/admin/Clientes.jsx';
import ClienteDetalhe from './pages/admin/ClienteDetalhe.jsx';
import Orcamentos from './pages/admin/Orcamentos.jsx';
import OrcamentoDetalhe from './pages/admin/OrcamentoDetalhe.jsx';
import Cobrancas from './pages/admin/Cobrancas.jsx';
import Albuns from './pages/admin/Albuns.jsx';
import AlbumDetalhe from './pages/admin/AlbumDetalhe.jsx';
import Contratos from './pages/admin/Contratos.jsx';
import Instagram from './pages/admin/Instagram.jsx';
import GoogleCalendar from './pages/admin/GoogleCalendar.jsx';
import WhatsApp from './pages/admin/WhatsApp.jsx';
import Fotografos from './pages/admin/Fotografos.jsx';
import Equipamentos from './pages/admin/Equipamentos.jsx';
import Pendencias from './pages/admin/Pendencias.jsx';
import Configuracoes from './pages/admin/Configuracoes.jsx';

import PortalHome from './pages/portal/Home.jsx';
import PortalAlbuns from './pages/portal/Albuns.jsx';
import PortalAlbumDetalhe from './pages/portal/AlbumDetalhe.jsx';
import PortalContratos from './pages/portal/Contratos.jsx';
import PortalPagamentos from './pages/portal/Pagamentos.jsx';
import PortalOrcamentos from './pages/portal/Orcamentos.jsx';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="clientes/:id" element={<ClienteDetalhe />} />
        <Route path="orcamentos" element={<Orcamentos />} />
        <Route path="orcamentos/:id" element={<OrcamentoDetalhe />} />
        <Route path="cobrancas" element={<Cobrancas />} />
        <Route path="albuns" element={<Albuns />} />
        <Route path="albuns/:id" element={<AlbumDetalhe />} />
        <Route path="contratos" element={<Contratos />} />
        <Route path="instagram" element={<Instagram />} />
        <Route path="google-calendar" element={<GoogleCalendar />} />
        <Route path="whatsapp" element={<WhatsApp />} />
        <Route path="fotografos" element={<Fotografos />} />
        <Route path="equipamentos" element={<Equipamentos />} />
        <Route path="pendencias" element={<Pendencias />} />
        <Route path="configuracoes" element={<Configuracoes />} />
      </Route>
      <Route path="/portal" element={<ClienteLayout />}>
        <Route index element={<PortalHome />} />
        <Route path="albuns" element={<PortalAlbuns />} />
        <Route path="albuns/:id" element={<PortalAlbumDetalhe />} />
        <Route path="contratos" element={<PortalContratos />} />
        <Route path="pagamentos" element={<PortalPagamentos />} />
        <Route path="orcamentos" element={<PortalOrcamentos />} />
      </Route>
      <Route path="/" element={<Navigate to="/admin" />} />
      <Route path="*" element={<Navigate to="/admin" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
