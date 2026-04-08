/**
 * npm run dev 실행 시 Ollama가 자동으로 시작되도록 보장하는 스크립트
 * Ollama가 이미 실행 중이면 건너뛰고, 아니면 백그라운드로 시작합니다.
 */

import { execSync, spawn } from 'child_process';

const OLLAMA_URL = 'http://localhost:11434';
const MAX_WAIT = 15_000; // 최대 15초 대기
const POLL_INTERVAL = 1_000;

async function isOllamaRunning() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function startOllama() {
  console.log('[ollama] Ollama가 실행되고 있지 않습니다. 자동 시작합니다...');

  // Windows에서 백그라운드로 ollama serve 실행
  const child = spawn('ollama', ['serve'], {
    detached: true,
    stdio: 'ignore',
    shell: true,
  });
  child.unref();

  // Ollama가 준비될 때까지 대기
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    if (await isOllamaRunning()) {
      console.log('[ollama] Ollama 시작 완료!');
      return true;
    }
  }

  console.warn('[ollama] Ollama 시작 시간 초과. 수동으로 "ollama serve"를 실행해주세요.');
  return false;
}

async function main() {
  if (await isOllamaRunning()) {
    console.log('[ollama] Ollama가 이미 실행 중입니다.');
    return;
  }

  // ollama 명령어가 설치되어 있는지 확인
  try {
    execSync('ollama --version', { stdio: 'ignore' });
  } catch {
    console.warn('[ollama] Ollama가 설치되어 있지 않습니다. https://ollama.com 에서 설치해주세요.');
    console.warn('[ollama] 챗봇 없이 서버를 시작합니다.');
    return;
  }

  await startOllama();
}

main();
