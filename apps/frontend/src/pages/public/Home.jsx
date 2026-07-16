import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Heart, Star, ArrowRight } from 'lucide-react';

const ACCENT = '#EA580C';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <nav className="relative z-10 flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center gap-2">
            <Camera size={28} style={{ color: ACCENT }} />
            <span className="text-xl font-bold">MBFoto</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-gray-300 hover:text-white transition-colors">Entrar</Link>
            <Link to="/cadastro" style={{ background: ACCENT }} className="text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">Criar conta</Link>
          </div>
        </nav>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 lg:py-36">
          <div className="max-w-2xl">
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
              Fotografia que conta <span style={{ color: ACCENT }}>histórias</span>
            </h1>
            <p className="mt-6 text-lg text-gray-300 leading-relaxed">
              Transformamos momentos em memórias eternas. Casamentos, ensaios, eventos — cada clique é único.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/cadastro" style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
                Solicitar orçamento <ArrowRight size={18} />
              </Link>
              <a href="#servicos" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-600 hover:border-gray-400 transition-colors">
                Ver serviços
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Serviços */}
      <section id="servicos" className="py-20 bg-gray-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Nossos Serviços</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Heart, title: 'Casamentos', desc: 'Cobertura completa do grande dia, do making of à festa.' },
              { icon: Star, title: 'Ensaios', desc: 'Ensaios pessoais, gestante, família, newborn e smash the cake.' },
              { icon: Camera, title: 'Eventos', desc: 'Formaturas, corporativos, aniversários e batizados.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: `${ACCENT}20` }}>
                  <Icon size={24} style={{ color: ACCENT }} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Vamos criar algo incrível juntos?</h2>
          <p className="text-gray-400 mb-8">Entre em contato e receba seu orçamento personalizado em até 24h.</p>
          <Link to="/cadastro" style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
            Solicitar orçamento <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Camera size={20} style={{ color: ACCENT }} />
            <span className="font-semibold">MBFoto</span>
          </div>
          <p className="text-sm text-gray-500">© 2026 MBFoto. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
