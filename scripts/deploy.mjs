#!/usr/bin/env node
// 빌드 후 기존 서버 종료 + 최신 dist/로 재시작
// 사용: npm run deploy
//
// 강화 항목 (2026-04-13):
//   1) taskkill 실패 시 PowerShell Stop-Process로 fallback
//   2) 포트 해제까지 폴링 대기 (최대 10초)
//   3) 새 서버 기동 후 헬스체크 (HTTP 200) 확인
//   4) 새 서버가 죽으면 한 번 자동 재시도

import { execSync, spawn } from 'node:child_process';
import { platform } from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const PORT = process.env.PORT || '8080';
const HOST = process.env.HOST || '0.0.0.0';
const isWindows = platform === 'win32';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WATCHDOG_PID_FILE = join(ROOT, 'logs', 'watchdog.pid');

/** watchdog이 살아있는지 확인 (PID 파일 + 프로세스 존재) */
function getLiveWatchdogPid() {
  if (!existsSync(WATCHDOG_PID_FILE)) return null;
  const pid = readFileSync(WATCHDOG_PID_FILE, 'utf8').trim();
  if (!pid) return null;
  try {
    if (isWindows) {
      const out = execSync(`tasklist /FI "PID eq ${pid}" /NH`, {
        encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'],
      });
      return out.includes(pid) ? pid : null;
    }
    process.kill(Number(pid), 0);
    return pid;
  } catch {
    return null;
  }
}

function findPidOnPort(port) {
  try {
    if (isWindows) {
      const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const match = out.match(/LISTENING\s+(\d+)/);
      return match ? match[1] : null;
    } else {
      const out = execSync(`lsof -ti:${port}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      return out.trim().split('\n')[0] || null;
    }
  } catch {
    return null;
  }
}

/** 강제 종료 (taskkill 실패 시 PowerShell Stop-Process로 fallback) */
function killPid(pid) {
  if (!isWindows) {
    try {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
      console.log(`[deploy] 기존 서버(PID ${pid}) 종료`);
      return true;
    } catch (e) {
      console.warn(`[deploy] PID ${pid} kill 실패: ${e.message}`);
      return false;
    }
  }
  // Windows: taskkill 시도 → 실패 시 PowerShell Stop-Process
  try {
    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    console.log(`[deploy] 기존 서버(PID ${pid}) 종료 (taskkill)`);
    return true;
  } catch {
    try {
      execSync(`powershell -Command "Stop-Process -Id ${pid} -Force"`, { stdio: 'ignore' });
      console.log(`[deploy] 기존 서버(PID ${pid}) 종료 (PowerShell Stop-Process)`);
      return true;
    } catch (e) {
      console.warn(`[deploy] PID ${pid} 종료 실패 (taskkill + PowerShell 모두 실패): ${e.message}`);
      return false;
    }
  }
}

/** 포트가 비워질 때까지 대기 (최대 maxMs) */
async function waitPortFree(port, maxMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (!findPidOnPort(port)) return true;
    await sleep(300);
  }
  return false;
}

/** 새 서버 HTTP 응답 대기 (최대 maxMs) */
function checkHealth(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const checkHost = host === '0.0.0.0' ? '127.0.0.1' : host;
    const req = http.get({ host: checkHost, port, path: '/', timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function waitServerUp(host, port, maxMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await checkHealth(host, port)) return true;
    await sleep(500);
  }
  return false;
}

/** 새 서버 기동 (1회 시도) */
function startServer() {
  const child = spawn(process.execPath, ['dist/server/entry.mjs'], {
    env: { ...process.env, HOST, PORT },
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return child.pid;
}

async function ensurePortFreeAndKill() {
  let pid = findPidOnPort(PORT);
  let attempts = 0;
  while (pid && attempts < 3) {
    killPid(pid);
    await sleep(500);
    pid = findPidOnPort(PORT);
    attempts++;
  }
  if (pid) {
    console.error(`[deploy] ❌ 포트 ${PORT} 점유 PID ${pid} 종료 실패. 수동 조치 필요.`);
    return false;
  }
  return true;
}

async function main() {
  console.log('[deploy] 1/4 빌드 시작...');
  execSync('npm run build', { stdio: 'inherit' });

  // watchdog이 살아있으면 서버 프로세스를 직접 관리하지 않는다.
  // 서버 자식만 kill → watchdog이 새 dist/ 로 자동 respawn.
  const watchdogPid = getLiveWatchdogPid();
  let pid;
  let healthy = false;

  if (watchdogPid) {
    console.log(`[deploy] 🐕 watchdog 감지 (PID ${watchdogPid}) → 서버 자식만 교체`);
    const serverPid = findPidOnPort(PORT);
    if (serverPid && serverPid !== watchdogPid) {
      killPid(serverPid);
      console.log(`[deploy] watchdog 자식 서버(PID ${serverPid}) 종료 완료`);
    }
    console.log('[deploy] watchdog respawn 대기 중...');
    healthy = await waitServerUp(HOST, PORT, 60000);
    pid = findPidOnPort(PORT);
  } else {
    console.log(`[deploy] 2/4 포트 ${PORT} 점유 프로세스 확인...`);
    const ok = await ensurePortFreeAndKill();
    if (!ok) process.exit(1);
    console.log(`[deploy] 포트 ${PORT} 정상 해제 확인`);

    console.log(`[deploy] 3/4 ${HOST}:${PORT} 에서 새 서버 시작 (detached)...`);
    pid = startServer();
    console.log(`[deploy] 새 서버 PID: ${pid}. 기동 헬스체크 대기 중...`);

    healthy = await waitServerUp(HOST, PORT, 30000);

    if (!healthy) {
      console.warn('[deploy] ⚠️ 첫 기동 실패 → 한 번 더 재시도');
      await ensurePortFreeAndKill();
      await sleep(1000);
      pid = startServer();
      console.log(`[deploy] 재시도 PID: ${pid}`);
      healthy = await waitServerUp(HOST, PORT, 30000);
    }
  }

  // watch-images 프로세스 확인 + 재시작
  try {
    const psOut = execSync('ps -ef 2>&1', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    if (!psOut.includes('watch-images')) {
      console.log('[deploy] watch-images 프로세스 없음 → 자동 시작');
      const watcher = spawn(process.execPath, [
        '--import', 'tsx', 'scripts/watch-images.ts',
      ], { detached: true, stdio: 'ignore', cwd: process.cwd() });
      watcher.unref();
      console.log(`[deploy] watch-images PID: ${watcher.pid}`);
    } else {
      console.log('[deploy] watch-images 이미 실행 중 ✅');
    }
  } catch { /* non-critical */ }

  console.log('[deploy] 4/4 헬스체크 결과...');
  if (healthy) {
    console.log(`[deploy] ✅ 완료. PID ${pid} 정상 기동 (HTTP 200 응답).`);
    console.log('[deploy] 브라우저에서 Ctrl+Shift+R 강제 새로고침 권장');
  } else {
    console.error('[deploy] ❌ 새 서버 기동 실패. 로그 확인 필요.');
    console.error('[deploy] 수동 진단: netstat -ano | findstr :' + PORT);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error('[deploy] 치명적 오류:', err);
  process.exit(1);
});
