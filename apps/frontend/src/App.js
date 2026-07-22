import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import SiteLayout from './pages/public/SiteLayout';
import HomePage from './pages/public/HomePage';
import PortfolioPage from './pages/public/PortfolioPage';
import NovidadesPage from './pages/public/NovidadesPage';
import NovidadeDetalhe from './pages/public/NovidadeDetalhe';
import SobrePage from './pages/public/SobrePage';
import ContatoPage from './pages/public/ContatoPage';
import Dashboard from './pages/admin/Dashboard';
import ConfigEmpresa from './pages/admin/ConfigEmpresa';
import Catalogo from './pages/admin/Catalogo';
import CatalogoForm from './pages/admin/CatalogoForm';
import Orcamentos from './pages/admin/Orcamentos';
import OrcamentoForm from './pages/admin/OrcamentoForm';
import OrcamentoDetalhe from './pages/admin/OrcamentoDetalhe';
import OrcamentoEditar from './pages/admin/OrcamentoEditar';
import Agenda from './pages/admin/Agenda';
import Contratos from './pages/admin/Contratos';
import ContratoDetalhe from './pages/admin/ContratoDetalhe';
import Financeiro from './pages/admin/Financeiro';
import Albuns from './pages/admin/Albuns';
import AlbumDetalhe from './pages/admin/AlbumDetalhe';
import Clientes from './pages/admin/Clientes';
import ClienteForm from './pages/admin/ClienteForm';
import ClienteDetalhe from './pages/admin/ClienteDetalhe';
import Feedback from './pages/admin/Feedback';
import NotasFiscais from './pages/admin/NotasFiscais';
// NfseConfig moved to ConfigEmpresa hub
import Aditivos from './pages/admin/Aditivos';
import Equipamentos from './pages/admin/Equipamentos';
import Portfolio from './pages/admin/Portfolio';
import Instagram from './pages/admin/Instagram';
import WhatsApp from './pages/admin/WhatsApp';
import Followup from './pages/admin/Followup';
import ImportCSV from './pages/admin/ImportCSV';
import Storage from './pages/admin/Storage';
import Notificacoes from './pages/admin/Notificacoes';
import MeuPerfil from './pages/admin/MeuPerfil';
import TrocarSenha from './pages/admin/TrocarSenha';
import GatewayConfig from './pages/admin/GatewayConfig';
import Onboarding from './pages/admin/Onboarding';
import IntegracoesLogs from './pages/admin/IntegracoesLogs';
import Integracoes from './pages/admin/Integracoes';
import Novidades from './pages/admin/Novidades';
import NovidadesEditor from './pages/admin/NovidadesEditor';
import CmsEditor from './pages/admin/CmsEditor';
import MeusOrcamentos from './pages/cliente/MeusOrcamentos';
import SolicitarOrcamento from './pages/cliente/SolicitarOrcamento';
import MeusContratos from './pages/cliente/MeusContratos';
import MeusAlbuns from './pages/cliente/MeusAlbuns';
// AlbumConfig moved to ConfigEmpresa hub
import AlbumView from './pages/cliente/AlbumView';
import CompletarCadastro from './pages/cliente/CompletarCadastro';
import ClienteDashboard from './pages/cliente/ClienteDashboard';
import MeusEventos from './pages/cliente/MeusEventos';
import EventoDetalhe from './pages/cliente/EventoDetalhe';
import MeusPagamentos from './pages/cliente/MeusPagamentos';
import MeuFeedback from './pages/cliente/MeuFeedback';
import MeuPerfilCliente from './pages/cliente/MeuPerfil';

function ClienteGuard({ children }) {
  const { user } = useAuth();
  const currentPath = window.location.pathname;
  if (user && user.role === 'client' && !user.perfil_completo) {
    return <Navigate to={`/cliente/completar-cadastro?returnUrl=${encodeURIComponent(currentPath)}`} replace />;
  }
  return children;
}

function App() {
  const { user } = useAuth();

  // Dynamic favicon from admin config
  React.useEffect(() => {
    const API = process.env.REACT_APP_API_URL || '';
    fetch(`${API}/public/site/config`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.favicon_url) {
          const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
          link.rel = 'icon';
          link.href = json.data.favicon_url;
          document.head.appendChild(link);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <Routes>
      {/* Público - Site */}
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/novidades" element={<NovidadesPage />} />
        <Route path="/novidades/:slug" element={<NovidadeDetalhe />} />
        <Route path="/sobre" element={<SobrePage />} />
        <Route path="/contato" element={<ContatoPage />} />
      </Route>

      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/cliente'} /> : <Login />} />
      <Route path="/cadastro" element={<Cadastro />} />

      {/* Admin */}
      <Route path="/admin/onboarding" element={<PrivateRoute role="admin"><Onboarding /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute role="admin"><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="config" element={<ConfigEmpresa />} />

        {/* Produtos e Serviços */}
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="catalogo/novo" element={<CatalogoForm />} />
        <Route path="catalogo/:id" element={<CatalogoForm />} />

        {/* Orçamentos */}
        <Route path="orcamentos" element={<Orcamentos />} />
        <Route path="orcamentos/novo" element={<OrcamentoForm />} />
        <Route path="orcamentos/:id" element={<OrcamentoDetalhe />} />
        <Route path="orcamentos/:id/editar" element={<OrcamentoEditar />} />

        {/* Agenda */}
        <Route path="agenda" element={<Agenda />} />

        {/* Contratos */}
        <Route path="contratos" element={<Contratos />} />
        <Route path="contratos/:id" element={<ContratoDetalhe />} />

        {/* Financeiro */}
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="gateway" element={<GatewayConfig />} />

        {/* Álbuns */}
        <Route path="albuns" element={<Albuns />} />
        <Route path="albuns/:id" element={<AlbumDetalhe />} />
        <Route path="albuns/config" element={<Navigate to="/admin/config?tab=albuns" replace />} />

        {/* Portfólio */}
        <Route path="portfolio" element={<Portfolio />} />

        {/* Clientes */}
        <Route path="clientes" element={<Clientes />} />
        <Route path="clientes/novo" element={<ClienteForm />} />
        <Route path="clientes/:id/editar" element={<ClienteForm />} />
        <Route path="clientes/:id" element={<ClienteDetalhe />} />

        {/* Outros */}
        <Route path="feedback" element={<Feedback />} />
        <Route path="notas-fiscais" element={<NotasFiscais />} />
        <Route path="nfse/config" element={<Navigate to="/admin/config?tab=nfse" replace />} />
        <Route path="aditivos" element={<Aditivos />} />
        <Route path="equipamentos" element={<Equipamentos />} />
        <Route path="instagram" element={<Instagram />} />
        <Route path="whatsapp" element={<WhatsApp />} />
        <Route path="integracoes" element={<Integracoes />} />
        <Route path="integracoes/logs" element={<IntegracoesLogs />} />
        <Route path="followup" element={<Followup />} />
        <Route path="novidades" element={<Novidades />} />
        <Route path="novidades/novo" element={<NovidadesEditor />} />
        <Route path="novidades/:id/editar" element={<NovidadesEditor />} />
        <Route path="cms" element={<CmsEditor />} />
        <Route path="import" element={<ImportCSV />} />
        <Route path="storage" element={<Storage />} />
        <Route path="notificacoes" element={<Notificacoes />} />
        <Route path="meu-perfil" element={<MeuPerfil />} />
        <Route path="trocar-senha" element={<TrocarSenha />} />
      </Route>

      {/* Cliente */}
      <Route path="/cliente/completar-cadastro" element={<PrivateRoute role="client"><CompletarCadastro /></PrivateRoute>} />
      <Route path="/cliente" element={<PrivateRoute role="client"><ClienteGuard><Layout /></ClienteGuard></PrivateRoute>}>
        <Route index element={<ClienteDashboard />} />
        <Route path="eventos" element={<MeusEventos />} />
        <Route path="eventos/:id" element={<EventoDetalhe />} />
        <Route path="orcamentos" element={<MeusOrcamentos />} />
        <Route path="orcamentos/novo" element={<SolicitarOrcamento />} />
        <Route path="contratos" element={<MeusContratos />} />
        <Route path="pagamentos" element={<MeusPagamentos />} />
        <Route path="albuns" element={<MeusAlbuns />} />
        <Route path="albuns/:slug" element={<AlbumView />} />
        <Route path="feedback/:id" element={<MeuFeedback />} />
        <Route path="dados" element={<MeuPerfilCliente />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
