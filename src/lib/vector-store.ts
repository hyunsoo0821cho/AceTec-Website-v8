import { QdrantClient } from '@qdrant/js-client-rest';

const QDRANT_URL = 'http://localhost:6333';
const COLLECTION = 'acetec_knowledge';
const VECTOR_DIM = 768;

let client: QdrantClient | null = null;

function getClient(): QdrantClient {
  if (!client) client = new QdrantClient({ url: QDRANT_URL });
  return client;
}

export interface StoredDocument {
  id: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[];
}

// Qdrant 컬렉션 초기화
export async function ensureCollection(): Promise<void> {
  const q = getClient();
  try {
    await q.getCollection(COLLECTION);
  } catch {
    await q.createCollection(COLLECTION, {
      vectors: { size: VECTOR_DIM, distance: 'Cosine' },
    });
  }
}

// 문서 업서트 (ingest용)
export async function upsertDocuments(docs: StoredDocument[]): Promise<void> {
  await ensureCollection();
  const q = getClient();
  const points = docs.map((doc, i) => ({
    id: i + 1,
    vector: doc.embedding,
    payload: {
      doc_id: doc.id,
      title: doc.title,
      content: doc.content,
      ...doc.metadata,
    },
  }));
  // 100개씩 배치
  for (let i = 0; i < points.length; i += 100) {
    await q.upsert(COLLECTION, { points: points.slice(i, i + 100) });
  }
}

// 유사도 검색
export async function searchSimilar(
  queryEmbedding: number[],
  topK = 5,
  threshold = 0.3,
): Promise<Array<StoredDocument & { similarity: number }>> {
  const q = getClient();
  try {
    const results = await q.search(COLLECTION, {
      vector: queryEmbedding,
      limit: topK,
      score_threshold: threshold,
      with_payload: true,
    });

    return results.map((r) => ({
      id: (r.payload?.doc_id as string) || String(r.id),
      title: (r.payload?.title as string) || '',
      content: (r.payload?.content as string) || '',
      metadata: r.payload as Record<string, unknown>,
      embedding: [],
      similarity: r.score,
    }));
  } catch (err) {
    console.error('Qdrant search error:', err);
    return [];
  }
}

// JSON 파일에서 Qdrant로 마이그레이션 (호환용)
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
