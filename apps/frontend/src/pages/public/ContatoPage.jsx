import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { MessageCircle, Camera, Phone, Mail, MapPin } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '';

export default function ContatoPage() {
  const { config } = useOutletContext() || {};
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/public/site/paginas/contato`)
      .then(r => r.json())
      .then(data => setPageData(data.data || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const whatsapp = config?.whatsapp || pageData?.whatsapp;
  const telefone = config?.telefone || pageData?.telefone;
  const email = config?.email || pageData?.email;
  const cidade = config?.cidade || pageData?.cidade;
  const titulo = pageData?.titulo || 'Entre em Contato';
  const subtitulo = pageData?.subtitulo || 'Estamos prontos para transformar seus momentos em memórias eternas.';

  const whatsappLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=Olá! Gostaria de saber mais sobre os serviços de fotografia.`
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 animate-pulse">
          <div className="h-8 bg-stone-800 rounded w-1/3 mx-auto mb-4" />
          <div className="h-4 bg-stone-800 rounded w-2/3 mx-auto mb-12" />
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="h-48 bg-stone-900 rounded-xl" />
            <div className="h-48 bg-stone-900 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Header */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-50 mb-4">
            {titulo}
          </h1>
          <p className="text-stone-400 text-lg max-w-2xl mx-auto">
            {subtitulo}
          </p>
        </div>
      </section>

      {/* CTA Cards */}
      <section className="pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 gap-6">
            {/* WhatsApp Card */}
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center justify-center p-8 rounded-2xl bg-stone-900/50 border border-stone-800 hover:border-green-500/30 transition-all hover:shadow-lg hover:shadow-green-500/5"
              >
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <MessageCircle size={32} className="text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-stone-50 mb-2">WhatsApp</h3>
                <p className="text-stone-400 text-sm text-center">
                  Converse diretamente conosco. Respondemos rápido!
                </p>
                <span className="mt-4 px-5 py-2.5 rounded-lg bg-green-500 text-white font-medium text-sm group-hover:bg-green-600 transition-colors">
                  Abrir WhatsApp
                </span>
              </a>
            )}

            {/* Orçamento Card */}
            <Link
              to="/login"
              className="group flex flex-col items-center justify-center p-8 rounded-2xl bg-stone-900/50 border border-stone-800 hover:border-[#EA580C]/30 transition-all hover:shadow-lg hover:shadow-[#EA580C]/5"
            >
              <div className="w-16 h-16 rounded-full bg-[#EA580C]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Camera size={32} className="text-[#EA580C]" />
              </div>
              <h3 className="text-xl font-bold text-stone-50 mb-2">Orçamento Online</h3>
              <p className="text-stone-400 text-sm text-center">
                Solicite seu orçamento personalizado em poucos cliques.
              </p>
              <span className="mt-4 px-5 py-2.5 rounded-lg bg-[#EA580C] text-white font-medium text-sm group-hover:bg-[#c2410c] transition-colors">
                Solicitar Orçamento
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Info */}
      <section className="pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-8">
            <h2 className="text-lg font-semibold text-stone-50 mb-6">Informações de Contato</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {telefone && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                    <Phone size={18} className="text-stone-400" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500 mb-0.5">Telefone</p>
                    <p className="text-stone-200 font-medium">{telefone}</p>
                  </div>
                </div>
              )}

              {email && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                    <Mail size={18} className="text-stone-400" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500 mb-0.5">E-mail</p>
                    <a href={`mailto:${email}`} className="text-stone-200 font-medium hover:text-[#EA580C] transition-colors">
                      {email}
                    </a>
                  </div>
                </div>
              )}

              {cidade && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                    <MapPin size={18} className="text-stone-400" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500 mb-0.5">Localização</p>
                    <p className="text-stone-200 font-medium">{cidade}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
