import React, { useState, useEffect } from 'react';

/**
 * SIG-07: OTP Timer — countdown visual com cor dinâmica
 */
export default function OTPTimer({ expiraEm, onExpirado }) {
  const [segundosRestantes, setSegundosRestantes] = useState(0);

  useEffect(() => {
    if (!expiraEm) return;

    const calcular = () => {
      const diff = Math.max(0, Math.floor((new Date(expiraEm) - new Date()) / 1000));
      setSegundosRestantes(diff);
      if (diff === 0 && onExpirado) {
        onExpirado();
      }
    };

    calcular();
    const interval = setInterval(calcular, 1000);
    return () => clearInterval(interval);
  }, [expiraEm, onExpirado]);

  if (!expiraEm) return null;

  const minutos = Math.floor(segundosRestantes / 60);
  const segundos = segundosRestantes % 60;
  const urgente = segundosRestantes < 60;
  const expirou = segundosRestantes === 0;

  return (
    <p className={`text-sm font-medium ${expirou ? 'text-red-700' : urgente ? 'text-red-600' : 'text-gray-600'}`}>
      {expirou
        ? 'Código expirado'
        : `Expira em ${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
      }
    </p>
  );
}
