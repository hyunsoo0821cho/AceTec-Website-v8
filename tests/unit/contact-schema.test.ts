import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { EMAIL_REGEX } from '../../src/lib/sanitize';

const ContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().regex(EMAIL_REGEX),
  message: z.string().min(1).max(5000),
  newsletter: z.boolean().optional().default(false),
  sourcePage: z.string().optional(),
});

describe('Contact Form Schema', () => {
  const validData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    message: 'I need a quote for VPX boards.',
  };

  it('accepts valid submission', () => {
    const result = ContactSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects missing firstName', () => {
    const result = ContactSchema.safeParse({ ...validData, firstName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing lastName', () => {
    const result = ContactSchema.safeParse({ ...validData, lastName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = ContactSchema.safeParse({ ...validData, email: 'not-email' });
    expect(result.success).toBe(false);
  });

  it('accepts Korean email domain', () => {
    const result = ContactSchema.safeParse({ ...validData, email: 'user@acetec-korea.co.kr' });
    expect(result.success).toBe(true);
  });

  it('rejects empty message', () => {
    const result = ContactSchema.safeParse({ ...validData, message: '' });
    expect(result.success).toBe(false);
  });

  it('rejects message over 5000 chars', () => {
    const result = ContactSchema.safeParse({ ...validData, message: 'x'.repeat(5001) });
    expect(result.success).toBe(false);
  });

  it('defaults newsletter to false', () => {
    const result = ContactSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.newsletter).toBe(false);
    }
  });

  it('accepts optional sourcePage', () => {
    const result = ContactSchema.safeParse({ ...validData, sourcePage: '/contact' });
    expect(result.success).toBe(true);
  });
});
