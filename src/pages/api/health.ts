import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const GET: APIRoute = async () => {
  const status: Record<string, string> = {
    server: 'ok',
    database: 'not configured',
    ai: 'checking...',
  };

  if (supabase) {
    try {
      const { error } = await supabase.from('contact_submissions').select('id').limit(1);
      status.database = error ? `error: ${error.message}` : 'ok';
    } catch {
      status.database = 'connection failed';
    }
  }

  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) });
    status.ai = res.ok ? 'ollama ok' : 'ollama not responding';
  } catch {
    status.ai = 'ollama not reachable';
  }

  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
