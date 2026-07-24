# SIG-07: OTP Input Mobile-First

## Metadados
- **ID:** SIG-07
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** SIG-02, SIG-05


## Contexto
A maioria dos clientes acessa o link do contrato pelo celular (via WhatsApp). O input de OTP deve ser otimizado para mobile: 6 campos individuais com auto-focus, teclado numérico nativo, auto-preenchimento do SMS/WhatsApp (Web OTP API), feedback visual imediato e acessibilidade.

## Escopo
- `apps/frontend/src/components/OTPInput.jsx` — NOVO
- `apps/frontend/src/pages/public/ContratoAceitar.jsx` — ALTERAR (integrar OTPInput)

## Fora de Escopo (NÃO TOCAR)
- Backend do OTP (SIG-02)
- Canais de envio (SIG-05)
- Outros componentes da tela de aceite (CT-05)


## Spec Técnica

### Design Visual (Mobile)
```
┌──────────────────────────────────────────┐
│                                          │
│    Enviamos um código para seu           │
│    WhatsApp (***887766)                  │
│                                          │
│    ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ │
│    │ 4 │ │ 8 │ │ 2 │ │ 9 │ │ 1 │ │ 7 │ │
│    └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ │
│                                          │
│    Expira em 08:45                       │
│                                          │
│    Não recebeu?                          │
│    [Reenviar] · [Tentar outro canal]     │
│                                          │
│    ─────────────────────────────         │
│    [     Verificar código     ]          │
│                                          │
└──────────────────────────────────────────┘
```

### Componente — OTPInput.jsx
```jsx
import React, { useState, useRef, useEffect } from 'react'

const OTP_LENGTH = 6

export default function OTPInput({ onComplete, disabled, erro }) {
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''))
  const inputRefs = useRef([])

  useEffect(() => {
    // Focus no primeiro input ao montar
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    // Web OTP API — auto-preenchimento do SMS
    if ('OTPCredential' in window) {
      const ac = new AbortController()
      navigator.credentials.get({
        otp: { transport: ['sms'] },
        signal: ac.signal
      }).then(otp => {
        if (otp?.code) {
          const chars = otp.code.split('').slice(0, OTP_LENGTH)
          setDigits(chars)
          onComplete(chars.join(''))
        }
      }).catch(() => {})
      return () => ac.abort()
    }
  }, [onComplete])

  const handleChange = (index, value) => {
    // Aceitar apenas dígitos
    const digit = value.replace(/\D/g, '').slice(-1)
    const newDigits = [...digits]
    newDigits[index] = digit
    setDigits(newDigits)

    // Auto-focus no próximo
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Se todos preenchidos, disparar onComplete
    if (newDigits.every(d => d !== '') && newDigits.join('').length === OTP_LENGTH) {
      onComplete(newDigits.join(''))
    }
  }

  const handleKeyDown = (index, e) => {
    // Backspace: voltar para input anterior
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (paste.length === OTP_LENGTH) {
      const chars = paste.split('')
      setDigits(chars)
      inputRefs.current[OTP_LENGTH - 1]?.focus()
      onComplete(paste)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2 sm:gap-3" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={el => inputRefs.current[i] = el}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={digit}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            disabled={disabled}
            className={`
              w-12 h-14 sm:w-14 sm:h-16
              text-center text-2xl font-bold
              border-2 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500
              transition-all duration-150
              ${erro ? 'border-red-500 bg-red-50 animate-shake' : 'border-gray-300'}
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            `}
            aria-label={`Dígito ${i + 1} de ${OTP_LENGTH}`}
          />
        ))}
      </div>
      {erro && (
        <p className="text-red-600 text-sm font-medium animate-fade-in" role="alert">
          {erro}
        </p>
      )}
    </div>
  )
}
```


### Componente — OTPTimer.jsx
```jsx
import React, { useState, useEffect } from 'react'

export default function OTPTimer({ expiraEm, onExpirado }) {
  const [segundosRestantes, setSegundosRestantes] = useState(0)

  useEffect(() => {
    const calcular = () => {
      const diff = Math.max(0, Math.floor((new Date(expiraEm) - new Date()) / 1000))
      setSegundosRestantes(diff)
      if (diff === 0) onExpirado?.()
    }
    calcular()
    const interval = setInterval(calcular, 1000)
    return () => clearInterval(interval)
  }, [expiraEm, onExpirado])

  const minutos = Math.floor(segundosRestantes / 60)
  const segundos = segundosRestantes % 60

  return (
    <p className={`text-sm font-medium ${segundosRestantes < 60 ? 'text-red-600' : 'text-gray-600'}`}>
      Expira em {String(minutos).padStart(2, '0')}:{String(segundos).padStart(2, '0')}
    </p>
  )
}
```

### Integração no ContratoAceitar.jsx
```jsx
// No Passo 3 (antes do botão Assinar):
import OTPInput from '../../components/OTPInput'
import OTPTimer from '../../components/OTPTimer'

function PassoOTP({ contratoId, token, onVerificado }) {
  const [otpEnviado, setOtpEnviado] = useState(false)
  const [otpInfo, setOtpInfo] = useState(null)
  const [erro, setErro] = useState(null)
  const [verificando, setVerificando] = useState(false)
  const [canais, setCanais] = useState([])

  const enviarOTP = async (canal) => {
    const res = await fetch(`/public/contratos/${contratoId}/enviar-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, canal })
    })
    const data = await res.json()
    if (res.ok) {
      setOtpInfo(data)
      setOtpEnviado(true)
      setErro(null)
    } else {
      setErro(data.erro)
    }
  }

  const verificarCodigo = async (codigo) => {
    setVerificando(true)
    setErro(null)
    const res = await fetch(`/public/contratos/${contratoId}/verificar-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, codigo })
    })
    const data = await res.json()
    setVerificando(false)
    if (res.ok) {
      onVerificado()
    } else {
      setErro(data.erro)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {!otpEnviado ? (
        <>
          <p className="text-center text-gray-700">
            Para assinar, precisamos confirmar sua identidade.
          </p>
          <button
            onClick={() => enviarOTP('whatsapp')}
            className="w-full max-w-xs px-6 py-3 bg-green-600 text-white rounded-lg font-medium"
          >
            Enviar código por WhatsApp
          </button>
        </>
      ) : (
        <>
          <p className="text-center text-gray-700">
            Enviamos um código para seu {otpInfo.canal}
            <br />
            <span className="font-mono font-bold">{otpInfo.destino_parcial}</span>
          </p>

          <OTPInput onComplete={verificarCodigo} disabled={verificando} erro={erro} />
          <OTPTimer expiraEm={otpInfo.expira_em} onExpirado={() => setErro('Código expirado')} />

          <div className="flex gap-4 text-sm">
            <button onClick={() => enviarOTP(otpInfo.canal)} className="text-orange-600 underline">
              Reenviar
            </button>
            <span className="text-gray-400">·</span>
            <button onClick={() => setOtpEnviado(false)} className="text-orange-600 underline">
              Outro canal
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```


### Comportamentos Mobile-First
| Feature | Implementação |
|---|---|
| Teclado numérico | `inputMode="numeric"` + `pattern="[0-9]*"` |
| Auto-preenchimento | Web OTP API (`OTPCredential`) |
| Auto-focus | Focus no primeiro input ao montar |
| Avançar automático | Focus no próximo após digitar |
| Backspace inteligente | Volta para input anterior se vazio |
| Colar código | `onPaste` distribui dígitos |
| Animação de erro | `animate-shake` no input com erro |
| Timer visual | Countdown com cor vermelha < 60s |
| Touch-friendly | Inputs 48x56px mínimo (touch target) |

### Acessibilidade (a11y)
- `aria-label` em cada input ("Dígito X de 6")
- `role="alert"` na mensagem de erro
- Contraste mínimo WCAG AA
- Focus ring visível (outline)
- Erro anunciado para screen readers

### CSS Animations (Tailwind)
```css
/* tailwind.config.js — adicionar: */
extend: {
  animation: {
    'shake': 'shake 0.5s ease-in-out',
    'fade-in': 'fadeIn 0.3s ease-in'
  },
  keyframes: {
    shake: {
      '0%, 100%': { transform: 'translateX(0)' },
      '25%': { transform: 'translateX(-4px)' },
      '75%': { transform: 'translateX(4px)' }
    },
    fadeIn: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' }
    }
  }
}
```

### Responsividade
```
Mobile (< 640px):
  - Input: 48x56px
  - Gap: 8px
  - Fonte: 24px

Desktop (≥ 640px):
  - Input: 56x64px
  - Gap: 12px
  - Fonte: 28px
```

### Regras
- Inputs SEMPRE com `inputMode="numeric"` (mostra teclado numérico no mobile)
- Web OTP API como progressive enhancement (não bloqueia se não suportado)
- Auto-submit ao preencher todos os 6 dígitos
- Shake animation no erro (feedback tátil visual)
- Timer muda de cor nos últimos 60 segundos
- Botão "Reenviar" com cooldown de 60s (desabilitado)
- Touch targets mínimo 44x44px (WCAG)
- Sem zoom no iOS: font-size mínimo 16px nos inputs

## Critérios de Aceite
- [ ] 6 inputs individuais com auto-focus
- [ ] Teclado numérico nativo no mobile
- [ ] Web OTP API (auto-preenche do SMS)
- [ ] Cole/paste distribui dígitos
- [ ] Backspace volta para input anterior
- [ ] Auto-submit ao completar 6 dígitos
- [ ] Timer com countdown visual
- [ ] Animação shake no erro
- [ ] Responsivo: mobile-first → desktop
- [ ] Acessível (aria-labels, role="alert")
- [ ] Touch targets ≥ 44px

## Prompt Pronto para o Kiro CLI

```
Implemente a spec SIG-07: OTP Input Mobile-First.

1. Crie components/OTPInput.jsx: 6 inputs com auto-focus + paste + Web OTP API.
2. Crie components/OTPTimer.jsx: countdown visual com cor dinâmica.
3. Altere ContratoAceitar.jsx: integrar PassoOTP entre passo 2 e aceite.
4. inputMode="numeric" para teclado nativo.
5. Animação shake no erro, fade-in na mensagem.
6. Touch targets 48x56px mobile, 56x64px desktop.
7. aria-labels para acessibilidade.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
