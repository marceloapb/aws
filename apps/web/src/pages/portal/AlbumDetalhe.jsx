import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { formatarData } from '../../lib/formatters.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function PortalAlbumDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fotoSelecionada, setFotoSelecionada] = useState(null);

  useEffect(() => {
    api.get(`/client/albuns/${id}`)
      .then(({ data }) => setAlbum(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner size="lg" />;
  if (!album) return <div className="text-center py-12"><p className="text-gray-500">Álbum não encontrado</p></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/portal/albuns')} className="text-gray-500 hover:text-gray-700">← Voltar</button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{album.titulo}</h1>
          <p className="text-sm text-gray-500">{album.fotos?.length || 0} fotos • {formatarData(album.data_evento)}</p>
        </div>
      </div>

      {/* Grid de fotos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {(album.fotos || []).map((foto) => (
          <div key={foto.id} onClick={() => setFotoSelecionada(foto)} className="cursor-pointer group relative overflow-hidden rounded-md">
            <img src={foto.url_thumbnail || foto.url} alt={foto.nome} className="w-full h-32 object-cover group-hover:scale-105 transition-transform" />
          </div>
        ))}
      </div>

      {/* Lightbox simples */}
      {fotoSelecionada && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setFotoSelecionada(null)}>
          <img src={fotoSelecionada.url} alt={fotoSelecionada.nome} className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setFotoSelecionada(null)} className="absolute top-4 right-4 text-white text-2xl">✕</button>
        </div>
      )}
    </div>
  );
}
