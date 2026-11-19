import { qs, qsa, on } from '../lib/dom.js';
import { schemas, validate } from '../lib/validation.js';
import { api as defaultApi, ApiNotConfiguredError } from '../services/api.js';

const MESSAGES = {
  notConfigured:
    'Bu nümayiş versiyasında server qoşulmayıb, ona görə məlumat heç yerə göndərilmədi. Forma yoxlaması işləyir.',
  failed: 'Sorğu alınmadı. Bir az sonra yenidən cəhd edin.',
  success: 'Sorğunuz qəbul edildi.',
};

function showFieldErrors(form, errors) {
  qsa('[data-field-error]', form).forEach((el) => el.remove());
  qsa('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
  let first = null;
  for (const [name, message] of Object.entries(errors)) {
    const input = form.elements.namedItem(name);
    if (!input) continue;
    const id = `${form.dataset.form}-${name}-error`;
    const hint = document.createElement('span');
    hint.className = 'field-error';
    hint.id = id;
    hint.dataset.fieldError = '';
    hint.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', id);
    input.closest('label')?.after(hint);
    first ??= input;
  }
  first?.focus();
}

function setStatus(form, message, kind) {
  const status = qs('[data-form-status]', form);
  if (!status) return;
  status.textContent = message;
  status.dataset.kind = kind;
}

/** Collects values; checkboxes become booleans and passwords are never logged. */
export function formValues(form) {
  const values = {};
  for (const element of form.elements) {
    if (!element.name) continue;
    values[element.name] = element.type === 'checkbox' ? element.checked : element.value;
  }
  return values;
}

/**
 * Validates and submits a `data-form` form. `extend` lets a page add data that
 * is not a form field (the checkout adds the cart lines). `onSuccess` runs
 * after the server accepted the request.
 */
export async function handleSubmit(form, { api = defaultApi, extend = (payload) => payload, onSuccess } = {}) {
  const name = form.dataset.form;
  const values = formValues(form);
  const { valid, errors } = validate(values, schemas[name] ?? {});
  showFieldErrors(form, errors);
  if (!valid) {
    setStatus(form, '', 'idle');
    return { ok: false, reason: 'invalid', errors };
  }

  const submit = qs('[type="submit"]', form);
  submit.disabled = true;
  form.setAttribute('aria-busy', 'true');
  try {
    // passwordConfirm is a client-side check only.
    const { passwordConfirm: _ignored, ...payload } = values;
    const response = await api.submitForm(name, extend(payload));
    setStatus(form, MESSAGES.success, 'success');
    form.reset();
    onSuccess?.(response);
    return { ok: true };
  } catch (error) {
    const notConfigured = error instanceof ApiNotConfiguredError;
    setStatus(form, notConfigured ? MESSAGES.notConfigured : MESSAGES.failed, notConfigured ? 'info' : 'error');
    if (!notConfigured) console.error(`[forms] ${name} submission failed`, error);
    return { ok: false, reason: notConfigured ? 'not-configured' : 'error' };
  } finally {
    submit.disabled = false;
    form.removeAttribute('aria-busy');
  }
}

export function initForms(root = document, options) {
  qsa('form[data-form]', root).forEach((form) =>
    on(form, 'submit', (event) => {
      event.preventDefault();
      handleSubmit(form, options);
    }),
  );
  qsa('[data-password-toggle]', root).forEach((button) =>
    on(button, 'click', () => {
      const input = button.parentElement.querySelector('input');
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-label', show ? 'Şifrəni gizlət' : 'Şifrəni göstər');
      button.querySelector('use')?.setAttribute('href', show ? '#i-eye-off' : '#i-eye');
    }),
  );
}
