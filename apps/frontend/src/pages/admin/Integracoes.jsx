import React, { useState } from 'react';
import ConfigIntegracoes from '../../components/ConfigIntegracoes';

export default function Integracoes() {
  const [form, setForm] = useState({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Integrações</h1>
        <p className="text-sm text-gray-500">Gerencie suas conexões com serviços externos</p>
      </div>
      <ConfigIntegracoes form={form} setForm={setForm} />
    </div>
  );
}
