import { describe, it, expect } from 'vitest';
import { sanitizeChatMessage, sanitizeContactMessage, EMAIL_REGEX } from '../../src/lib/sanitize';

describe('sanitizeChatMessage', () => {
  it('strips HTML tags', () => {
    expect(sanitizeChatMessage('<script>alert("xss")</script>hello')).toBe('alert("xss")hello');
  });

  it('trims whitespace', () => {
    expect(sanitizeChatMessage('  hello  ')).toBe('hello');
  });

  it('truncates to 1000 chars', () => {
    const long = 'a'.repeat(1500);
    expect(sanitizeChatMessage(long).length).toBe(1000);
  });

  it('handles empty string', () => {
    expect(sanitizeChatMessage('')).toBe('');
  });
});

describe('sanitizeContactMessage', () => {
  it('truncates to 5000 chars', () => {
    const long = 'b'.repeat(6000);
    expect(sanitizeContactMessage(long).length).toBe(5000);
  });
});

describe('EMAIL_REGEX', () => {
  it('matches valid emails', () => {
    expect(EMAIL_REGEX.test('user@example.com')).toBe(true);
    expect(EMAIL_REGEX.test('user@sub.domain.co.kr')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(EMAIL_REGEX.test('notanemail')).toBe(false);
    expect(EMAIL_REGEX.test('@no-local.com')).toBe(false);
    expect(EMAIL_REGEX.test('no-domain@')).toBe(false);
  });
});
