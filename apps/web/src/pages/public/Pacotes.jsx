import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';

export default function Pacotes() {
  const { photographerId } = useParams();
  const [pacotes, setPacotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/public/pacotes/${photographerId}`);
        setPacotes(res.data.data);
      } catch (err) {
        console.error('Erro ao carregar pacotes:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [photographerId]);

  if (loading) return <div className="flex justify-center items-center min-h-screen"><p>Carregando...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Pacotes</h1>
          <Link to={`/site/${photographerId}`} className="text-blue-600 hover:underline">← Voltar</Link>
        </div>

        {pacotes.length === 0 ? (
          <p className="text-gray-500 text-center">Nenhum pacote disponível no momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pacotes.map((pacote) => (
              <div key={pacote.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold">{pacote.nome}</h3>
                  {pacote.tipo && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{pacote.tipo}</span>}
                </div>
                {pacote.descricao && <p className="text-gray-600 mb-4">{pacote.descricao}</p>}
                <div className="border-t pt-4">
                  <p className="text-3xl font-bold text-green-600">R$ {pacote.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    {pacote.quantidadeFotos > 0 && <li>📷 {pacote.quantidadeFotos} fotos</li>}
                    {pacote.duracaoHoras > 0 && <li>⏱️ {pacote.duracaoHoras}h de cobertura</li>}
                    {pacote.itensInclusos && pacote.itensInclusos.map((item, i) => <li key={i}>✓ {item}</li>)}
                  </ul>
                </div>
                <Link to={`/site/${photographerId}/contato?pacote=${encodeURIComponent(pacote.nome)}`} className="mt-6 block text-center bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800">
                  Tenho interesse
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
