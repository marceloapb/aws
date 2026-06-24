import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function PortalAlbumDetalhe() {
  const { id } = useParams();
  const [album, setAlbum] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [senhaInput, setSenhaInput] = useState('');
  const [pedeSenha, setPedeSenha] = useState(false);
  const [fotoAberta, setFotoAberta] = useState(null);

  useEffect(() => { loadAlbum(); }, [id]);

  async function loadAlbum(senha) {
    try {
      const params = senha ? `?senha=${senha}` : '';
      const { data } = await api.get(`/client/albuns/${id}${params}`);
      setAlbum(data);
      setFotos(data.fotos || []);
      setPedeSenha(false);
    } catch (err) {
      if (err.message?.includes('senha')) {
        setPedeSenha(true);
      } else {
        console.error('Erro:', err);
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner size="lg" />;

  if (pedeSenha) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-4xl mb-4">🔒</p>
        <h2 className="text-lg font-semibold mb-2">Álbum protegido</h2>
        <p className="text-sm text-gray-500 mb-4">Digite a senha para acessar este álbum</p>
        <form onSubmit={(e) => { e.preventDefault(); loadAlbum(senhaInput); }} className="flex gap-2">
          <input type="password" value={senhaInput} onChange={(e) => setSenhaInput(e.target.value)} placeholder="Senha" className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm" />
          <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm">Acessar</button>
        </form>
      </div>
    );
  }

  if (!album) return <p className="text-center text-gray-500">Álbum não encontrado</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{album.titulo}</h1>
      <p className="text-sm text-gray-500 mb-6">{fotos.length} fotos</p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {fotos.map((foto, idx) => (
          <div key={foto.id} onClick={() => setFotoAberta(idx)} className="cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
            <img src={foto.url_thumb} alt="" className="w-full h-40 object-cover" loading="lazy" />
          </div>
        ))}
      </div>

      {fotoAberta !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setFotoAberta(null)}>
          <button onClick={(e) => { e.stopPropagation(); setFotoAberta(Math.max(0, fotoAberta - 1)); }} className="absolute left-4 text-white text-3xl hover:text-gray-300">←</button>
          <img src={fotos[fotoAberta].url_original} alt="" className="max-h-[90vh] max-w-[90vw] object-contain" onClick={(e) => e.stopPropagation()} />
          <button onClick={(e) => { e.stopPropagation(); setFotoAberta(Math.min(fotos.length - 1, fotoAberta + 1)); }} className="absolute right-4 text-white text-3xl hover:text-gray-300">→</button>
          <button onClick={() => setFotoAberta(null)} className="absolute top-4 right-4 text-white text-2xl">✕</button>
          <p className="absolute bottom-4 text-white text-sm">{fotoAberta + 1} / {fotos.length}</p>
        </div>
      )}
    </div>
  );
}
