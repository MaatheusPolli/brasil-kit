import { describe, expect, it, vi } from 'vitest';
import { fallback } from '../../src/core/fallback.js';
import { NotFoundError, ProviderError, RateLimitError, TimeoutError, ValidationError, isTransient } from '../../src/core/errors.js';

describe('fallback', () => {
  it('primeiro com 500 → segundo assume', async () => {
    const second = vi.fn().mockResolvedValue('b');
    await expect(fallback([() => Promise.reject(new ProviderError('x', { status: 500 })), second])).resolves.toBe('b');
    expect(second).toHaveBeenCalledOnce();
  });

  it('primeiro com 404 → NÃO faz fallback', async () => {
    const second = vi.fn().mockResolvedValue('b');
    await expect(fallback([() => Promise.reject(new NotFoundError()), second])).rejects.toBeInstanceOf(NotFoundError);
    expect(second).not.toHaveBeenCalled();
  });

  it('timeout e rate limit acionam fallback', async () => {
    await expect(fallback([() => Promise.reject(new TimeoutError()), () => Promise.reject(new RateLimitError()), async () => 'c'])).resolves.toBe('c');
  });

  it('todos falham → lança o último erro', async () => {
    const last = new ProviderError('último', { status: 502 });
    await expect(fallback([() => Promise.reject(new ProviderError('a')), () => Promise.reject(last)])).rejects.toBe(last);
  });

  it('403 aciona fallback, mas 400 não', async () => {
    await expect(fallback([() => Promise.reject(new ProviderError('x', { status: 403 })), async () => 'b'])).resolves.toBe('b');
    await expect(fallback([() => Promise.reject(new ProviderError('x', { status: 400 })), async () => 'b'])).rejects.toMatchObject({ status: 400 });
  });

  it('lista vazia é erro', async () => {
    await expect(fallback([])).rejects.toBeInstanceOf(ProviderError);
  });
});

describe('isTransient', () => {
  it('classifica os erros', () => {
    expect(isTransient(new ProviderError('rede'))).toBe(true);
    expect(isTransient(new ProviderError('5xx', { status: 503 }))).toBe(true);
    expect(isTransient(new ProviderError('4xx', { status: 400 }))).toBe(false);
    expect(isTransient(new ValidationError('x'))).toBe(false);
    expect(isTransient(new Error('x'))).toBe(false);
  });
});
