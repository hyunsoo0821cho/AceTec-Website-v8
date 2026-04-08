import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const root = process.cwd();
const BACKUP_DIR = path.join(root, '이미지');
const WEBP_QUALITY = 82;

// 모든 저장 대상 디렉토리
function getUploadDirs(): string[] {
  const dirs = [path.join(root, 'public', 'uploads')];
  const distUploads = path.join(root, 'dist', 'client', 'uploads');
  if (fs.existsSync(path.join(root, 'dist', 'client'))) dirs.push(distUploads);
  return dirs;
}

// Preset dimensions for each image type
const PRESETS: Record<string, { width: number; height: number; dir: string }> = {
  hero: { width: 1400, height: 600, dir: 'hero' },
  service: { width: 800, height: 600, dir: 'services' },
  product: { width: 800, height: 600, dir: 'products' },
  plan: { width: 1792, height: 1024, dir: 'plans' },
  partner: { width: 400, height: 400, dir: 'partners' },
  about: { width: 800, height: 650, dir: 'about' },
  misc: { width: 1400, height: 600, dir: 'misc' },
};

export async function processImage(buffer: Buffer, originalName: string, preset: string = 'product'): Promise<string> {
  const p = PRESETS[preset] || PRESETS.product;

  const slug = originalName
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .toLowerCase();
  const filename = `${Date.now()}-${slug}.webp`;

  // 첫 번째 디렉토리에 sharp 처리 후 저장
  const uploadDirs = getUploadDirs();
  const primaryDir = path.join(uploadDirs[0], p.dir);
  fs.mkdirSync(primaryDir, { recursive: true });
  const primaryPath = path.join(primaryDir, filename);

  await sharp(buffer)
    .resize(p.width, p.height, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: WEBP_QUALITY })
    .toFile(primaryPath);

  // 나머지 디렉토리에 복사 (dist/client/uploads)
  for (let i = 1; i < uploadDirs.length; i++) {
    const copyDir = path.join(uploadDirs[i], p.dir);
    fs.mkdirSync(copyDir, { recursive: true });
    fs.copyFileSync(primaryPath, path.join(copyDir, filename));
  }

  // 이미지 폴더에 백업
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.copyFileSync(primaryPath, path.join(BACKUP_DIR, filename));

  return `/uploads/${p.dir}/${filename}`;
}

// Legacy alias for product images
export async function processProductImage(buffer: Buffer, originalName: string): Promise<string> {
  return processImage(buffer, originalName, 'product');
}

export function deleteProductImage(imagePath: string) {
  // 양쪽 모두에서 삭제 시도
  const paths = [
    path.join(root, 'public', imagePath),
    path.join(root, 'dist', 'client', imagePath),
  ];
  for (const fp of paths) {
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
}
