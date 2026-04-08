/**
 * 이미지 자동 동기화 스크립트
 * C:\Users\user\Desktop\AceTec-Website-v8\이미지 폴더를 감시하여
 *
 * 1) 매핑.json에 등록된 파일 → 지정 경로로 복사
 * 2) 같은 파일명이 public/에 있으면 → 자동 덮어쓰기
 * 3) 둘 다 없으면 → public/uploads/에 복사
 *
 * 사용법: npm run watch-images
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const WATCH_DIR = path.join(ROOT, '이미지');
const MAPPING_FILE = path.join(WATCH_DIR, '매핑.json');
const SEARCH_DIRS = [
  path.join(ROOT, 'public', 'images'),
  path.join(ROOT, 'public', 'uploads'),
];
const IMG_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico'];

// 매핑 테이블 로드
function loadMapping(): Record<string, string> {
  if (!fs.existsSync(MAPPING_FILE)) return {};
  const data = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8'));
  return data['매핑'] || {};
}

// public/ 하위 전체를 재귀 탐색하여 파일명 → 전체경로 맵 생성
function buildFileMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        const name = entry.name.toLowerCase();
        const paths = map.get(name) || [];
        paths.push(full);
        map.set(name, paths);
      }
    }
  }
  for (const d of SEARCH_DIRS) walk(d);
  return map;
}

let fileMap = buildFileMap();
let mapping = loadMapping();

function syncFile(filename: string) {
  const src = path.join(WATCH_DIR, filename);
  if (!fs.existsSync(src)) return;

  // 1) 매핑 테이블 우선 체크
  if (mapping[filename]) {
    const dest = path.join(ROOT, mapping[filename]);
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`[매핑] ${filename} → ${mapping[filename]}`);
    return;
  }

  // 2) 같은 파일명 매칭
  const key = filename.toLowerCase();
  const targets = fileMap.get(key);
  if (targets && targets.length > 0) {
    for (const target of targets) {
      fs.copyFileSync(src, target);
      console.log(`[동기화] ${filename} → ${path.relative(ROOT, target)}`);
    }
    return;
  }

  // 3) 확장자 무시하고 이름만으로 검색
  const baseName = path.parse(filename).name.toLowerCase();
  let found = false;
  for (const [mapKey, paths] of fileMap) {
    if (path.parse(mapKey).name === baseName) {
      for (const target of paths) {
        fs.copyFileSync(src, target);
        console.log(`[동기화] ${filename} → ${path.relative(ROOT, target)} (이름 매칭)`);
        found = true;
      }
    }
  }
  if (found) return;

  // 4) 매칭 없으면 public/uploads/에 복사
  const dest = path.join(ROOT, 'public', 'uploads', filename);
  fs.copyFileSync(src, dest);
  console.log(`[새파일] ${filename} → public/uploads/${filename}`);
  const paths = fileMap.get(key) || [];
  paths.push(dest);
  fileMap.set(key, paths);
}

// 시작
console.log('=== 이미지 자동 동기화 시작 ===');
console.log(`감시 폴더: ${WATCH_DIR}`);
console.log(`매핑 파일: 매핑.json (${Object.keys(mapping).length}개 등록)`);
console.log(`public 파일: ${fileMap.size}개\n`);

// 초기 동기화
if (fs.existsSync(WATCH_DIR)) {
  const files = fs.readdirSync(WATCH_DIR).filter(f => IMG_EXTS.includes(path.extname(f).toLowerCase()));
  console.log(`${files.length}개 이미지 초기 동기화 중...`);
  for (const f of files) syncFile(f);
  console.log('초기 동기화 완료\n');
}

// 파일 감시
if (!fs.existsSync(WATCH_DIR)) fs.mkdirSync(WATCH_DIR, { recursive: true });

fs.watch(WATCH_DIR, (eventType, filename) => {
  if (!filename) return;

  // 매핑.json 변경 시 리로드
  if (filename === '매핑.json') {
    mapping = loadMapping();
    console.log(`[매핑 리로드] ${Object.keys(mapping).length}개 등록`);
    return;
  }

  const ext = path.extname(filename).toLowerCase();
  if (!IMG_EXTS.includes(ext)) return;

  fileMap = buildFileMap();
  setTimeout(() => syncFile(filename), 300);
});

console.log('파일 변경 감시 중... (Ctrl+C로 종료)\n');
