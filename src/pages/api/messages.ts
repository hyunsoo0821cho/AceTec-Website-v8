import type { APIRoute } from 'astro';
import getDb from '../../lib/db';

export const prerender = false;

// GET: 특정 대화의 메시지 목록 (소유권 검증: visitor_id 필수)
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const conversationId = url.searchParams.get('conversation_id');
  const visitorId = url.searchParams.get('visitor_id');
  if (!conversationId) return Response.json({ error: 'conversation_id required' }, { status: 400 });
  if (!visitorId) return Response.json({ error: 'visitor_id required' }, { status: 400 });

  // 소유권 확인
  const conv = getDb().prepare('SELECT id FROM conversations WHERE id = ? AND visitor_id = ?').get(conversationId, visitorId);
  if (!conv) return Response.json({ error: 'Not found or not owned' }, { status: 404 });

  const rows = getDb()
    .prepare('SELECT id, role, content, sources, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(conversationId);

  return Response.json(
    rows.map((r: any) => ({
      ...r,
      sources: r.sources ? JSON.parse(r.sources) : null,
    })),
  );
};
