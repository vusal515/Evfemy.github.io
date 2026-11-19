/**
 * Thin HTTP layer for form submissions.
 *
 * This repository ships the storefront front end only. The original PHP back
 * end (login, registration, order tracking) is not part of it, so unless
 * VITE_API_BASE_URL is set at build time every call rejects with
 * ApiNotConfiguredError and the UI says so plainly instead of pretending
 * the request succeeded.
 */

export class ApiNotConfiguredError extends Error {
  constructor() {
    super('API base URL is not configured');
    this.name = 'ApiNotConfiguredError';
  }
}

export class ApiError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
  }
}

export const ENDPOINTS = {
  login: '/auth/login',
  register: '/auth/register',
  'order-tracking': '/orders/track',
};

export function createApiClient({ baseUrl, fetchImpl = globalThis.fetch, timeoutMs = 10000 } = {}) {
  async function post(path, body) {
    if (!baseUrl) throw new ApiNotConfiguredError();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(new URL(path, baseUrl).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok)
        throw new ApiError(`Request failed with status ${response.status}`, { status: response.status });
      return response.status === 204 ? null : await response.json();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error?.name === 'AbortError') throw new ApiError('Request timed out', { cause: error });
      throw new ApiError('Network error', { cause: error });
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    submitForm(formName, values) {
      const path = ENDPOINTS[formName];
      if (!path) return Promise.reject(new Error(`No endpoint registered for form "${formName}"`));
      return post(path, values);
    },
  };
}

export const api = createApiClient({ baseUrl: import.meta.env?.VITE_API_BASE_URL });
