import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, Calendar, Package, MapPinned, Send, ChevronLeft, ChevronRight, Check, Loader2, AlertCircle } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '';
const ACCENT = '#EA580C';
const PUBLIC_TOKEN = 'mbf-pub-2026-xK9mP4';
const STEPS = ['Seus Dados', 'Endereço', 'O Evento', 'Serviços', 'Local do Evento', 'Finalização'];
const STEP_ICONS = [User, MapPin, Calendar, Package, MapPinned, Send];
const ORIGENS = ['Instagram', 'Google', 'Indicação de amigo', 'Facebook', 'TikTok', 'Pinterest', 'Evento/Feira', 'Outro'];

function formatTelefone(v) {
  const n = (v || '').replace(/\D/g, '').slice(0, 11);
  if (n.length > 7) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length > 2) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return n.length > 0 ? `(${n}` : '';
}

function formatCPF_CNPJ(v) {
  const n = (v || '').replace(/\D/g, '').slice(0, 14);
  if (n.length <= 11) {
    if (n.length > 9) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    if (n.length > 6) return n.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    if (n.length > 3) return n.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    return n;
  }
  if (n.length > 12) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
  if (n.length > 8) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
  if (n.length > 5) return n.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
  return n.replace(/(\d{2})(\d{1,3})/, '$1.$2');
}

function formatCEP(v) {
  const n = (v || '').replace(/\D/g, '').slice(0, 8);
  return n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n;
}

function validarCPF(cpf) {
  const nums = cpf.replace(/\D/g, '');
  if (nums.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(nums)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(nums[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(nums[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(nums[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === parseInt(nums[10]);
}

function validarCNPJ(cnpj) {
  const nums = cnpj.replace(/\D/g, '');
  if (nums.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(nums)) return false;
  const pesos1 = [5,4,3,2,9,8,7,6,5,4,3,2];
  const pesos2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  let soma = 0;
  for (let i = 0; i < 12; i++) soma += parseInt(nums[i]) * pesos1[i];
  let resto = soma % 11;
  const dig1 = resto < 2 ? 0 : 11 - resto;
  if (parseInt(nums[12]) !== dig1) return false;
  soma = 0;
  for (let i = 0; i < 13; i++) soma += parseInt(nums[i]) * pesos2[i];
  resto = soma % 11;
  const dig2 = resto < 2 ? 0 : 11 - resto;
  return parseInt(nums[13]) === dig2;
}

function validarDocumento(value) {
  const nums = (value || '').replace(/\D/g, '');
  if (nums.length === 0) return true; // campo opcional, vazio é ok
  if (nums.length <= 11) return validarCPF(nums);
  return validarCNPJ(nums);
}

export default function NovoCliente() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [catalogo, setCatalogo] = useState({ pacotes: [], servicos: { servicos_principais: [], produtos: [], adicionais: [] } });

  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', cpf_cnpj: '', instagram: '',
    endereco_cep: '', endereco_rua: '', endereco_numero: '', endereco_complemento: '',
    endereco_bairro: '', endereco_cidade: '', endereco_estado: '',
    origem: '', nome_evento: '', data_evento: '', horario_inicio: '', horario_fim: '',
    pacote_id: '', servicos_selecionados: [],
    local_nome: '', local_cep: '', local_logradouro: '', local_numero: '',
    local_complemento: '', local_bairro: '', local_cidade: '', local_uf: '',
    observacoes: '',
  });

  const [logoUrl, setLogoUrl] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('mbf_logo_url') : null);

  useEffect(() => {
    // Buscar logo da API se não tiver em cache
    if (!logoUrl) {
      fetch(`${API}/public/site/config`)
        .then(r => r.json())
        .then(json => {
          if (json.success && json.data) {
            const logo = json.data.logo_url || json.data.logo_dark_url;
            if (logo) { setLogoUrl(logo); localStorage.setItem('mbf_logo_url', logo); }
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    fetch(`${API}/public/novo-cliente/catalogo`, { headers: { 'X-Public-Token': PUBLIC_TOKEN } })
      .then(r => r.json())
      .then(d => { if (d.success) setCatalogo(d.data); })
      .catch(() => {});
  }, []);

  const update = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); setError(''); };

  const handleCepEndereco = async (cepValue) => {
    const formatted = formatCEP(cepValue);
    update('endereco_cep', formatted);
    const nums = formatted.replace(/\D/g, '');
    if (nums.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${nums}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(prev => ({ ...prev, endereco_rua: data.logradouro || prev.endereco_rua, endereco_bairro: data.bairro || prev.endereco_bairro, endereco_cidade: data.localidade || prev.endereco_cidade, endereco_estado: data.uf || prev.endereco_estado }));
        }
      } catch {}
    }
  };

  const handleCepLocal = async (cepValue) => {
    const formatted = formatCEP(cepValue);
    update('local_cep', formatted);
    const nums = formatted.replace(/\D/g, '');
    if (nums.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${nums}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(prev => ({ ...prev, local_logradouro: data.logradouro || prev.local_logradouro, local_bairro: data.bairro || prev.local_bairro, local_cidade: data.localidade || prev.local_cidade, local_uf: data.uf || prev.local_uf }));
        }
      } catch {}
    }
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.nome.trim() || form.nome.trim().length < 3) return 'Nome é obrigatório (mínimo 3 caracteres)';
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'E-mail válido é obrigatório';
      if (form.telefone.replace(/\D/g, '').length < 10) return 'Telefone/WhatsApp é obrigatório';
      const cpfNums = form.cpf_cnpj.replace(/\D/g, '');
      if (!cpfNums || (cpfNums.length !== 11 && cpfNums.length !== 14)) return 'CPF ou CNPJ é obrigatório';
      if (!validarDocumento(form.cpf_cnpj)) {
        return cpfNums.length <= 11 ? 'CPF inválido' : 'CNPJ inválido';
      }
    }
    if (step === 1) {
      if (form.endereco_cep.replace(/\D/g, '').length < 8) return 'CEP é obrigatório';
      if (!form.endereco_numero.trim()) return 'Número é obrigatório';
    }
    if (step === 2) {
      if (!form.nome_evento.trim()) return 'Nome do evento é obrigatório';
      if (!form.data_evento) return 'Data prevista é obrigatória';
      if (!form.horario_inicio) return 'Horário de início é obrigatório';
      if (!form.horario_fim) return 'Horário de término é obrigatório';
    }
    if (step === 3) {
      if (form.servicos_selecionados.length === 0 && !form.pacote_id) return 'Selecione pelo menos 1 serviço ou pacote';
    }
    if (step === 4) {
      if (!form.local_nome.trim()) return 'Nome do local é obrigatório';
      if (form.local_cep.replace(/\D/g, '').length < 8) return 'CEP do local é obrigatório';
      if (!form.local_numero.trim()) return 'Número do local é obrigatório';
    }
    return null;
  };

  const [checking, setChecking] = useState(false);

  const nextStep = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');

    // Early existence check on Step 1
    if (step === 0) {
      setChecking(true);
      try {
        const res = await fetch(`${API}/public/novo-cliente/verificar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Public-Token': PUBLIC_TOKEN },
          body: JSON.stringify({ email: form.email, cpf_cnpj: form.cpf_cnpj }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.message || 'Dados já cadastrados.');
          setChecking(false);
          return;
        }
      } catch {
        // Se falhar a verificação, segue (validação final no submit)
      }
      setChecking(false);
    }

    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => { setError(''); setStep(s => Math.max(s - 1, 0)); };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        telefone: form.telefone.replace(/\D/g, ''),
        cpf_cnpj: form.cpf_cnpj.replace(/\D/g, ''),
        endereco_cep: form.endereco_cep.replace(/\D/g, ''),
        local_cep: form.local_cep.replace(/\D/g, ''),
        instagram: form.instagram.replace('@', ''),
      };
      const res = await fetch(`${API}/public/novo-cliente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Public-Token': PUBLIC_TOKEN },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data);
      } else if (data.code === 'ALREADY_EXISTS') {
        setError(data.message);
      } else {
        setError(data.message || 'Erro ao processar cadastro.');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    }
    setSubmitting(false);
  };

  // ═══ Success Screen ═══
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Check size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Tudo certo!</h1>
          <p className="text-gray-600">Seu cadastro foi realizado e o orçamento foi enviado para análise.</p>
          <p className="text-sm text-gray-500">{success.message}</p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800">
            <p className="font-medium mb-1">Próximos passos:</p>
            <p>1. Você receberá uma <strong>senha temporária</strong> para acessar o portal do cliente.</p>
            <p className="mt-1">2. No primeiro acesso, será necessário criar uma nova senha.</p>
            <p className="mt-1">3. Seu orçamento será analisado e você receberá uma proposta em breve.</p>
          </div>
          <button onClick={() => navigate('/login')} className="w-full py-3 text-white font-medium rounded-xl transition-opacity hover:opacity-90" style={{ backgroundColor: ACCENT }}>
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  // ═══ Wizard ═══
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 py-4 flex items-center justify-center">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-10 object-contain" />
        ) : (
          <div className="h-10" />
        )}
      </header>

      {/* Progress */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i < step ? 'bg-green-500 text-white' : i === step ? 'text-white' : 'bg-gray-200 text-gray-500'}`}
                    style={i === step ? { backgroundColor: ACCENT } : {}}>
                    {i < step ? <Check size={14} /> : <Icon size={14} />}
                  </div>
                  <span className={`text-[10px] mt-1 hidden sm:block ${i === step ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>{s}</span>
                </div>
              );
            })}
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%`, backgroundColor: ACCENT }} />
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 py-6 overflow-y-auto pb-28">
        <div className="max-w-lg mx-auto space-y-4">
          <h2 className="text-lg font-bold text-gray-900">{STEPS[step]}</h2>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
              {error.includes('login') && (
                <button onClick={() => navigate('/login')} className="ml-auto text-xs font-medium underline whitespace-nowrap">Ir para Login</button>
              )}
            </div>
          )}

          {step === 0 && <Step1 form={form} update={update} />}
          {step === 1 && <Step2 form={form} update={update} onCepChange={handleCepEndereco} />}
          {step === 2 && <Step3 form={form} update={update} />}
          {step === 3 && <Step4 form={form} update={update} catalogo={catalogo} />}
          {step === 4 && <Step5 form={form} update={update} onCepChange={handleCepLocal} />}
          {step === 5 && <Step6 form={form} update={update} catalogo={catalogo} />}
        </div>
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-4 safe-area-bottom">
        <div className="max-w-lg mx-auto flex gap-3">
          {step > 0 && (
            <button onClick={prevStep} className="flex-1 flex items-center justify-center gap-1 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              <ChevronLeft size={16} /> Voltar
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={nextStep} disabled={checking} className="flex-1 flex items-center justify-center gap-1 py-3 text-white rounded-xl text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
              {checking ? <><Loader2 size={16} className="animate-spin" /> Verificando...</> : <>Próximo <ChevronRight size={16} /></>}
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="flex-1 flex items-center justify-center gap-1 py-3 text-white rounded-xl text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : <><Send size={16} /> Enviar Orçamento</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// STEP COMPONENTS
// ═══════════════════════════════════════════════════════════

function Step1({ form, update }) {
  return (
    <div className="space-y-4">
      <Field label="Nome completo *" value={form.nome} onChange={v => update('nome', v)} placeholder="Seu nome completo" />
      <Field label="E-mail *" type="email" value={form.email} onChange={v => update('email', v)} placeholder="seu@email.com" />
      <Field label="Telefone / WhatsApp *" value={form.telefone} onChange={v => update('telefone', formatTelefone(v))} placeholder="(11) 99999-9999" inputMode="numeric" />
      <Field label="CPF / CNPJ *" value={form.cpf_cnpj} onChange={v => update('cpf_cnpj', formatCPF_CNPJ(v))} placeholder="000.000.000-00" inputMode="numeric" />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
          <input type="text" value={form.instagram} onChange={e => update('instagram', e.target.value.replace(/\s/g, ''))}
            placeholder="seu_usuario" className="w-full pl-8 pr-3 border border-gray-300 rounded-xl py-3 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" />
        </div>
      </div>
    </div>
  );
}

function Step2({ form, update, onCepChange }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Seu endereço pessoal (necessário para o contrato).</p>
      <Field label="CEP *" value={form.endereco_cep} onChange={v => onCepChange(v)} placeholder="00000-000" inputMode="numeric" maxLength={9} />
      <Field label="Rua" value={form.endereco_rua} onChange={v => update('endereco_rua', v)} placeholder="Rua, Av, etc." />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Número *" value={form.endereco_numero} onChange={v => update('endereco_numero', v)} placeholder="123" />
        <div className="col-span-2">
          <Field label="Complemento" value={form.endereco_complemento} onChange={v => update('endereco_complemento', v)} placeholder="Apto, bloco..." />
        </div>
      </div>
      <Field label="Bairro" value={form.endereco_bairro} onChange={v => update('endereco_bairro', v)} placeholder="Bairro" />
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="Cidade" value={form.endereco_cidade} onChange={v => update('endereco_cidade', v)} placeholder="Cidade" />
        </div>
        <Field label="UF" value={form.endereco_estado} onChange={v => update('endereco_estado', v.toUpperCase().slice(0, 2))} placeholder="SP" maxLength={2} />
      </div>
    </div>
  );
}


function Step3({ form, update }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Como você me encontrou?</label>
        <select value={form.origem} onChange={e => update('origem', e.target.value)}
          className="w-full border border-gray-300 rounded-xl py-3 px-3 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none bg-white">
          <option value="">Selecione uma opção</option>
          {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <Field label="Nome do Evento *" value={form.nome_evento} onChange={v => update('nome_evento', v)} placeholder="Ex: Casamento João e Maria" />
      <Field label="Data prevista *" type="date" value={form.data_evento} onChange={v => update('data_evento', v)} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Horário início *" type="time" value={form.horario_inicio} onChange={v => update('horario_inicio', v)} />
        <Field label="Horário término *" type="time" value={form.horario_fim} onChange={v => update('horario_fim', v)} />
      </div>
    </div>
  );
}

function Step4({ form, update, catalogo }) {
  const { pacotes, servicos } = catalogo;
  const toggleServico = (id) => {
    const current = form.servicos_selecionados;
    const next = current.includes(id) ? current.filter(s => s !== id) : [...current, id];
    update('servicos_selecionados', next);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Selecione pelo menos 1 pacote ou serviço desejado. *</p>

      {/* Pacotes */}
      {pacotes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Pacotes</h3>
          <div className="space-y-2">
            {pacotes.map(p => (
              <button key={p.id} type="button" onClick={() => update('pacote_id', form.pacote_id === p.id ? '' : p.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${form.pacote_id === p.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <p className="text-sm font-semibold text-gray-900">{p.nome}</p>
                {p.descricao && <p className="text-xs text-gray-500 mt-1">{p.descricao}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Serviços Principais */}
      {servicos.servicos_principais.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Serviços Principais</h3>
          <div className="space-y-2">
            {servicos.servicos_principais.map(s => (
              <CheckCard key={s.id} item={s} checked={form.servicos_selecionados.includes(s.id)} onToggle={() => toggleServico(s.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Produtos */}
      {servicos.produtos.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Produtos</h3>
          <div className="space-y-2">
            {servicos.produtos.map(s => (
              <CheckCard key={s.id} item={s} checked={form.servicos_selecionados.includes(s.id)} onToggle={() => toggleServico(s.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Adicionais */}
      {servicos.adicionais.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Serviços Adicionais</h3>
          <div className="space-y-2">
            {servicos.adicionais.map(s => (
              <CheckCard key={s.id} item={s} checked={form.servicos_selecionados.includes(s.id)} onToggle={() => toggleServico(s.id)} />
            ))}
          </div>
        </div>
      )}

      {pacotes.length === 0 && servicos.servicos_principais.length === 0 && servicos.produtos.length === 0 && servicos.adicionais.length === 0 && (
        <p className="text-center text-gray-400 py-8 text-sm">Nenhum serviço disponível no momento. Prossiga para a próxima etapa.</p>
      )}
    </div>
  );
}


function Step5({ form, update, onCepChange }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Onde será o evento?</p>
      <Field label="Nome do Local *" value={form.local_nome} onChange={v => update('local_nome', v)} placeholder="Ex: Espaço das Flores" />
      <Field label="CEP *" value={form.local_cep} onChange={v => onCepChange(v)} placeholder="00000-000" inputMode="numeric" maxLength={9} />
      <Field label="Logradouro" value={form.local_logradouro} onChange={v => update('local_logradouro', v)} placeholder="Rua, Av, etc." />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Número *" value={form.local_numero} onChange={v => update('local_numero', v)} placeholder="123" />
        <div className="col-span-2">
          <Field label="Complemento" value={form.local_complemento} onChange={v => update('local_complemento', v)} placeholder="Salão, bloco..." />
        </div>
      </div>
      <Field label="Bairro" value={form.local_bairro} onChange={v => update('local_bairro', v)} placeholder="Bairro" />
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="Cidade" value={form.local_cidade} onChange={v => update('local_cidade', v)} placeholder="Cidade" />
        </div>
        <Field label="UF" value={form.local_uf} onChange={v => update('local_uf', v.toUpperCase().slice(0, 2))} placeholder="SP" maxLength={2} />
      </div>
    </div>
  );
}

function Step6({ form, update, catalogo }) {
  const pacoteNome = catalogo.pacotes.find(p => p.id === form.pacote_id)?.nome;
  const numServicos = form.servicos_selecionados.length;

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">Confira o resumo e envie sua solicitação.</p>

      {/* Resumo */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Resumo</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-gray-500">Nome:</span> <span className="font-medium">{form.nome}</span></div>
          <div><span className="text-gray-500">Telefone:</span> <span className="font-medium">{form.telefone}</span></div>
          <div className="col-span-2"><span className="text-gray-500">E-mail:</span> <span className="font-medium">{form.email}</span></div>
          {form.nome_evento && <div className="col-span-2"><span className="text-gray-500">Evento:</span> <span className="font-medium">{form.nome_evento}</span></div>}
          {form.data_evento && <div><span className="text-gray-500">Data:</span> <span className="font-medium">{new Date(form.data_evento + 'T00:00').toLocaleDateString('pt-BR')}</span></div>}
          {pacoteNome && <div><span className="text-gray-500">Pacote:</span> <span className="font-medium">{pacoteNome}</span></div>}
          {numServicos > 0 && <div><span className="text-gray-500">Serviços:</span> <span className="font-medium">{numServicos} selecionado(s)</span></div>}
          {form.local_nome && <div className="col-span-2"><span className="text-gray-500">Local:</span> <span className="font-medium">{form.local_nome}{form.local_cidade ? ` — ${form.local_cidade}/${form.local_uf}` : ''}</span></div>}
        </div>
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observações adicionais</label>
        <textarea rows={4} value={form.observacoes} onChange={e => update('observacoes', e.target.value)}
          placeholder="Conte mais detalhes sobre o momento, dúvidas, ou algo especial que gostaria..."
          className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none resize-none" />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p>Ao enviar, você receberá uma <strong>senha temporária</strong> no seu WhatsApp para acessar o portal do cliente.</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ═══════════════════════════════════════════════════════════

function Field({ label, type = 'text', value, onChange, placeholder, inputMode, maxLength }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} inputMode={inputMode} maxLength={maxLength}
        className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" />
    </div>
  );
}

function CheckCard({ item, checked, onToggle }) {
  return (
    <button type="button" onClick={onToggle}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${checked ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
      <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
        {checked && <Check size={12} className="text-white" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{item.nome}</p>
        {item.descricao && <p className="text-xs text-gray-500 mt-0.5">{item.descricao}</p>}
      </div>
    </button>
  );
}
