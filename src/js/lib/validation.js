/**
 * Pure form validation rules. Each validator returns an error message
 * (Azerbaijani, shown to the user) or null when the value is valid.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Azerbaijani mobile numbers: +994 or 0 prefix, operator code, 7 digits.
const AZ_MOBILE = /^(?:\+?994|0)(10|50|51|55|60|70|77|99)\d{7}$/;

export const required = (value) => (String(value ?? '').trim() ? null : 'Bu sahə tələb olunur.');

export const email = (value) => (EMAIL.test(String(value).trim()) ? null : 'Düzgün e-mail ünvanı daxil edin.');

export function normalizePhone(value) {
  return String(value).replace(/[\s()-]/g, '');
}

export const azMobile = (value) =>
  AZ_MOBILE.test(normalizePhone(value)) ? null : 'Nömrəni +994 50 123 45 67 formatında daxil edin.';

export const minLength = (min) => (value) => (String(value).length >= min ? null : `Ən azı ${min} simvol daxil edin.`);

export const matches =
  (otherField, message = 'Şifrələr eyni deyil.') =>
  (value, values) =>
    value === values[otherField] ? null : message;

export const digits = (value) => (/^\d+$/.test(String(value).trim()) ? null : 'Yalnız rəqəm daxil edin.');

/** Form schemas: field name -> ordered list of rules. The first failing rule wins. */
export const schemas = {
  login: {
    email: [required, email],
    password: [required],
  },
  register: {
    fullName: [required, minLength(3)],
    phone: [required, azMobile],
    email: [required, email],
    password: [required, minLength(8)],
    passwordConfirm: [required, matches('password')],
  },
  'order-tracking': {
    email: [required, email],
    orderNumber: [required, digits],
  },
};

/**
 * Validates a plain object against a schema.
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validate(values, schema) {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    for (const rule of rules) {
      const error = rule(values[field] ?? '', values);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
