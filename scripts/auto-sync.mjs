/**
 * auto-sync.mjs — 파일 변경 감지 → 자동 Git 커밋 & 멀티 원격 푸시
 *
 * 사용법: node scripts/auto-sync.mjs  (백그라운드 실행은 scripts/auto-sync.vbs 사용)
 *
 * 동작:
 *   1) src/, public/, scripts/, tests/, CLAUDE.md 등 변경 감지
 *   2) 마지막 변경 후 30초 디바운스 → git add → commit
 *   3) 로컬 main 을 TARGETS 의 각 refspec 으로 병렬 푸시
 *      - hyunsoo main:main                (개인 거울 저장소)
 *      - origin   main:homepage-hyunsoo   (SungwooJang123 repo 의 hyunsoo 브랜치)
 *   4) 로그 → logs/auto-sync.log
 */

import { watch } from 'node:fs';
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LOG_DIR = resolve(ROOT, 'logs');
mkdirSync(LOG_DIR, { recursive: true });

// 멀티 원격/브랜치 타겟. refspec 은 `git push <remote> <refspec>` 에 그대로 전달.
const TARGETS = [
  { remote: 'hyunsoo', refspec: 'main:main' },
  { remote: 'origin',  refspec: 'main:homepage-hyunsoo' },
];

const DEBOUNCE_MS = 30_000;
const WATCH_DIRS = ['src', 'public', 'scripts', 'tests', 'CLAUDE.md', 'README.md'];
const IGNORE = ['.astro', 'node_modules', 'dist', 'data', '.git', 'logs'];
const STAGE_PATHS = [
  'src/', 'public/uploads/', 'scripts/', 'tests/',
  'CLAUDE.md', 'README.md', '전체README.md',
  'package.json', 'astro.config.mjs', 'tsconfig.json', '.gitignore',
];

const logStream = createWriteStream(resolve(LOG_DIR, 'auto-sync.log'), { flags: 'a' });
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  logStream.write(line);
  try { process.stdout.write(line); } catch { /* headless */ }
}

writeFileSync(resolve(LOG_DIR, 'auto-sync.pid'), String(process.pid), 'utf8');

let timer = null;
const changedFiles = new Set();

function shouldIgnore(filename) {
  return IGNORE.some((ig) => filename.includes(ig));
}

function safeExec(cmd) {
  try {
    return { ok: true, out: execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }) };
  } catch (err) {
    return { ok: false, err: err.message || String(err), out: err.stdout?.toString?.() || '' };
  }
}

function gitSync() {
  // 현재 브랜치 확인
  const headRes = safeExec('git rev-parse --abbrev-ref HEAD');
  const branch = (headRes.out || '').trim();
  if (branch !== 'main') {
    log(`skipped: 현재 브랜치 ${branch} (main 에서만 동작)`);
    changedFiles.clear();
    return;
  }

  // 스테이징
  const addRes = safeExec(`git add -- ${STAGE_PATHS.map((p) => `"${p}"`).join(' ')}`);
  if (!addRes.ok) {
    log(`git add 실패: ${addRes.err}`);
    changedFiles.clear();
    return;
  }

  const stagedRes = safeExec('git diff --cached --name-only');
  const staged = (stagedRes.out || '').trim();
  if (!staged) {
    log('스테이징된 변경 없음');
    changedFiles.clear();
    return;
  }

  const fileCount = staged.split('\n').length;
  const now = new Date();
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const commitRes = safeExec(`git commit -m "auto: ${ts} (${fileCount} files)"`);
  if (!commitRes.ok) {
    log(`커밋 실패: ${commitRes.err}`);
    changedFiles.clear();
    return;
  }
  log(`커밋 완료 (${fileCount} files)`);

  // 멀티 타겟 푸시 — 실패해도 다음 타겟은 진행
  for (const t of TARGETS) {
    const pushRes = safeExec(`git push ${t.remote} ${t.refspec}`);
    if (pushRes.ok) {
      log(`푸시 성공: ${t.remote} ${t.refspec}`);
    } else {
      log(`푸시 실패: ${t.remote} ${t.refspec} — ${pushRes.err.substring(0, 200)}`);
    }
  }

  changedFiles.clear();
}

function scheduleSync(filename) {
  if (shouldIgnore(filename)) return;
  changedFiles.add(filename);
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    log(`디바운스 만료 → ${changedFiles.size} 파일 동기화 시작`);
    gitSync();
    timer = null;
  }, DEBOUNCE_MS);
}

// 시작
log(`=== AceTec Auto-Sync 시작 (PID ${process.pid}) ===`);
log(`Watch: ${WATCH_DIRS.join(', ')}`);
log(`Targets: ${TARGETS.map((t) => `${t.remote} ${t.refspec}`).join(' | ')}`);
log(`Debounce: ${DEBOUNCE_MS / 1000}s`);

for (const dir of WATCH_DIRS) {
  try {
    watch(resolve(ROOT, dir), { recursive: true }, (_event, filename) => {
      if (filename) scheduleSync(`${dir}/${filename}`);
    });
  } catch {
    // 디렉터리가 아니라 파일인 경우 (CLAUDE.md / README.md)
    try {
      watch(resolve(ROOT, dir), () => scheduleSync(dir));
    } catch (e) {
      log(`watch 실패: ${dir} — ${e.message}`);
    }
  }
}

function shutdown(sig) {
  log(`${sig} 수신 → 종료 전 최종 동기화 시도`);
  if (changedFiles.size > 0) {
    if (timer) clearTimeout(timer);
    gitSync();
  }
  process.exit(0);
}
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGBREAK', () => shutdown('SIGBREAK'));
