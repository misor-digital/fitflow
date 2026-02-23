export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8) errors.push('Минимум 8 символа');
  if (!/[a-z]/.test(password)) errors.push('Поне една малка буква');
  if (!/[A-Z]/.test(password)) errors.push('Поне една главна буква');
  if (!/\d/.test(password)) errors.push('Поне една цифра');
  if (!/[^a-zA-Z0-9]/.test(password)) errors.push('Поне един специален символ');

  return { isValid: errors.length === 0, errors };
}
