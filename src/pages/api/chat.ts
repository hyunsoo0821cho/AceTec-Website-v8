import type { APIRoute } from 'astro';
import { z } from 'zod';
import { generateChatResponse } from '../../lib/chat';
import { checkRateLimit } from '../../lib/rate-limiter';
import { sanitizeChatMessage } from '../../lib/sanitize';
import { sanitizeOutput } from '../../lib/chatbot-guard';
import getDb from '../../lib/db';

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  sessionId: z.string().nullable().optional(),
  conversationId: z.string().nullable().optional(),
  visitorId: z.string().nullable().optional(),
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

export const POST: APIRoute = async ({ request }) => {
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
  const { allowed } = checkRateLimit(`chat:${ip}`, 20, 60_000);

  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait a moment.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // JSON 파싱 실패는 500이 아니라 400으로 반환
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: '요청 본문이 올바른 JSON이 아닙니다' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const parsed = ChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      // 스키마 상세는 서버 로그에만 남기고, 클라이언트에는 일반 메시지만 반환
      console.warn('[chat] invalid request schema');
      return new Response(JSON.stringify({ error: '요청 형식이 올바르지 않습니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const message = sanitizeChatMessage(parsed.data.message);
    const { reply, sources } = await generateChatResponse(message, parsed.data.history, parsed.data.message);
    const safeReply = sanitizeOutput(reply);

    // 대화 저장
    let conversationId = parsed.data.conversationId;
    const visitorId = parsed.data.visitorId || 'anonymous';
    const now = Date.now();
    const db = getDb();

    if (!conversationId) {
      conversationId = now.toString(36) + Math.random().toString(36).slice(2);
      const title = message.length > 30 ? message.slice(0, 30) + '...' : message;
      db.prepare('INSERT INTO conversations (id, visitor_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        conversationId, visitorId, title, now, now,
      );
    } else {
      db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(now, conversationId);
    }

    db.prepare('INSERT INTO messages (conversation_id, role, content, sources, created_at) VALUES (?, ?, ?, ?, ?)').run(
      conversationId, 'user', message, null, now,
    );
    db.prepare('INSERT INTO messages (conversation_id, role, content, sources, created_at) VALUES (?, ?, ?, ?, ?)').run(
      conversationId, 'assistant', safeReply, sources.length > 0 ? JSON.stringify(sources) : null, now + 1,
    );

    return new Response(JSON.stringify({ reply: safeReply, sources, conversationId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    // 상세 에러는 서버 로그에만 기록, 사용자에게는 일반 메시지만 노출 (Ollama 연결 실패 포함)
    console.error('[chat] api error:', err);
    const isConnectionError = err instanceof TypeError && (err as TypeError & { cause?: { code?: string } }).cause?.code === 'ECONNREFUSED';
    if (isConnectionError) {
      return new Response(JSON.stringify({
        reply: 'AI 서비스에 일시적 문제가 있습니다. 잠시 후 다시 시도하거나 acetec@acetec-korea.co.kr (+82-2-420-2343)으로 문의 바랍니다.',
        sources: [],
        conversationId: null,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: '일시적인 오류가 발생했습니다' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
