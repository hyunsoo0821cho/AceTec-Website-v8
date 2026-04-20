import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import getDb from '../../lib/db';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333';

export const GET: APIRoute = async () => {
  const status: Record<string, string> = {
    server: 'ok',
    sqlite: 'checking...',
    qdrant: 'checking...',
    ai: 'checking...',
    database: 'not configured',
  };
  let allOk = true;

  // SQLite 상태 — 1 SELECT ping (핵심 운영 DB)
  try {
    getDb().prepare('SELECT 1').get();
    status.sqlite = 'ok';
  } catch (e) {
    status.sqlite = 'error';
    allOk = false;
  }

  // Qdrant 상태 — collections API ping (RAG 장애 조기 감지)
  try {
    const res = await fetch(`${QDRANT_URL}/collections`, { signal: AbortSignal.timeout(2000) });
    status.qdrant = res.ok ? 'ok' : 'not responding';
    if (!res.ok) allOk = false;
  } catch {
    status.qdrant = 'not reachable';
    allOk = false;
  }

  // Ollama (AI) 상태
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    status.ai = res.ok ? 'ollama ok' : 'ollama not responding';
    if (!res.ok) allOk = false;
  } catch {
    status.ai = 'ollama not reachable';
    allOk = false;
  }

  // Supabase (선택적)
  if (supabase) {
    try {
      const { error } = await supabase.from('contact_submissions').select('id').limit(1);
      status.database = error ? `error: ${error.message}` : 'ok';
    } catch {
      status.database = 'connection failed';
    }
  }

  // 핵심 의존성 장애 시 503 반환 — 로드밸런서/업타임 모니터가 감지 가능
  return new Response(JSON.stringify(status), {
    status: allOk ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
  });
};
