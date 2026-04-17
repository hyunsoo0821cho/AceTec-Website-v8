import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { verifySession, getSessionIdFromCookie, getUserInfo } from '../../../lib/auth';
import { processImage } from '../../../lib/image';

export const prerender = false;

// sharp 가 실제로 처리 가능한 이미지 포맷 화이트리스트 (magic-byte 판정).
// 클라이언트가 제공한 MIME 은 위조 가능하므로 참고용으로만 사용.
const ALLOWED_IMAGE_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'tiff']);

export const POST: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie');
  const adminId = verifySession(getSessionIdFromCookie(cookie));
  if (!adminId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // 이미지 업로드는 관리자 전용 — 일반 사용자 차단
  const user = getUserInfo(adminId);
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
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
  // 1차(참고용): 헤더 MIME
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) {
    return Response.json({ error: 'Invalid file type' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // 2차(핵심): magic-byte 기반 포맷 판정 — sharp가 헤더를 해석해 실제 포맷 반환.
  // .html/.svg/.php 등 비이미지는 여기서 throw.
  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.format || !ALLOWED_IMAGE_FORMATS.has(meta.format)) {
      return Response.json({ error: 'Unsupported image format' }, { status: 400 });
    }
  } catch {
    return Response.json({ error: '올바른 이미지 파일이 아닙니다' }, { status: 400 });
  }

  const imagePath = await processImage(buffer, file.name, preset);

  return Response.json({ image_path: imagePath });
};
