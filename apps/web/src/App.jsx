import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';

// Admin pages (lazy loaded)
import { lazy, Suspense } from 'react';
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminAgenda = lazy(() => import('./pages/admin/Agenda'));
const AdminClientes = lazy(() => import('./pages/admin/Clientes'));
const AdminContratos = lazy(() => import('./pages/admin/Contratos'));
const AdminOrcamentos = lazy(() => import('./pages/admin/Orcamentos'));
const AdminAlbuns = lazy(() => import('./pages/admin/Albuns'));
const AdminEquipamentos = lazy(() => import('./pages/admin/Equipamentos'));
const AdminCobrancas = lazy(() => import('./pages/admin/Cobrancas'));
const AdminConfiguracoes = lazy(() => import('./pages/admin/Configuracoes'));

// Portal pages (lazy loaded)
const PortalAlbuns = lazy(() => import('./pages/portal/Albuns'));
const PortalContratos = lazy(() => import('./pages/portal/Contratos'));
const PortalOrcamentos = lazy(() => import('./pages/portal/Orcamentos'));
const PortalPagamentos = lazy(() => import('./pages/portal/Pagamentos'));

// Páginas Públicas (site institucional - sem auth)
const PublicHome = lazy(() => import('./pages/public/Home'));
const PublicPortfolio = lazy(() => import('./pages/public/Portfolio'));
const PublicPacotes = lazy(() => import('./pages/public/Pacotes'));
const PublicContato = lazy(() => import('./pages/public/Contato'));

const Loading = () => <div className="flex justify-center items-center min-h-screen"><p>Carregando...</p></div>;

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Rotas Públicas - Site Institucional */}
            <Route path="/site/:photographerId" element={<PublicHome />} />
            <Route path="/site/:photographerId/portfolio" element={<PublicPortfolio />} />
            <Route path="/site/:photographerId/pacotes" element={<PublicPacotes />} />
            <Route path="/site/:photographerId/contato" element={<PublicContato />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />

            {/* Admin */}
            <Route path="/admin" element={<PrivateRoute role="admin" />}>
              <Route index element={<AdminDashboard />} />
              <Route path="agenda" element={<AdminAgenda />} />
              <Route path="clientes" element={<AdminClientes />} />
              <Route path="contratos" element={<AdminContratos />} />
              <Route path="orcamentos" element={<AdminOrcamentos />} />
              <Route path="albuns" element={<AdminAlbuns />} />
              <Route path="equipamentos" element={<AdminEquipamentos />} />
              <Route path="cobrancas" element={<AdminCobrancas />} />
              <Route path="configuracoes" element={<AdminConfiguracoes />} />
            </Route>

            {/* Portal do Cliente */}
            <Route path="/portal" element={<PrivateRoute role="client" />}>
              <Route path="albuns" element={<PortalAlbuns />} />
              <Route path="contratos" element={<PortalContratos />} />
              <Route path="orcamentos" element={<PortalOrcamentos />} />
              <Route path="pagamentos" element={<PortalPagamentos />} />
            </Route>

            {/* Redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
