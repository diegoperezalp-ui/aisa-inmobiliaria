const mexicanNumber = /^[2-9][0-9]{9}$/;

export const normalizeMexicanPhone = value => {
  if (typeof value !== 'string') return null;
  const input = value.trim();
  if (!input || input.length > 24 || !/^\+?[0-9\s().-]+$/.test(input)) return null;
  if ((input.match(/\+/g) || []).length > 1 || (input.includes('+') && !input.startsWith('+'))) return null;
  const digits = input.replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('52') ? digits.slice(2) : digits;
  if (!mexicanNumber.test(local) || /^([0-9])\1{9}$/.test(local)) return null;
  return `+52${local}`;
};

export const isValidMexicanPhone = value => normalizeMexicanPhone(value) !== null;

