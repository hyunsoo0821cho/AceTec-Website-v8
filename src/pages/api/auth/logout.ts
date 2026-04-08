import type { APIRoute } from 'astro';

export const POST: APIRoute = async () => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
    },
  });
};
