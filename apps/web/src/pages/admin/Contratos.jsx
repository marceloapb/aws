import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function Contratos() {
  const [loading, setLoading] = useState(false);
  if (loading) return <LoadingSpinner size="lg" />;
  return (
    <div>
      <PageHeader title="Contratos" subtitle="Gerenciamento de Contratos" />
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-500">Página Contratos — implementação em andamento</p>
      </div>
    </div>
  );
}
