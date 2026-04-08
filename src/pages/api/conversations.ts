import type { APIRoute } from 'astro';
import { z } from 'zod';
import getDb from '../../lib/db';

export const prerender = false;

// GET: 방문자의 대화 목록
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const visitorId = url.searchParams.get('visitor_id');
  if (!visitorId) return Response.json({ error: 'visitor_id required' }, { status: 400 });

  const rows = getDb()
    .prepare('SELECT id, title, created_at, updated_at FROM conversations WHERE visitor_id = ? ORDER BY updated_at DESC LIMIT 50')
    .all(visitorId);
  return Response.json(rows);
};

const CreateSchema = z.object({
  visitor_id: z.string().min(1),
  title: z.string().optional(),
});

// POST: 새 대화 생성
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid' }, { status: 400 });

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  const now = Date.now();
  getDb()
    .prepare('INSERT INTO conversations (id, visitor_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, parsed.data.visitor_id, parsed.data.title || 'New Chat', now, now);

  return Response.json({ id, title: parsed.data.title || 'New Chat', created_at: now, updated_at: now });
};

// DELETE: 대화 삭제
export const DELETE: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  getDb().prepare('DELETE FROM messages WHERE conversation_id = ?').run(id);
  getDb().prepare('DELETE FROM conversations WHERE id = ?').run(id);
  return Response.json({ ok: true });
};
