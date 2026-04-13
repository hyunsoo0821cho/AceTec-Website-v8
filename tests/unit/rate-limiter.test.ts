import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '../../src/lib/rate-limiter';

describe('checkRateLimit', () => {
  it('allows requests within limit', () => {
    const key = `test-${Date.now()}`;
    const result = checkRateLimit(key, 3, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('blocks requests exceeding limit', () => {
    const key = `test-block-${Date.now()}`;
    checkRateLimit(key, 2, 60_000);
    checkRateLimit(key, 2, 60_000);
    const result = checkRateLimit(key, 2, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after window expires', () => {
    const key = `test-reset-${Date.now()}`;
    // Use a 1ms window so it expires immediately
    checkRateLimit(key, 1, 1);

    // Wait a tick for the window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result = checkRateLimit(key, 1, 60_000);
        expect(result.allowed).toBe(true);
        resolve();
      }, 10);
    });
  });
});
