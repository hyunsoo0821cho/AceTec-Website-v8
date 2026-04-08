const OLLAMA_URL = 'http://localhost:11434';
const EMBED_MODEL = 'nomic-embed-text-v2-moe';

export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
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
