import { describe, expect, it, vi, afterEach } from 'vitest';
import { withRetry, backoffDelay } from '../../src/core/retry.js';
import { NotFoundError, ProviderError } from '../../src/core/errors.js';

afterEach(() => vi.useRealTimers());

describe('withRetry', () => {
  it('respeita o número de tentativas', async () => {
    const fn = vi.fn().mockRejectedValue(new ProviderError('x', { status: 503 }));
    await expect(withRetry(fn, { retries: 3, sleep: async () => {} })).rejects.toBeInstanceOf(ProviderError);
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('para no primeiro sucesso', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new ProviderError('x')).mockResolvedValue('ok');
    await expect(withRetry(fn, { retries: 5, sleep: async () => {} })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('não repete 403 (vai direto para o fallback)', async () => {
    const fn = vi.fn().mockRejectedValue(new ProviderError('x', { status: 403 }));
    await expect(withRetry(fn, { retries: 3, sleep: async () => {} })).rejects.toMatchObject({ status: 403 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('não repete erro definitivo (404)', async () => {
    const fn = vi.fn().mockRejectedValue(new NotFoundError());
    await expect(withRetry(fn, { retries: 3, sleep: async () => {} })).rejects.toBeInstanceOf(NotFoundError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('aplica backoff exponencial com timers falsos', async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockRejectedValueOnce(new ProviderError('a')).mockRejectedValueOnce(new ProviderError('b')).mockResolvedValue('ok');
    const promise = withRetry(fn, { retries: 2, baseDelay: 100, random: () => 1 });
    await vi.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(99);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(199);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toBe('ok');
  });
});

describe('backoffDelay', () => {
  it('dobra a cada tentativa e respeita o teto', () => {
    expect(backoffDelay(0, 100, 1000, () => 1)).toBe(100);
    expect(backoffDelay(3, 100, 1000, () => 1)).toBe(800);
    expect(backoffDelay(10, 100, 1000, () => 1)).toBe(1000);
    expect(backoffDelay(3, 100, 1000, () => 0.5)).toBe(400);
  });
});
