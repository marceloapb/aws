export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function isValidPassword(password) {
  // Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  return regex.test(password);
}

export function getPasswordErrors(password) {
  const errors = [];
  if (password.length < 8) errors.push('Mínimo 8 caracteres');
  if (!/[A-Z]/.test(password)) errors.push('Uma letra maiúscula');
  if (!/[a-z]/.test(password)) errors.push('Uma letra minúscula');
  if (!/\d/.test(password)) errors.push('Um número');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Um símbolo');
  return errors;
}

export function isValidPhone(phone) {
  if (!phone) return true; // opcional
  const regex = /^\+?[\d\s()-]{10,15}$/;
  return regex.test(phone);
}
