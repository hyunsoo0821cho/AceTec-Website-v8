import type { APIRoute } from 'astro';
import { verifyPassword, createSession, sessionCookie } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const username = form.get('username')?.toString() ?? '';
  const password = form.get('password')?.toString() ?? '';

  if (!username || !password) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/login?error=missing' },
    });
  }

  const adminId = verifyPassword(username, password);
  if (!adminId) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/login?error=invalid' },
    });
  }

  const sid = createSession(adminId);
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': sessionCookie(sid),
    },
  });
};
