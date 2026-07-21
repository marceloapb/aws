import React, { useState } from 'react';
import { Link2 } from 'lucide-react';
import { PageHeader } from '../../components/ui';
import ConfigIntegracoes from '../../components/ConfigIntegracoes';

export default function Integracoes() {
  const [form, setForm] = useState({});

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Link2}
        title="Integrações"
        subtitle="Gerencie suas conexões com serviços externos"
      />
      <ConfigIntegracoes form={form} setForm={setForm} />
    </div>
  );
}
