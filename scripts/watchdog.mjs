#!/usr/bin/env node
// AceTec 웹사이트 감시자 (Watchdog)
// - dist/server/entry.mjs 를 자식 프로세스로 기동하고 죽으면 자동 재기동
// - 30초마다 HTTP 헬스체크 → 2회 연속 실패 시 강제 재시작
// - 크래시 루프(5초 이내 반복 죽음)는 지수 백오프(최대 30초)
// - logs/watchdog.log, logs/server.log 기록
// - logs/watchdog.pid 로 PID 노출
// 사용: node scripts/watchdog.mjs  (또는 scripts/watchdog.vbs 로 hidden 실행)

import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LOG_DIR = join(ROOT, 'logs');
const PORT = process.env.PORT || '8080';
const HOST = process.env.HOST || '0.0.0.0';

mkdirSync(LOG_DIR, { recursive: true });

const watchdogLog = createWriteStream(join(LOG_DIR, 'watchdog.log'), { flags: 'a' });
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  watchdogLog.write(line);
  try { process.stdout.write(line); } catch { /* headless */ }
}

writeFileSync(join(LOG_DIR, 'watchdog.pid'), String(process.pid), 'utf8');

let child = null;
let restartCount = 0;
let lastStart = 0;
let stopping = false;

function spawnServer() {
  const serverOut = createWriteStream(join(LOG_DIR, 'server.log'), { flags: 'a' });
  lastStart = Date.now();
  child = spawn(process.execPath, ['dist/server/entry.mjs'], {
    cwd: ROOT,
    env: { ...process.env, HOST, PORT },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  child.stdout.pipe(serverOut);
  child.stderr.pipe(serverOut);
  log(`server spawned pid=${child.pid}`);

  child.on('exit', async (code, signal) => {
    const dead = child;
    child = null;
    log(`server exited pid=${dead?.pid} code=${code} signal=${signal}`);
    if (stopping) return;
    const uptime = Date.now() - lastStart;
    if (uptime < 5000) {
      restartCount = Math.min(restartCount + 1, 5);
    } else {
      restartCount = 0;
    }
    const delay = uptime < 5000 ? Math.min(30000, 1000 * 2 ** restartCount) : 1000;
    log(`respawning in ${delay}ms (restartCount=${restartCount})`);
    await sleep(delay);
    if (!stopping) spawnServer();
  });
}

function checkHealth() {
  return new Promise((resolve) => {
    const host = HOST === '0.0.0.0' ? '127.0.0.1' : HOST;
    const req = http.get({ host, port: PORT, path: '/', timeout: 3000 }, (res) => {
      res.resume();
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function healthLoop() {
  await sleep(20000); // 초기 기동 유예
  let fails = 0;
  while (!stopping) {
    const ok = await checkHealth();
    if (ok) {
      if (fails > 0) log(`health-check recovered (was ${fails} fails)`);
      fails = 0;
    } else {
      fails++;
      log(`health-check fail #${fails}`);
      if (fails >= 2 && child) {
        log(`health-check failed ${fails}x → killing server (exit handler will respawn)`);
        try { child.kill('SIGKILL'); } catch { /* ignore */ }
        fails = 0;
      }
    }
    await sleep(30000);
  }
}

function handleShutdown(sig) {
  log(`watchdog received ${sig} — shutting down`);
  stopping = true;
  if (child) {
    try { child.kill(); } catch { /* ignore */ }
  }
  setTimeout(() => process.exit(0), 1500);
}
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGBREAK', () => handleShutdown('SIGBREAK'));

log(`watchdog starting (node=${process.version} pid=${process.pid} host=${HOST} port=${PORT})`);
spawnServer();
healthLoop();
