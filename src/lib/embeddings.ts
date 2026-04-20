const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const EMBED_MODEL = 'nomic-embed-text-v2-moe';
// Ollama 임베딩 요청 타임아웃 — Ollama가 걸렸을 때 RAG 파이프라인 무한 블로킹 방지
const EMBED_TIMEOUT_MS = 30_000;

export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text, keep_alive: '5m' }),
    signal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`Ollama embedding failed: ${res.status}`);

  const data = await res.json();
  return data.embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    results.push(await generateEmbedding(text));
  }
  return results;
}
