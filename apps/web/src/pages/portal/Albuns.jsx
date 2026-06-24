import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { formatarData } from '../../lib/formatters.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function PortalAlbuns() {
  const [albuns, setAlbuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/client/albuns')
      .then(({ data }) => setAlbuns(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Meus Álbuns 📸</h1>

      {albuns.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-4xl mb-2">📷</p>
          <p className="text-gray-500">Nenhum álbum disponível ainda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {albuns.map((album) => (
            <div key={album.id} onClick={() => navigate(`/portal/albuns/${album.id}`)} className="bg-white rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
              {album.capa_url
                ? <img src={album.capa_url} alt={album.titulo} className="w-full h-40 object-cover" />
                : <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-4xl">📸</div>
              }
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium">{album.titulo}</h3>
                  <StatusBadge status={album.status} />
                </div>
                <p className="text-xs text-gray-500">{album.total_fotos || 0} fotos • {formatarData(album.data_evento)}</p>
                {album.data_expiracao && (
                  <p className="text-xs text-orange-500 mt-1">Expira em: {formatarData(album.data_expiracao)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
