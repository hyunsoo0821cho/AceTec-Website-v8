import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { verifySession, getSessionIdFromCookie, getUserInfo } from '../../../lib/auth';
import getDb from '../../../lib/db';
import fs from 'fs';
import path from 'path';

export const prerender = false;

// sharp 가 실제로 처리 가능한 이미지 포맷 화이트리스트.
// magic byte 파싱은 sharp 가 수행하고, 지원 외 포맷은 metadata() 에서 실패 → 거부됨.
const ALLOWED_IMAGE_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'tiff']);

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

  // ⚠️ 1차 방어: 헤더 Content-Type 은 클라이언트가 위조 가능하므로 참고용으로만 사용
  if (!file.type.startsWith('image/')) {
    return Response.json({ error: '이미지 파일만 업로드 가능합니다' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // ⚠️ 2차 방어: magic byte 기반 포맷 판정 + 지원 포맷 화이트리스트 검사
  // sharp 는 파일 헤더를 해석해 실제 포맷을 반환. .html/.svg/.php 등 비이미지는 여기서 throw.
  let detectedFormat: string | undefined;
  try {
    const meta = await sharp(buffer).metadata();
    detectedFormat = meta.format;
  } catch {
    return Response.json({ error: '올바른 이미지 파일이 아닙니다' }, { status: 400 });
  }

  if (!detectedFormat || !ALLOWED_IMAGE_FORMATS.has(detectedFormat)) {
    return Response.json({ error: '지원하지 않는 이미지 포맷입니다' }, { status: 400 });
  }

  // ⚠️ 3차 방어: 원본 확장자를 신뢰하지 않고 .webp 로 강제 변환 + 리사이즈 (512x512 cover)
  // HTML/SVG/PHP 등이 혹시 magic byte 우회로 통과해도 sharp 재인코딩을 거치면 실행 가능한 페이로드는 제거됨.
  const filename = `avatar-${userInfo.id}-${Date.now()}.webp`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  let processed: Buffer;
  try {
    processed = await sharp(buffer)
      .rotate() // EXIF 방향 정규화
      .resize(512, 512, { fit: 'cover', position: 'centre' })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return Response.json({ error: '이미지 처리에 실패했습니다' }, { status: 400 });
  }

  fs.writeFileSync(path.join(uploadDir, filename), processed);

  const avatarUrl = `/uploads/avatars/${filename}`;
  getDb().prepare('UPDATE admins SET avatar_url = ? WHERE id = ?').run(avatarUrl, userInfo.id);

  return Response.json({ ok: true, avatarUrl });
};
