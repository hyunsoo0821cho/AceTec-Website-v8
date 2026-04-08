import { retrieveRelevantDocs } from './rag';

const OLLAMA_URL = 'http://localhost:11434';
const CHAT_MODEL = 'ministral-3:14b';

const SYSTEM_PROMPT = `You are AceTec's AI product assistant. AceTec (acetronix.co.kr) is a Korean B2B embedded computing company founded in 1994, specializing in military/aerospace, railway safety, industrial automation, telecom, sensor simulation, and HPC solutions.

RULES:
1. Only answer questions about AceTec products, services, partners, and company info.
2. If the retrieved context contains relevant information, use it. Cite sources.
3. If you don't have enough information, say so honestly and suggest contacting AceTec directly at acetec@acetec-korea.co.kr or +82-2-420-2343.
4. Never make up product specifications or pricing.
5. ALWAYS respond in the same language the user writes in. You support: Korean, English, Japanese, French, German, Spanish, and Arabic. Detect the user's language from their message and reply entirely in that language.
6. Keep responses concise (under 300 words) unless the user asks for detail.
7. For pricing inquiries, always direct to the contact form or phone number.`;

export interface ChatResponse {
  reply: string;
  sources: Array<{ title: string; category: string }>;
}

export async function generateChatResponse(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
): Promise<ChatResponse> {
  const docs = await retrieveRelevantDocs(message);

  const contextBlock =
    docs.length > 0
      ? docs.map((d) => `[${d.title}]: ${d.content}`).join('\n\n')
      : 'No specific documents found. Answer from general company knowledge.';

  const messages = [
    { role: 'system' as const, content: `${SYSTEM_PROMPT}\n\nCONTEXT FROM KNOWLEDGE BASE:\n${contextBlock}` },
    ...history.slice(-6),
    { role: 'user' as const, content: message },
  ];

  // Build prompt from messages for Ollama chat API
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 150_000); // 2.5분

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      stream: false,
      options: { temperature: 0.3, num_predict: 300 },
    }),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!res.ok) {
    console.error('Ollama chat error:', res.status);
    return {
      reply: 'AI 서비스에 일시적 문제가 있습니다. acetec@acetec-korea.co.kr 또는 +82-2-420-2343으로 연락주세요.',
      sources: [],
    };
  }

  const data = await res.json();
  const reply = data.message?.content ?? '응답을 생성하지 못했습니다.';

  const sources = docs.map((d) => ({
    title: d.title,
    category: (d.metadata?.category as string) ?? 'general',
  }));

  return { reply, sources };
}
