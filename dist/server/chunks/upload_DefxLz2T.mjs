import { v as verifySession, g as getSessionIdFromCookie } from './auth_DGxV5IUQ.mjs';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const root = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..");
const UPLOAD_DIR = path.join(root, "public", "uploads");
const WEBP_QUALITY = 82;
const PRESETS = {
  hero: { width: 1400, height: 600, dir: "hero" },
  service: { width: 800, height: 600, dir: "services" },
  product: { width: 800, height: 600, dir: "products" },
  plan: { width: 1792, height: 1024, dir: "plans" },
  partner: { width: 400, height: 400, dir: "partners" },
  about: { width: 800, height: 650, dir: "about" },
  misc: { width: 1400, height: 600, dir: "misc" }
};
async function processImage(buffer, originalName, preset = "product") {
  const p = PRESETS[preset] || PRESETS.product;
  const dir = path.join(UPLOAD_DIR, p.dir);
  fs.mkdirSync(dir, { recursive: true });
  const slug = originalName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
  const filename = `${Date.now()}-${slug}.webp`;
  const filepath = path.join(dir, filename);
  await sharp(buffer).resize(p.width, p.height, {
    fit: "cover",
    position: "centre"
  }).webp({ quality: WEBP_QUALITY }).toFile(filepath);
  return `/uploads/${p.dir}/${filename}`;
}

const prerender = false;
const POST = async ({ request }) => {
  const cookie = request.headers.get("cookie");
  if (!verifySession(getSessionIdFromCookie(cookie))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get("image");
  const preset = form.get("preset")?.toString() || "product";
  if (!file || file.size === 0) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) {
    return Response.json({ error: "File too large (max 15MB)" }, { status: 400 });
  }
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return Response.json({ error: "Invalid file type" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const imagePath = await processImage(buffer, file.name, preset);
  return Response.json({ image_path: imagePath });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
