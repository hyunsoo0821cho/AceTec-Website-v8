import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from '../../src/lib/vector-store';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0);
  });

  it('handles high-dimensional vectors', () => {
    const a = Array.from({ length: 768 }, (_, i) => Math.sin(i));
    const b = Array.from({ length: 768 }, (_, i) => Math.sin(i + 0.1));
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.9);
    expect(sim).toBeLessThanOrEqual(1.0);
  });

  it('returns valid similarity for real embedding-like vectors', () => {
    const a = [0.1, -0.2, 0.3, 0.4, -0.5];
    const b = [0.15, -0.18, 0.28, 0.42, -0.48];
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.95);
  });
});
