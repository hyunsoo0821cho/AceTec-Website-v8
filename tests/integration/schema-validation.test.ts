import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { EMAIL_REGEX, sanitizeChatMessage, sanitizeContactMessage } from '../../src/lib/sanitize';
import { checkRateLimit } from '../../src/lib/rate-limiter';

/**
 * Cross-module 스키마 + 비즈니스 로직 통합 검증
 * API 엔드포인트에서 사용하는 Zod 스키마와 sanitize/rate-limiter가 함께 올바르게 동작하는지 검증
 */

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  sessionId: z.string().nullable().optional(),
  conversationId: z.string().nullable().optional(),
  visitorId: z.string().nullable().optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().default([]),
});

const ContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().regex(EMAIL_REGEX),
  message: z.string().min(1).max(5000),
  newsletter: z.boolean().optional().default(false),
  sourcePage: z.string().optional(),
});

describe('Chat API: Schema + Sanitize 통합', () => {
  it('validates and sanitizes a normal message', () => {
    const input = { message: '에이스텍 제품 문의입니다' };
    const parsed = ChatRequestSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const sanitized = sanitizeChatMessage(parsed.data.message);
      expect(sanitized).toBe('에이스텍 제품 문의입니다');
    }
  });

  it('validates then sanitizes XSS attempt', () => {
    const input = { message: '<script>alert("xss")</script>정상 메시지' };
    const parsed = ChatRequestSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const sanitized = sanitizeChatMessage(parsed.data.message);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('정상 메시지');
    }
  });

  it('rejects then no sanitize needed for empty message', () => {
    const parsed = ChatRequestSchema.safeParse({ message: '' });
    expect(parsed.success).toBe(false);
  });

  it('schema + sanitize trims long message correctly', () => {
    // Schema allows max 1000, sanitize also trims to 1000
    const input = { message: 'A'.repeat(1000) };
    const parsed = ChatRequestSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const sanitized = sanitizeChatMessage(parsed.data.message);
      expect(sanitized.length).toBe(1000);
    }
  });

  it('schema rejects before sanitize for over-length message', () => {
    const parsed = ChatRequestSchema.safeParse({ message: 'A'.repeat(1001) });
    expect(parsed.success).toBe(false);
  });

  it('handles history with sanitized content', () => {
    const input = {
      message: '질문입니다',
      history: [
        { role: 'user' as const, content: '이전 질문' },
        { role: 'assistant' as const, content: '이전 답변' },
      ],
    };
    const parsed = ChatRequestSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.history.length).toBe(2);
    }
  });
});

describe('Contact API: Schema + Sanitize 통합', () => {
  const validContact = {
    firstName: '김',
    lastName: '철수',
    email: 'cheolsu@acetec-korea.co.kr',
    message: 'VPX 보드 견적 요청합니다.',
  };

  it('validates and sanitizes contact message', () => {
    const parsed = ContactSchema.safeParse(validContact);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const sanitized = sanitizeContactMessage(parsed.data.message);
      expect(sanitized).toBe('VPX 보드 견적 요청합니다.');
    }
  });

  it('sanitizes HTML in contact message after validation', () => {
    const input = { ...validContact, message: '<b>Bold</b> 견적 요청' };
    const parsed = ContactSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const sanitized = sanitizeContactMessage(parsed.data.message);
      expect(sanitized).not.toContain('<b>');
      expect(sanitized).toContain('견적 요청');
    }
  });

  it('Korean email domain validation works', () => {
    const koreanEmails = [
      'user@daum.net',
      'user@naver.com',
      'user@acetec-korea.co.kr',
      'user@samsung.co.kr',
    ];
    for (const email of koreanEmails) {
      const parsed = ContactSchema.safeParse({ ...validContact, email });
      expect(parsed.success, `Expected ${email} to be valid`).toBe(true);
    }
  });
});

describe('Rate Limiter + Schema 통합', () => {
  it('rate limits chat requests per IP', () => {
    const ip = `chat-integration-${Date.now()}`;
    // Chat: 20 requests per minute
    for (let i = 0; i < 20; i++) {
      const result = checkRateLimit(`chat:${ip}`, 20, 60_000);
      expect(result.allowed).toBe(true);
    }
    // 21st should be blocked
    const blocked = checkRateLimit(`chat:${ip}`, 20, 60_000);
    expect(blocked.allowed).toBe(false);
  });

  it('rate limits contact form more strictly', () => {
    const ip = `contact-integration-${Date.now()}`;
    // Contact: 5 requests per minute
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(`contact:${ip}`, 5, 60_000);
      expect(result.allowed).toBe(true);
    }
    const blocked = checkRateLimit(`contact:${ip}`, 5, 60_000);
    expect(blocked.allowed).toBe(false);
  });

  it('different IPs have independent limits', () => {
    const ip1 = `ip1-${Date.now()}`;
    const ip2 = `ip2-${Date.now()}`;

    // ip1 사용량 소진
    for (let i = 0; i < 5; i++) {
      checkRateLimit(`chat:${ip1}`, 5, 60_000);
    }
    expect(checkRateLimit(`chat:${ip1}`, 5, 60_000).allowed).toBe(false);

    // ip2는 여전히 사용 가능
    expect(checkRateLimit(`chat:${ip2}`, 5, 60_000).allowed).toBe(true);
  });
});
