import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Building2, Music, CalendarDays, UserPlus, PartyPopper,
  ChevronLeft, ChevronRight, Check
} from 'lucide-react';

const ACCENT = '#EA580C';

const STEPS = [
  { label: 'Empresa', icon: Building2 },
  { label: 'Serviço', icon: Music },
  { label: 'Agenda', icon: CalendarDays },
  { label: 'Cliente', icon: UserPlus },
  { label: 'Conclusão', icon: PartyPopper },
];

const SERVICE_TYPES = ['Casamento', 'Ensaio', 'Aniversário', 'Corporativo', 'Batizado', 'Formatura', 'Outro'];

function ProgressBar({ current }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                i < current ? 'text-white border-transparent' : i === current ? 'text-white border-transparent' : 'bg-white text-gray-400 border-gray-300'
              }`}
              style={{ backgroundColor: i <= current ? ACCENT : undefined }}
            >
              {i < current ? <Check size={18} /> : i + 1}
            </div>
            <span className={`text-xs mt-1 ${i <= current ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-12 h-0.5 mx-1 mt-[-12px] ${i < current ? 'bg-orange-500' : 'bg-gray-300'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function Onboarding() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [empresa, setEmpresa] = useState({ nomeFantasia: '', telefone: '', email: '' });
  // Step 2
  const [servico, setServico] = useState({ nome: '', tipo: 'Casamento', preco: '' });
  // Step 3
  const [blockedDates, setBlockedDates] = useState([]);
  // Step 4
  const [cliente, setCliente] = useState({ nome: '', email: '', telefone: '' });

  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  const saveStep = async () => {
    setSaving(true);
    try {
      if (step === 0) {
        await authFetch('/admin/configuracoes', {
          method: 'PUT',
          body: JSON.stringify({ nomeFantasia: empresa.nomeFantasia, telefone: empresa.telefone, email: empresa.email }),
        });
      } else if (step === 1) {
        await authFetch('/admin/catalogo', {
          method: 'POST',
          body: JSON.stringify({ nome: servico.nome, tipo: servico.tipo, preco: Number(servico.preco) }),
        });
      } else if (step === 2) {
        for (const date of blockedDates) {
          await authFetch('/admin/agenda', {
            method: 'POST',
            body: JSON.stringify({ date, type: 'bloqueio', title: 'Bloqueio' }),
          });
        }
      } else if (step === 3) {
        await authFetch('/admin/clientes', {
          method: 'POST',
          body: JSON.stringify({ nome: cliente.nome, email: cliente.email, telefone: cliente.telefone }),
        });
      }
    } catch (e) {
      console.error('Erro ao salvar step:', e);
    }
    setSaving(false);
  };

  const next = async () => {
    await saveStep();
    setStep(s => s + 1);
  };

  const skip = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  const finish = () => {
    localStorage.setItem('mbf_onboarding_done', 'true');
    navigate('/admin/orcamentos/novo');
  };

  const goToDashboard = () => {
    localStorage.setItem('mbf_onboarding_done', 'true');
    navigate('/admin');
  };

  // Calendar helpers
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const monthName = new Date(calYear, calMonth).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const toggleDate = (day) => {
    const d = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setBlockedDates(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const isBlocked = (day) => {
    const d = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return blockedDates.includes(d);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Sua Empresa</h2>
            <p className="text-sm text-gray-500">Conte-nos sobre seu negócio</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome fantasia</label>
              <input type="text" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="Ex: Studio Foto Arte" value={empresa.nomeFantasia} onChange={e => setEmpresa({ ...empresa, nomeFantasia: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input type="tel" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="(11) 99999-9999" value={empresa.telefone} onChange={e => setEmpresa({ ...empresa, telefone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="contato@seusite.com" value={empresa.email} onChange={e => setEmpresa({ ...empresa, email: e.target.value })} />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Primeiro Serviço</h2>
            <p className="text-sm text-gray-500">Cadastre seu primeiro produto ou serviço</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do serviço</label>
              <input type="text" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="Ex: Cobertura Completa" value={servico.nome} onChange={e => setServico({ ...servico, nome: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500" value={servico.tipo} onChange={e => setServico({ ...servico, tipo: e.target.value })}>
                {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
              <input type="number" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="3500" value={servico.preco} onChange={e => setServico({ ...servico, preco: e.target.value })} />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Sua Agenda</h2>
            <p className="text-sm text-gray-500">Bloquear datas que já estão ocupadas</p>
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }} className="p-1 hover:bg-gray-100 rounded">
                <ChevronLeft size={20} />
              </button>
              <span className="font-medium capitalize">{monthName}</span>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }} className="p-1 hover:bg-gray-100 rounded">
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d} className="font-medium">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const blocked = isBlocked(day);
                return (
                  <button key={day} onClick={() => toggleDate(day)} className={`w-9 h-9 rounded-full text-sm font-medium transition-all mx-auto ${blocked ? 'text-white' : 'hover:bg-orange-50 text-gray-700'}`} style={blocked ? { backgroundColor: ACCENT } : {}}>
                    {day}
                  </button>
                );
              })}
            </div>
            {blockedDates.length > 0 && (
              <p className="text-xs text-gray-500 text-center">{blockedDates.length} data(s) bloqueada(s)</p>
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Primeiro Cliente</h2>
            <p className="text-sm text-gray-500">Cadastre rapidamente seu primeiro cliente</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input type="text" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="Nome completo" value={cliente.nome} onChange={e => setCliente({ ...cliente, nome: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="cliente@email.com" value={cliente.email} onChange={e => setCliente({ ...cliente, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input type="tel" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="(11) 99999-9999" value={cliente.telefone} onChange={e => setCliente({ ...cliente, telefone: e.target.value })} />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="text-center space-y-6 py-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100">
              <PartyPopper size={40} style={{ color: ACCENT }} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Tudo pronto!</h2>
            <p className="text-gray-500">Agora crie seu primeiro orçamento e comece a fechar negócios.</p>
            <div className="space-y-3 pt-2">
              <button onClick={finish} className="w-full py-3 px-6 rounded-lg text-white font-semibold text-lg transition-all hover:opacity-90" style={{ backgroundColor: ACCENT }}>
                Criar Orçamento
              </button>
              <button onClick={goToDashboard} className="w-full py-2.5 px-6 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-all">
                Ir para Dashboard
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <h1 className="text-center text-2xl font-bold mb-2" style={{ color: ACCENT }}>
          Configuração Inicial
        </h1>
        <p className="text-center text-gray-500 text-sm mb-6">Vamos preparar tudo para você começar</p>

        <ProgressBar current={step} />

        <div className="bg-white rounded-xl shadow-sm border p-6">
          {renderStep()}

          {step < 4 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <button onClick={back} disabled={step === 0} className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${step === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}>
                <ChevronLeft size={16} /> Voltar
              </button>
              <div className="flex gap-2">
                <button onClick={skip} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-all">
                  Pular
                </button>
                <button onClick={next} disabled={saving} className="flex items-center gap-1 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
                  {saving ? 'Salvando...' : 'Próximo'} {!saving && <ChevronRight size={16} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
