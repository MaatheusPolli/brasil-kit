import { describe, expect, it } from 'vitest';
import { BrasilKitError, NotFoundError, ProviderError, RateLimitError, TimeoutError, ValidationError } from '../../src/core/errors.js';

describe('erros tipados', () => {
  it.each([
    [new NotFoundError(), 'NOT_FOUND', NotFoundError],
    [new RateLimitError(), 'RATE_LIMIT', RateLimitError],
    [new TimeoutError(), 'TIMEOUT', TimeoutError],
    [new ProviderError(), 'PROVIDER', ProviderError],
    [new ValidationError('x'), 'VALIDATION', ValidationError],
  ])('%s tem instanceof, name e code corretos', (err, code, Cls) => {
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(BrasilKitError);
    expect(err).toBeInstanceOf(Cls);
    expect(err.code).toBe(code);
    expect(err.name).toBe(Cls.name);
  });

  it('preserva detalhes e cause', () => {
    const cause = new Error('raiz');
    const err = new ProviderError('falhou', { provider: 'viacep', status: 502, url: 'u', cause });
    expect(err).toMatchObject({ provider: 'viacep', status: 502, url: 'u', cause });
    expect(new RateLimitError('x', { retryAfter: 3 }).retryAfter).toBe(3);
  });
});
