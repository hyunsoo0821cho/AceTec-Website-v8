import type { APIRoute } from 'astro';
import { verifySession, getSessionIdFromCookie, getUserInfo } from '../../../lib/auth';
import getDb from '../../../lib/db';
import fs from 'fs';
import path from 'path';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie');
  const sessionId = verifySession(getSessionIdFromCookie(cookie));
  if (!sessionId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const userInfo = getUserInfo(sessionId);
  if (!userInfo) return Response.json({ error: 'User not found' }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get('avatar') as File;
  if (!file || !file.size) return Response.json({ error: 'No file' }, { status: 400 });

  // 파일 크기 제한 (2MB)
  if (file.size > 2 * 1024 * 1024) {
    return Response.json({ error: '파일 크기는 2MB 이하여야 합니다' }, { status: 400 });
  }

  // 이미지 타입 확인
  if (!file.type.startsWith('image/')) {
    return Response.json({ error: '이미지 파일만 업로드 가능합니다' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filename = `avatar-${userInfo.id}-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(uploadDir, filename), buffer);

  const avatarUrl = `/uploads/avatars/${filename}`;
  getDb().prepare('UPDATE admins SET avatar_url = ? WHERE id = ?').run(avatarUrl, userInfo.id);

  return Response.json({ ok: true, avatarUrl });
};
