import React from 'react';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="logo">MBF</div>
        <nav className="nav">
          <a href="#features">Recursos</a>
          <a href="#pricing">Planos</a>
          <a href="#contact">Contato</a>
          <a href="/login" className="btn-login">Entrar</a>
        </nav>
      </header>

      <main className="hero">
        <div className="hero-content">
          <h1>Sua plataforma de<br /><span className="highlight">fotografia profissional</span></h1>
          <p className="subtitle">
            Entregue galerias protegidas, receba seleções online e gerencie
            seus clientes — tudo em um só lugar.
          </p>
          <div className="cta-group">
            <a href="/register" className="btn-primary">Começar grátis</a>
            <a href="#features" className="btn-secondary">Saiba mais</a>
          </div>
        </div>
        <div className="hero-visual">
          <div className="mockup">
            <div className="mockup-header">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
            </div>
            <div className="mockup-body">
              <div className="gallery-grid">
                <div className="photo-placeholder"></div>
                <div className="photo-placeholder"></div>
                <div className="photo-placeholder"></div>
                <div className="photo-placeholder"></div>
                <div className="photo-placeholder"></div>
                <div className="photo-placeholder"></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section id="features" className="features">
        <h2>Tudo que você precisa</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Galerias Protegidas</h3>
            <p>URLs assinadas com expiração. Só quem recebe o link acessa.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">✅</div>
            <h3>Seleção Online</h3>
            <p>Clientes escolhem as fotos favoritas direto na galeria.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📦</div>
            <h3>Entrega Automatizada</h3>
            <p>Após seleção, as fotos são entregues automaticamente.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Dashboard</h3>
            <p>Acompanhe jobs, clientes e entregas em um painel completo.</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>&copy; 2026 MBF Foto. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

export default App;
