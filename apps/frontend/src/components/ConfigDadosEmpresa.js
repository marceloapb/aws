import React, { useState } from 'react';
import { Building2, Phone, Share2, MapPin, Clock } from 'lucide-react';
import SectionHeader from './config/SectionHeader';
import FieldLabel from './config/FieldLabel';
import MaskedInput from './form/MaskedInput';
import AddressForm from './form/AddressForm';

const ACCENT = '#EA580C';
const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const REQUIRED_FIELDS = ['businessName', 'tradeName', 'cnpj', 'phone', 'email'];

export default function ConfigDadosEmpresa({ form, setForm, onUploadLogo }) {
  const [touched, setTouched] = useState({});

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleBlur = (e) => setTouched({ ...touched, [e.target.name]: true });
  const handleDays = (day) => {
    const days = form.workDays || [];
    setForm({ ...form, workDays: days.includes(day) ? days.filter(d => d !== day) : [...days, day] });
  };

  const isError = (name) => REQUIRED_FIELDS.includes(name) && touched[name] && !form[name];

  const inputClass = (name) =>
    `w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-200 outline-none ${
      isError(name) ? 'border-red-500' : 'border-gray-300'
    }`;

  return (
    <div className="space-y-8">
      {/* Seção Identidade */}
      <section>
        <SectionHeader icon={Building2} title="Identidade" description="Dados de identificação da empresa" required />

        <div>
          <FieldLabel>Logo da Empresa</FieldLabel>
          <div className="flex items-center gap-4 mt-1">
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

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <FieldLabel required hint="Nome comercial visível aos clientes">Nome Fantasia</FieldLabel>
            <input name="tradeName" value={form.tradeName || ''} onChange={handleChange} onBlur={handleBlur}
              className={inputClass('tradeName')} />
          </div>
          <div>
            <FieldLabel required hint="Razão social conforme CNPJ">Razão Social</FieldLabel>
            <input name="businessName" value={form.businessName || ''} onChange={handleChange} onBlur={handleBlur}
              className={inputClass('businessName')} />
          </div>
          <div>
            <MaskedInput type="cnpj" label="CNPJ" required
              value={form.cnpj || ''}
              name="cnpj"
              onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
          </div>
        </div>
      </section>

      {/* Seção Contato */}
      <section>
        <SectionHeader icon={Phone} title="Contato" description="Informações de contato com o cliente" required />

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <MaskedInput type="phone" label="Telefone" required
              value={form.phone || ''}
              name="phone"
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <FieldLabel required hint="E-mail principal da empresa">E-mail</FieldLabel>
            <input name="email" type="email" value={form.email || ''} onChange={handleChange} onBlur={handleBlur}
              className={inputClass('email')} />
          </div>
          <div>
            <MaskedInput type="phone" label="WhatsApp Comercial"
              value={form.whatsappBusiness || ''}
              name="whatsappBusiness"
              onChange={(e) => setForm({ ...form, whatsappBusiness: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Website</FieldLabel>
            <input name="website" value={form.website || ''} onChange={handleChange}
              className={inputClass('website')} placeholder="https://" />
          </div>
        </div>
      </section>

      {/* Seção Redes Sociais */}
      <section>
        <SectionHeader icon={Share2} title="Redes Sociais" description="Perfis nas redes sociais" />

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Instagram</FieldLabel>
            <input name="instagram" value={form.instagram || ''} onChange={handleChange}
              className={inputClass('instagram')} placeholder="@seuuser" />
          </div>
          <div>
            <FieldLabel>Facebook</FieldLabel>
            <input name="facebook" value={form.facebook || ''} onChange={handleChange}
              className={inputClass('facebook')} placeholder="URL da página" />
          </div>
        </div>
      </section>

      {/* Seção Endereço — com busca CEP automática */}
      <section>
        <SectionHeader icon={MapPin} title="Endereço" description="Localização física — digite o CEP para preencher automaticamente" />
        <AddressForm form={form} setForm={setForm} />
      </section>

      {/* Descrição */}
      <section>
        <div>
          <FieldLabel>Descrição da Empresa</FieldLabel>
          <textarea name="description" value={form.description || ''} onChange={handleChange} rows={3}
            placeholder="Breve descrição que aparecerá no site..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none resize-none" />
        </div>
      </section>

      {/* Seção Horário */}
      <section>
        <SectionHeader icon={Clock} title="Horário" description="Horário de funcionamento e dias de atendimento" />

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Abertura</FieldLabel>
            <input name="openTime" type="time" value={form.openTime || '09:00'} onChange={handleChange}
              className={inputClass('openTime')} />
          </div>
          <div>
            <FieldLabel>Fechamento</FieldLabel>
            <input name="closeTime" type="time" value={form.closeTime || '18:00'} onChange={handleChange}
              className={inputClass('closeTime')} />
          </div>
        </div>
        <div className="mt-4">
          <FieldLabel>Dias de atendimento</FieldLabel>
          <div className="flex gap-2 mt-1">
            {DAYS.map(day => (
              <button key={day} type="button" onClick={() => handleDays(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${(form.workDays || []).includes(day) ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
                style={(form.workDays || []).includes(day) ? { background: ACCENT } : {}}>
                {day}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
