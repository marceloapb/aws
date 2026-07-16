import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';

export default function Home() {
  const { photographerId } = useParams();
  const [perfil, setPerfil] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [depoimentos, setDepoimentos] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [perfilRes, portfolioRes, depoimentosRes] = await Promise.all([
          api.get(`/public/perfil/${photographerId}`),
          api.get(`/public/portfolio/${photographerId}`),
          api.get(`/public/depoimentos/${photographerId}`)
        ]);
        setPerfil(perfilRes.data.data);
        setPortfolio(portfolioRes.data.data.slice(0, 6));
        setDepoimentos(depoimentosRes.data.data);
      } catch (err) {
        console.error('Erro ao carregar página pública:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [photographerId]);

  if (loading) return <div className="flex justify-center items-center min-h-screen"><p>Carregando...</p></div>;
  if (!perfil) return <div className="flex justify-center items-center min-h-screen"><p>Fotógrafo não encontrado</p></div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gray-900 text-white py-20 px-6 text-center">
        <h1 className="text-4xl font-bold mb-4">{perfil.nome}</h1>
        {perfil.bio && <p className="text-lg text-gray-300 max-w-2xl mx-auto">{perfil.bio}</p>}
        {perfil.especialidades.length > 0 && (
          <div className="mt-4 flex gap-2 justify-center flex-wrap">
            {perfil.especialidades.map((esp, i) => (
              <span key={i} className="bg-white/10 px-3 py-1 rounded-full text-sm">{esp}</span>
            ))}
          </div>
        )}
        <div className="mt-8 flex gap-4 justify-center">
          <Link to={`/site/${photographerId}/pacotes`} className="bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100">Ver Pacotes</Link>
          <Link to={`/site/${photographerId}/contato`} className="border border-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10">Contato</Link>
        </div>
      </section>

      {/* Portfólio Preview */}
      {portfolio.length > 0 && (
        <section className="py-16 px-6 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Portfólio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolio.map((album) => (
              <div key={album.id} className="rounded-lg overflow-hidden shadow-lg">
                {album.capaUrl ? (
                  <img src={album.capaUrl} alt={album.titulo} className="w-full h-64 object-cover" />
                ) : (
                  <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">Sem capa</span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-lg">{album.titulo}</h3>
                  {album.tipo && <span className="text-sm text-gray-500">{album.tipo}</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to={`/site/${photographerId}/portfolio`} className="text-blue-600 font-semibold hover:underline">Ver todos os álbuns →</Link>
          </div>
        </section>
      )}

      {/* Depoimentos */}
      {depoimentos && depoimentos.total > 0 && (
        <section className="py-16 px-6 bg-gray-50">
          <h2 className="text-3xl font-bold text-center mb-2">O que dizem os clientes</h2>
          {depoimentos.mediaNota && <p className="text-center text-gray-600 mb-8">Nota média: ⭐ {depoimentos.mediaNota}/5</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {depoimentos.depoimentos.slice(0, 6).map((dep, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(dep.nota)].map((_, j) => <span key={j}>⭐</span>)}
                </div>
                <p className="text-gray-700 italic">"{dep.comentario}"</p>
                <p className="mt-3 font-semibold text-sm text-gray-900">— {dep.clienteNome}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-900 text-white text-center">
        <p>{perfil.nome} — {perfil.cidade}{perfil.estado ? `, ${perfil.estado}` : ''}</p>
        <div className="mt-2 flex gap-4 justify-center">
          {perfil.instagram && <a href={`https://instagram.com/${perfil.instagram}`} target="_blank" rel="noreferrer" className="hover:underline">Instagram</a>}
          {perfil.whatsapp && <a href={`https://wa.me/${perfil.whatsapp}`} target="_blank" rel="noreferrer" className="hover:underline">WhatsApp</a>}
        </div>
      </footer>
    </div>
  );
}
