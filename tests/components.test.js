import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleSubmit, initForms } from '../src/js/components/forms.js';
import { initAccordions, toggleDisclosure } from '../src/js/components/disclosure.js';
import { initTabs } from '../src/js/components/tabs.js';
import { createPanel } from '../src/js/components/overlays.js';
import { ApiNotConfiguredError } from '../src/js/services/api.js';

vi.mock('jquery', () => ({ default: vi.fn() }));
vi.mock('slick-carousel', () => ({}));
const { resolveOptions, PRESETS } = await import('../src/js/components/carousels.js');

const loginForm = () => {
  document.body.innerHTML = `
    <form data-form="login" novalidate>
      <label><input name="email" type="email"></label>
      <label><input name="password" type="password"></label>
      <label><input name="remember" type="checkbox" checked></label>
      <p data-form-status></p>
      <button type="submit">Daxil ol</button>
    </form>`;
  return document.querySelector('form');
};

describe('forms', () => {
  it('shows field errors and does not call the API when invalid', async () => {
    const form = loginForm();
    const api = { submitForm: vi.fn() };
    const result = await handleSubmit(form, { api });
    expect(result.ok).toBe(false);
    expect(api.submitForm).not.toHaveBeenCalled();
    const email = form.elements.email;
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(email.getAttribute('aria-describedby')).textContent).toMatch(/tələb olunur/);
  });

  it('explains that no back end is connected instead of faking success', async () => {
    const form = loginForm();
    form.elements.email.value = 'a@b.az';
    form.elements.password.value = 'secret';
    const api = { submitForm: vi.fn().mockRejectedValue(new ApiNotConfiguredError()) };
    const result = await handleSubmit(form, { api });
    expect(result).toEqual({ ok: false, reason: 'not-configured' });
    const status = form.querySelector('[data-form-status]');
    expect(status.dataset.kind).toBe('info');
    expect(status.textContent).toMatch(/server qoşulmayıb/);
    expect(form.querySelector('[type=submit]').disabled).toBe(false);
  });

  it('sends values (checkbox as boolean) and resets on success', async () => {
    const form = loginForm();
    form.elements.email.value = 'a@b.az';
    form.elements.password.value = 'secret';
    const api = { submitForm: vi.fn().mockResolvedValue({}) };
    await handleSubmit(form, { api });
    expect(api.submitForm).toHaveBeenCalledWith('login', { email: 'a@b.az', password: 'secret', remember: true });
    expect(form.elements.email.value).toBe('');
  });

  it('logs and reports unexpected errors', async () => {
    const form = loginForm();
    form.elements.email.value = 'a@b.az';
    form.elements.password.value = 'x';
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await handleSubmit(form, { api: { submitForm: vi.fn().mockRejectedValue(new Error('boom')) } });
    expect(result.reason).toBe('error');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('toggles password visibility', () => {
    document.body.innerHTML = `<label><input type="password"><button type="button" data-password-toggle aria-label="Şifrəni göstər"><svg><use href="#i-eye"></use></svg></button></label>`;
    initForms(document);
    const button = document.querySelector('button');
    button.click();
    expect(document.querySelector('input').type).toBe('text');
    expect(button.getAttribute('aria-label')).toBe('Şifrəni gizlət');
    expect(button.querySelector('use').getAttribute('href')).toBe('#i-eye-off');
  });
});

describe('accordions', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ul>
        <li><button data-accordion aria-controls="p1" aria-expanded="false">A</button><div id="p1" hidden></div></li>
        <li><button data-accordion aria-controls="p2" aria-expanded="false">B</button><div id="p2" hidden></div></li>
      </ul>`;
  });

  it('opens one panel at a time', () => {
    initAccordions(document);
    const [a, b] = document.querySelectorAll('button');
    a.click();
    expect(document.getElementById('p1').hidden).toBe(false);
    b.click();
    expect(document.getElementById('p1').hidden).toBe(true);
    expect(a.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById('p2').hidden).toBe(false);
  });

  it('returns false when the controlled panel is missing', () => {
    const button = document.createElement('button');
    button.setAttribute('aria-controls', 'missing');
    expect(toggleDisclosure(button)).toBe(false);
  });
});

describe('tabs', () => {
  it('switches panels and supports arrow keys', () => {
    document.body.innerHTML = `
      <div data-tabs>
        <button role="tab" aria-controls="one" aria-selected="true">1</button>
        <button role="tab" aria-controls="two" aria-selected="false" tabindex="-1">2</button>
        <div id="one"></div><div id="two" hidden></div>
      </div>`;
    initTabs(document);
    const [first, second] = document.querySelectorAll('[role=tab]');
    second.click();
    expect(document.getElementById('two').hidden).toBe(false);
    expect(document.getElementById('one').hidden).toBe(true);
    second.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(first.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(first);
  });
});

describe('panels', () => {
  it('moves focus in, closes on Escape and restores focus to the trigger', () => {
    document.body.innerHTML = `
      <button id="open" aria-controls="drawer" aria-expanded="false">menu</button>
      <div id="drawer" hidden><button id="inside">x</button></div>`;
    const trigger = document.getElementById('open');
    const drawer = document.getElementById('drawer');
    const panel = createPanel(drawer);
    trigger.focus();
    panel.open(trigger);
    expect(drawer.hidden).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement.id).toBe('inside');
    expect(document.body.classList.contains('no-scroll')).toBe(true);
    drawer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(drawer.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
    expect(document.body.classList.contains('no-scroll')).toBe(false);
  });
});

describe('carousel presets', () => {
  it('has a preset for every content variant', async () => {
    const { VARIANT_CLASS } = await import('../src/render/templates/home.js');
    expect(Object.keys(PRESETS).sort()).toEqual(Object.keys(VARIANT_CLASS).sort());
  });

  it('turns autoplay off for users who prefer reduced motion', () => {
    expect(resolveOptions('products').autoplay).toBe(true);
    expect(resolveOptions('products', { reducedMotion: true })).toMatchObject({ autoplay: false, speed: 0 });
    expect(resolveOptions('unknown')).toBeNull();
  });
});
