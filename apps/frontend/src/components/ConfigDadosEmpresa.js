import React from 'react';

const ACCENT = '#EA580C';
const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function ConfigDadosEmpresa({ form, setForm, onUploadLogo }) {
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleDays = (day) => {
    const days = form.workDays || [];
    setForm({ ...form, workDays: days.includes(day) ? days.filter(d => d !== day) : [...days, day] });
  };

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Logo da Empresa</label>
        <div className="flex items-center gap-4">
          {form.logoUrl ? (
            <img src={form.logoUrl} alt="Logo" className="w-20 h-20 object-contain rounded-lg border" />
          ) : (
            <div className="w-20 h-20 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400 text-xs">Sem logo</div>
          )}
          <button type="button" onClick={onUploadLogo} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Upload Logo
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social</label>
          <input name="businessName" value={form.businessName || ''} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia</label>
          <input name="tradeName" value={form.tradeName || ''} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
          <input name="cnpj" value={form.cnpj || ''} onChange={handleChange} placeholder="00.000.000/0000-00"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
          <input name="phone" value={form.phone || ''} onChange={handleChange} placeholder="(11) 99999-9999"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input name="email" type="email" value={form.email || ''} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Comercial</label>
          <input name="whatsappBusiness" value={form.whatsappBusiness || ''} onChange={handleChange} placeholder="(11) 99999-9999"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
          <input name="website" value={form.website || ''} onChange={handleChange} placeholder="https://"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
          <input name="instagram" value={form.instagram || ''} onChange={handleChange} placeholder="@seuuser"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
          <input name="facebook" value={form.facebook || ''} onChange={handleChange} placeholder="URL da página"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
      </div>

      {/* Endereço */}
      <h4 className="text-sm font-semibold text-gray-900 pt-2">Endereço</h4>
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
          <input name="zip" value={form.zip || ''} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
          <input name="address" value={form.address || ''} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
          <input name="city" value={form.city || ''} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <input name="state" value={form.state || ''} onChange={handleChange} maxLength={2}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição da Empresa</label>
        <textarea name="description" value={form.description || ''} onChange={handleChange} rows={3}
          placeholder="Breve descrição que aparecerá no site..."
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none resize-none" />
      </div>

      {/* Horário */}
      <h4 className="text-sm font-semibold text-gray-900 pt-2">Horário de Funcionamento</h4>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Abertura</label>
          <input name="openTime" type="time" value={form.openTime || '09:00'} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fechamento</label>
          <input name="closeTime" type="time" value={form.closeTime || '18:00'} onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Dias de atendimento</label>
        <div className="flex gap-2">
          {DAYS.map(day => (
            <button key={day} type="button" onClick={() => handleDays(day)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${(form.workDays || []).includes(day) ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
              style={(form.workDays || []).includes(day) ? { background: ACCENT } : {}}>
              {day}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
