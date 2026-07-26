import React, { useState, useRef, useEffect } from 'react';

const OTP_LENGTH = 6;

/**
 * SIG-07: OTP Input Mobile-First
 * 6 inputs individuais com auto-focus, paste, Web OTP API
 */
export default function OTPInput({ onComplete, disabled, erro, onClear }) {
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus no primeiro input ao montar
    if (!disabled) {
      inputRefs.current[0]?.focus();
    }
  }, [disabled]);

  // Web OTP API — auto-preenchimento
  useEffect(() => {
    if ('OTPCredential' in window) {
      const ac = new AbortController();
      navigator.credentials.get({
        otp: { transport: ['sms'] },
        signal: ac.signal,
      }).then(otp => {
        if (otp?.code) {
          const chars = otp.code.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
          if (chars.length === OTP_LENGTH) {
            setDigits(chars);
            onComplete(chars.join(''));
          }
        }
      }).catch(() => {});
      return () => ac.abort();
    }
  }, [onComplete]);

  // Limpar inputs quando solicitado externamente
  useEffect(() => {
    if (onClear) {
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  }, [onClear]);

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto-focus no próximo
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit ao completar
    if (newDigits.every(d => d !== '') && newDigits.join('').length === OTP_LENGTH) {
      onComplete(newDigits.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (paste.length > 0) {
      const chars = paste.split('');
      const newDigits = [...digits];
      for (let i = 0; i < chars.length && i < OTP_LENGTH; i++) {
        newDigits[i] = chars[i];
      }
      setDigits(newDigits);
      // Focar no último preenchido ou no próximo vazio
      const focusIndex = Math.min(chars.length, OTP_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
      // Auto-submit se colou 6 dígitos
      if (newDigits.every(d => d !== '') && newDigits.join('').length === OTP_LENGTH) {
        onComplete(newDigits.join(''));
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2 sm:gap-3">
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
            onPaste={handlePaste}
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
            style={{ fontSize: '24px', minWidth: '48px', minHeight: '56px' }}
          />
        ))}
      </div>
      {erro && (
        <p className="text-red-600 text-sm font-medium animate-fade-in" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
