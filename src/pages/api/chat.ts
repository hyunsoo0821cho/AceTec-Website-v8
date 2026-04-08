import type { APIRoute } from 'astro';
import { z } from 'zod';
import { generateChatResponse } from '../../lib/chat';
import { checkRateLimit } from '../../lib/rate-limiter';
import { sanitizeChatMessage } from '../../lib/sanitize';
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

  try {
    const body = await request.json();
    const parsed = ChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid request', details: parsed.error.flatten() }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const message = sanitizeChatMessage(parsed.data.message);
    const { reply, sources } = await generateChatResponse(message, parsed.data.history);

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
      conversationId, 'assistant', reply, sources.length > 0 ? JSON.stringify(sources) : null, now + 1,
    );

    return new Response(JSON.stringify({ reply, sources, conversationId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('Chat API error:', err);

    // Ollama 연결 실패 시 친절한 메시지
    const isConnectionError = err instanceof TypeError && (err as TypeError & { cause?: { code?: string } }).cause?.code === 'ECONNREFUSED';
    if (isConnectionError) {
      return new Response(JSON.stringify({
        reply: 'AI 서비스(Ollama)가 실행되고 있지 않습니다. 터미널에서 "ollama serve"를 실행해주세요.',
        sources: [],
        conversationId: null,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
