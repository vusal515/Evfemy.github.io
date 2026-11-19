import { describe, expect, it } from 'vitest';
import { azMobile, email, schemas, validate } from '../src/js/lib/validation.js';

describe('field rules', () => {
  it.each(['+994501234567', '0501234567', '+994 50 123 45 67', '(055) 123-45-67'])('accepts mobile %s', (n) => {
    expect(azMobile(n)).toBeNull();
  });

  it.each(['12345', '+9945012345', '+994121234567', 'phone'])('rejects mobile %s', (n) => {
    expect(azMobile(n)).not.toBeNull();
  });

  it('validates e-mail addresses', () => {
    expect(email('user@example.az')).toBeNull();
    expect(email('user@example')).not.toBeNull();
  });
});

describe('validate(schema)', () => {
  const good = {
    fullName: 'Aysel Məmmədova',
    phone: '+994 50 123 45 67',
    email: 'a@b.az',
    password: 'longenough',
    passwordConfirm: 'longenough',
  };

  it('passes a complete registration', () => {
    expect(validate(good, schemas.register)).toEqual({ valid: true, errors: {} });
  });

  it('reports only the first failing rule per field', () => {
    const { errors } = validate({ ...good, email: '' }, schemas.register);
    expect(errors).toEqual({ email: 'Bu sahə tələb olunur.' });
  });

  it('checks that passwords match', () => {
    const { valid, errors } = validate({ ...good, passwordConfirm: 'different' }, schemas.register);
    expect(valid).toBe(false);
    expect(errors.passwordConfirm).toMatch(/eyni deyil/);
  });

  it('requires a numeric order number', () => {
    const { errors } = validate({ email: 'a@b.az', orderNumber: 'AB12' }, schemas['order-tracking']);
    expect(errors.orderNumber).toBeDefined();
  });
});
