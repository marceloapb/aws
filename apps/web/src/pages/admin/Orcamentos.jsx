import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function Orcamentos() {
  const [loading, setLoading] = useState(false);
  if (loading) return <LoadingSpinner size="lg" />;
  return (
    <div>
      <PageHeader title="Orcamentos" subtitle="Gerenciamento de Orcamentos" />
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-500">Página Orcamentos — implementação em andamento</p>
      </div>
    </div>
  );
}
