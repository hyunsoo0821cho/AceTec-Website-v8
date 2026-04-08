import { generateEmbedding } from './embeddings';
import { searchSimilar } from './vector-store';

export interface RetrievedDocument {
  id: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export async function retrieveRelevantDocs(query: string, topK = 5): Promise<RetrievedDocument[]> {
  try {
    const embedding = await generateEmbedding(query);
    const results = await searchSimilar(embedding, topK);

    return results.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      metadata: r.metadata,
      similarity: r.similarity,
    }));
  } catch (err) {
    console.error('RAG retrieval error:', err);
    return [];
  }
}
