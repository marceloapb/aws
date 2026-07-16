import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';

export default function Portfolio() {
  const { photographerId } = useParams();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/public/portfolio/${photographerId}`);
        setAlbums(res.data.data);
      } catch (err) {
        console.error('Erro ao carregar portfólio:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [photographerId]);

  if (loading) return <div className="flex justify-center items-center min-h-screen"><p>Carregando...</p></div>;

  return (
    <div className="min-h-screen bg-white py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Portfólio</h1>
          <Link to={`/site/${photographerId}`} className="text-blue-600 hover:underline">← Voltar</Link>
        </div>

        {albums.length === 0 ? (
          <p className="text-gray-500 text-center">Nenhum álbum publicado ainda.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((album) => (
              <div key={album.id} className="rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                {album.capaUrl ? (
                  <img src={album.capaUrl} alt={album.titulo} className="w-full h-64 object-cover" />
                ) : (
                  <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">Sem capa</span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-lg">{album.titulo}</h3>
                  {album.descricao && <p className="text-sm text-gray-600 mt-1">{album.descricao}</p>}
                  {album.tipo && <span className="inline-block mt-2 text-xs bg-gray-100 px-2 py-1 rounded">{album.tipo}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
