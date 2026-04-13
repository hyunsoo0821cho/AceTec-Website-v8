import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Re-define the schema here to test independently (same as in /api/chat.ts)
const ChatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  sessionId: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .optional()
    .default([]),
});

describe('Chat API Request Schema', () => {
  it('accepts valid minimal request', () => {
    const result = ChatRequestSchema.safeParse({ message: 'hello' });
    expect(result.success).toBe(true);
  });

  it('accepts request with history', () => {
    const result = ChatRequestSchema.safeParse({
      message: 'follow up',
      history: [
        { role: 'user', content: 'first message' },
        { role: 'assistant', content: 'first reply' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty message', () => {
    const result = ChatRequestSchema.safeParse({ message: '' });
    expect(result.success).toBe(false);
  });

  it('rejects message over 1000 chars', () => {
    const result = ChatRequestSchema.safeParse({ message: 'a'.repeat(1001) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid history role', () => {
    const result = ChatRequestSchema.safeParse({
      message: 'hi',
      history: [{ role: 'system', content: 'hacked' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts missing history (defaults to empty)', () => {
    const result = ChatRequestSchema.safeParse({ message: 'hi' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.history).toEqual([]);
    }
  });

  it('accepts optional sessionId', () => {
    const result = ChatRequestSchema.safeParse({
      message: 'hi',
      sessionId: 'abc-123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-string message', () => {
    const result = ChatRequestSchema.safeParse({ message: 123 });
    expect(result.success).toBe(false);
  });
});
