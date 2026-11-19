import { describe, expect, it, vi } from 'vitest';
import { ApiError, ApiNotConfiguredError, createApiClient } from '../src/js/services/api.js';

const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

describe('api client', () => {
  it('rejects with ApiNotConfiguredError when no base URL is set', async () => {
    const fetchImpl = vi.fn();
    await expect(createApiClient({ fetchImpl }).submitForm('login', {})).rejects.toBeInstanceOf(ApiNotConfiguredError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('POSTs JSON to the endpoint for the form', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const client = createApiClient({ baseUrl: 'https://api.example.test', fetchImpl });
    await expect(client.submitForm('order-tracking', { orderNumber: '1' })).resolves.toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.example.test/orders/track');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ orderNumber: '1' });
  });

  it('wraps HTTP errors with the status code', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(503, {}));
    const client = createApiClient({ baseUrl: 'https://api.example.test', fetchImpl });
    await expect(client.submitForm('login', {})).rejects.toMatchObject({ name: 'ApiError', status: 503 });
  });

  it('turns network failures and timeouts into ApiError', async () => {
    const network = createApiClient({
      baseUrl: 'https://x.test',
      fetchImpl: vi.fn().mockRejectedValue(new TypeError('fail')),
    });
    await expect(network.submitForm('login', {})).rejects.toBeInstanceOf(ApiError);

    const hanging = (_url, { signal }) =>
      new Promise((_, reject) =>
        signal.addEventListener('abort', () => reject(Object.assign(new Error(), { name: 'AbortError' }))),
      );
    const slow = createApiClient({ baseUrl: 'https://x.test', fetchImpl: hanging, timeoutMs: 5 });
    await expect(slow.submitForm('login', {})).rejects.toThrow('Request timed out');
  });

  it('rejects unknown form names', async () => {
    await expect(createApiClient({ baseUrl: 'https://x.test' }).submitForm('nope', {})).rejects.toThrow(/No endpoint/);
  });
});
