import type { APIRoute } from 'astro';
import { verifySession, getSessionIdFromCookie } from '../../../lib/auth';
import { processImage } from '../../../lib/image';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie');
  if (!verifySession(getSessionIdFromCookie(cookie))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get('image') as File | null;
  const preset = form.get('preset')?.toString() || 'product';

  if (!file || file.size === 0) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) {
    return Response.json({ error: 'File too large (max 15MB)' }, { status: 400 });
  }
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) {
    return Response.json({ error: 'Invalid file type' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const imagePath = await processImage(buffer, file.name, preset);

  return Response.json({ image_path: imagePath });
};
