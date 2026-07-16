import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Home from './pages/public/Home';
import ConfigEmpresa from './pages/admin/ConfigEmpresa';
import Catalogo from './pages/admin/Catalogo';
import Orcamentos from './pages/admin/Orcamentos';
import Agenda from './pages/admin/Agenda';
import Contratos from './pages/admin/Contratos';
import Financeiro from './pages/admin/Financeiro';
import Albuns from './pages/admin/Albuns';
import MeusOrcamentos from './pages/cliente/MeusOrcamentos';
import MeusContratos from './pages/cliente/MeusContratos';
import MeusAlbuns from './pages/cliente/MeusAlbuns';

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Público */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin/agenda' : '/cliente/orcamentos'} /> : <Login />} />
      <Route path="/cadastro" element={<Cadastro />} />

      {/* Admin */}
      <Route path="/admin" element={<PrivateRoute role="admin"><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="agenda" />} />
        <Route path="config" element={<ConfigEmpresa />} />
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="orcamentos" element={<Orcamentos />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="contratos" element={<Contratos />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="albuns" element={<Albuns />} />
      </Route>

      {/* Cliente */}
      <Route path="/cliente" element={<PrivateRoute role="cliente"><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="orcamentos" />} />
        <Route path="orcamentos" element={<MeusOrcamentos />} />
        <Route path="contratos" element={<MeusContratos />} />
        <Route path="albuns" element={<MeusAlbuns />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
