import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { c as checkRateLimit, s as sanitizeChatMessage } from './sanitize_DnlzqER4.mjs';

const OLLAMA_URL$1 = "http://localhost:11434";
const EMBED_MODEL = "nomic-embed-text";
async function generateEmbedding(text) {
  const res = await fetch(`${OLLAMA_URL$1}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text })
  });
  if (!res.ok) throw new Error(`Ollama embedding failed: ${res.status}`);
  const data = await res.json();
  return data.embedding;
}

const STORE_PATH = path.resolve(process.cwd(), "data", "vector-store.json");
let cache = null;
function loadVectorStore() {
  if (cache) return cache;
  if (!fs.existsSync(STORE_PATH)) {
    console.warn("Vector store not found at", STORE_PATH, "— run npm run ingest first");
    return [];
  }
  const raw = fs.readFileSync(STORE_PATH, "utf-8");
  cache = JSON.parse(raw);
  return cache;
}
function cosineSimilarity(a, b) {
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
function searchSimilar(queryEmbedding, topK = 5, threshold = 0.3) {
  const docs = loadVectorStore();
  if (docs.length === 0) return [];
  const scored = docs.map((doc) => ({
    ...doc,
    similarity: cosineSimilarity(queryEmbedding, doc.embedding)
  })).filter((d) => d.similarity >= threshold).sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  return scored;
}

async function retrieveRelevantDocs(query, topK = 5) {
  try {
    const embedding = await generateEmbedding(query);
    const results = searchSimilar(embedding, topK);
    return results.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      metadata: r.metadata,
      similarity: r.similarity
    }));
  } catch (err) {
    console.error("RAG retrieval error:", err);
    return [];
  }
}

const OLLAMA_URL = "http://localhost:11434";
const CHAT_MODEL = "exaone3.5:7.8b";
const SYSTEM_PROMPT = `You are AceTec's AI product assistant. AceTec (acetronix.co.kr) is a Korean B2B embedded computing company founded in 1994, specializing in military/aerospace, railway safety, industrial automation, telecom, sensor simulation, and HPC solutions.

RULES:
1. Only answer questions about AceTec products, services, partners, and company info.
2. If the retrieved context contains relevant information, use it. Cite sources.
3. If you don't have enough information, say so honestly and suggest contacting AceTec directly at acetec@acetec-korea.co.kr or +82-2-420-2343.
4. Never make up product specifications or pricing.
5. Respond in the same language the user writes in (Korean or English).
6. Keep responses concise (under 300 words) unless the user asks for detail.
7. For pricing inquiries, always direct to the contact form or phone number.`;
async function generateChatResponse(message, history = []) {
  const docs = await retrieveRelevantDocs(message);
  const contextBlock = docs.length > 0 ? docs.map((d) => `[${d.title}]: ${d.content}`).join("\n\n") : "No specific documents found. Answer from general company knowledge.";
  const messages = [
    { role: "system", content: `${SYSTEM_PROMPT}

CONTEXT FROM KNOWLEDGE BASE:
${contextBlock}` },
    ...history.slice(-6),
    { role: "user", content: message }
  ];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15e4);
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      stream: false,
      options: { temperature: 0.3, num_predict: 300 }
    }),
    signal: controller.signal
  });
  clearTimeout(timeout);
  if (!res.ok) {
    console.error("Ollama chat error:", res.status);
    return {
      reply: "AI 서비스에 일시적 문제가 있습니다. acetec@acetec-korea.co.kr 또는 +82-2-420-2343으로 연락주세요.",
      sources: []
    };
  }
  const data = await res.json();
  const reply = data.message?.content ?? "응답을 생성하지 못했습니다.";
  const sources = docs.map((d) => ({
    title: d.title,
    category: d.metadata?.category ?? "general"
  }));
  return { reply, sources };
}

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(1e3),
  sessionId: z.string().optional(),
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string()
    })
  ).optional().default([])
});
const POST = async ({ request }) => {
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  const { allowed } = checkRateLimit(`chat:${ip}`, 20, 6e4);
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }), {
      status: 429,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const body = await request.json();
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const message = sanitizeChatMessage(parsed.data.message);
    const { reply, sources } = await generateChatResponse(message, parsed.data.history);
    return new Response(JSON.stringify({ reply, sources }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
