#!/usr/bin/env node
// 빌드 후 기존 서버 종료 + 최신 dist/로 재시작
// 사용: npm run deploy

import { execSync, spawn } from 'node:child_process';
import { platform } from 'node:process';

const PORT = process.env.PORT || '8080';
const HOST = process.env.HOST || '0.0.0.0';
const isWindows = platform === 'win32';

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

function killPid(pid) {
  try {
    if (isWindows) execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    else execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
    console.log(`[deploy] 기존 서버(PID ${pid}) 종료`);
  } catch (e) {
    console.warn(`[deploy] PID ${pid} 종료 실패: ${e.message}`);
  }
}

console.log('[deploy] 1/3 빌드 시작...');
execSync('npm run build', { stdio: 'inherit' });

console.log(`[deploy] 2/3 포트 ${PORT} 점유 프로세스 확인...`);
const pid = findPidOnPort(PORT);
if (pid) killPid(pid);
else console.log(`[deploy] 포트 ${PORT} 비어있음`);

console.log(`[deploy] 3/3 ${HOST}:${PORT} 에서 새 서버 시작 (detached)...`);
const child = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST, PORT },
  detached: true,
  stdio: 'ignore',
});
child.unref();
console.log(`[deploy] 완료. 새 서버 PID: ${child.pid}`);
console.log(`[deploy] 브라우저에서 Ctrl+Shift+R 강제 새로고침 권장`);
