function normalizeWhatsAppNumber(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('225')) return digits;
  if (/^(01|05|07)\d{8}$/.test(digits)) return `225${digits}`;
  return digits;
}

export const store = {
  name: 'ETS Diarra Frère',
  whatsappNumber: normalizeWhatsAppNumber(import.meta.env.VITE_WHATSAPP_NUMBER ?? ''),
  currency: 'XOF'
};