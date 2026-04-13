import { describe, it, expect } from 'vitest';
import { generateCode } from '../../src/lib/email';

describe('Email Module', () => {
  describe('generateCode', () => {
    it('generates a 6-digit string', () => {
      const code = generateCode();
      expect(code).toMatch(/^\d{6}$/);
    });

    it('generates a number >= 100000', () => {
      const code = generateCode();
      expect(parseInt(code)).toBeGreaterThanOrEqual(100000);
    });

    it('generates a number <= 999999', () => {
      const code = generateCode();
      expect(parseInt(code)).toBeLessThanOrEqual(999999);
    });

    it('generates different codes (non-deterministic check)', () => {
      const codes = new Set(Array.from({ length: 50 }, () => generateCode()));
      // 50번 생성하면 최소 2개 이상 다른 코드가 있어야 함
      expect(codes.size).toBeGreaterThan(1);
    });
  });
});
