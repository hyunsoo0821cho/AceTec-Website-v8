import type { APIRoute } from 'astro';
import getDb from '../../lib/db';

export const prerender = false;

// GET: 특정 대화의 메시지 목록
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const conversationId = url.searchParams.get('conversation_id');
  if (!conversationId) return Response.json({ error: 'conversation_id required' }, { status: 400 });

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
