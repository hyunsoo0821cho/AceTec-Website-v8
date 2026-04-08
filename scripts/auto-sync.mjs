/**
 * auto-sync.mjs — 파일 변경 감지 → 자동 Git 커밋 & 푸시
 *
 * 사용법: node scripts/auto-sync.mjs
 *
 * src/, public/, scripts/ 폴더의 변경을 감지하고
 * 마지막 변경 후 30초 대기 후 자동 커밋 & 푸시
 */

import { watch } from 'fs';
import { execSync } from 'child_process';
import { resolve, relative } from 'path';

const ROOT = resolve(process.cwd());
const REMOTE = 'hyunsoo';
const BRANCH = 'main';
const DEBOUNCE_MS = 30000; // 30초 대기 후 커밋

const WATCH_DIRS = ['src', 'public', 'scripts', 'CLAUDE.md'];
const IGNORE = ['.astro', 'node_modules', 'dist', 'data', '.git'];

let timer = null;
let changedFiles = new Set();

function log(msg) {
  const ts = new Date().toLocaleTimeString('ko-KR');
  console.log(`[${ts}] ${msg}`);
}

function shouldIgnore(filename) {
  return IGNORE.some(ig => filename.includes(ig));
}

function gitSync() {
  try {
    // 변경 확인
    const status = execSync('git status --porcelain -uno', { cwd: ROOT, encoding: 'utf-8' }).trim();
    const untracked = execSync('git ls-files --others --exclude-standard', { cwd: ROOT, encoding: 'utf-8' }).trim();

    if (!status && !untracked) {
      log('No changes to commit');
      changedFiles.clear();
      return;
    }

    // Stage 소스 파일만
    execSync('git add src/ public/ scripts/ CLAUDE.md package.json astro.config.mjs tsconfig.json .gitignore', {
      cwd: ROOT,
      stdio: 'pipe'
    });

    // 변경 파일 목록
    const staged = execSync('git diff --cached --name-only', { cwd: ROOT, encoding: 'utf-8' }).trim();
    if (!staged) {
      log('No staged changes');
      changedFiles.clear();
      return;
    }

    const fileCount = staged.split('\n').length;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    // 커밋
    execSync(`git commit -m "auto: ${dateStr} (${fileCount} files)"`, {
      cwd: ROOT,
      stdio: 'pipe'
    });
    log(`Committed ${fileCount} files`);

    // 푸시
    execSync(`git push ${REMOTE} ${BRANCH}`, { cwd: ROOT, stdio: 'pipe' });
    log(`Pushed to ${REMOTE}/${BRANCH}`);

    changedFiles.clear();
  } catch (err) {
    log(`Error: ${err.message}`);
  }
}

function scheduleSync(filename) {
  if (shouldIgnore(filename)) return;

  changedFiles.add(filename);

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    log(`Syncing ${changedFiles.size} changed files...`);
    gitSync();
    timer = null;
  }, DEBOUNCE_MS);

  log(`Change detected: ${filename} (syncing in ${DEBOUNCE_MS/1000}s...)`);
}

// Watch directories
log('=== AceTec Auto-Sync Started ===');
log(`Watching: ${WATCH_DIRS.join(', ')}`);
log(`Remote: ${REMOTE}/${BRANCH}`);
log(`Debounce: ${DEBOUNCE_MS/1000}s after last change`);
log('Press Ctrl+C to stop\n');

for (const dir of WATCH_DIRS) {
  try {
    watch(resolve(ROOT, dir), { recursive: true }, (eventType, filename) => {
      if (filename) scheduleSync(`${dir}/${filename}`);
    });
  } catch {
    // 파일인 경우 (CLAUDE.md 등)
    try {
      watch(resolve(ROOT, dir), (eventType) => {
        scheduleSync(dir);
      });
    } catch {}
  }
}

// 종료 시 마지막 변경 커밋
process.on('SIGINT', () => {
  if (changedFiles.size > 0) {
    log('Final sync before exit...');
    if (timer) clearTimeout(timer);
    gitSync();
  }
  log('Stopped');
  process.exit(0);
});
