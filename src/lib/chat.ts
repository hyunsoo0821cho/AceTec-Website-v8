import { retrieveRelevantDocs } from './rag';
import { isBlockedInput, refusalMessage, sanitizeOutput, sanitizeRagContext, SCOPE_RESTRICTION } from './chatbot-guard';
import fs from 'fs';
import path from 'path';

// ===== FAQ 키워드 매칭 (벡터 DB/리랭커 우회) =====
interface FaqEntry { question: string; answer: string; tags: string[] }
let _faqCache: FaqEntry[] | null = null;

function loadFaq(): FaqEntry[] {
  if (_faqCache) return _faqCache;
  let faqPath = path.join(process.cwd(), 'src', 'content', 'faq.json');
  if (!fs.existsSync(faqPath)) faqPath = path.join(process.cwd(), 'data', 'faq.json');
  if (!fs.existsSync(faqPath)) { console.log('[FAQ] file not found:', faqPath); _faqCache = []; return _faqCache; }
  _faqCache = JSON.parse(fs.readFileSync(faqPath, 'utf-8'));
  console.log(`[FAQ] loaded ${_faqCache!.length} entries from ${faqPath}, tags[0]=${JSON.stringify(_faqCache![0]?.tags?.slice(0,3))}`);
  return _faqCache!;
}



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
7. For pricing inquiries, always direct to the contact form or phone number.
8. If users ask about viewing product details/specs or access permissions, guide them:
   - Product details require access permission per page.
   - Steps: Register (/register) → Login (/login) → Go to the product page → Click "설명 보기 요청" button → Wait for admin approval.
   - Each page requires separate permission. Available pages:
     군수항공분야(/products/military), 철도분야(/products/railway), 자동화분야(/products/industrial),
     정보통신분야(/products/telecom), 모델링&시뮬레이션분야(/products/sensor), 슈퍼컴퓨팅시스템분야(/products/hpc),
     산업용컴퓨터분야(/products/ipc), 레이더(/products/radar), 초고속데이터인터커넥트(/products/interconnect),
     전체제품카탈로그(/catalog).
9. PAGE NAVIGATION: When the user wants to GO TO, VISIT, SEE, or learn about a specific product area, include EXACTLY ONE [NAVIGATE:/path] tag at the END of your reply.
   Match the user's topic to the correct page using BOTH the main category (대분야) AND sub-categories (중분야/제품명) below:

   /products/military (군수항공분야 — 국방급 컴퓨팅):
     대분야: 군수, 항공, 방산, 국방, military, aerospace, defense
     중분야: Form Factor, Abaco, VME, VPX, VPX 3U, VPX 6U, Compact PCI, PMC, XMC, FMC, Middleware Software, Connext DDS, DDS Professional, DDS Secure, DDS Micro, DDS Cert, RTI

   /products/railway (철도분야 — SIL4 안전 시스템):
     대분야: 철도, railway, 기차, 전철
     중분야: HIMA, SIL4, HiMax, HiMatrix, 안전 시스템, safety system

   /products/industrial (자동화분야 — 산업급 플랫폼):
     대분야: 자동화, 산업자동화, industrial, automation
     중분야: Device Cloud, IoT, 사물인터넷, Helix Virtualization, Software Defined Infrastructure, Wind River Simics, Real-Time OS, RTOS, VxWorks, Wind River Linux, VxWorks 653, SoftPLC, ISaGRAF

   /products/telecom (정보통신분야 — 네트워크 인프라):
     대분야: 정보통신, 통신, telecom, 네트워크
     중분야: Network Appliance, 네트워크 어플라이언스, NIC Adapter, 서버 어플라이언스, Customizing Network

   /products/sensor (모델링 & 시뮬레이션분야 — OKTAL-SE 솔루션):
     대분야: 모델링, 시뮬레이션, sensor, simulation, OKTAL
     중분야: EO/IR, RF Sensor, Active EO, GNSS Sensor, 3D Terrain, Building Generation, APIs & Integration Tools, 센서 시뮬레이션

   /products/hpc (슈퍼컴퓨팅분야 — 고성능 컴퓨팅):
     대분야: 슈퍼컴퓨팅, HPC, 고성능컴퓨팅, supercomputing
     중분야: GPU Appliances, GPU Expansion, VIDEO Acceleration, Desktop Computing Appliances, 서버, GPU

   /products/ipc (산업용컴퓨터분야 — 산업용 컴퓨터):
     대분야: 산업용컴퓨터, 산업용PC, IPC, 임베디드PC, fanless
     중분야: Boxtype PC, Rackmount PC, Desktop PC, Wallmount PC, Panel PC, 랙마운트, 판넬PC, 팬리스

   /products/radar (레이더 처리 & 디스플레이 — Cambridge Pixel):
     대분야: 레이더, radar, Cambridge Pixel
     중분야: SPx Software, HPx Hardware, 레이더 디스플레이, radar processing

   /products/interconnect (초고속 데이터 인터커넥트 — PCIe 패브릭):
     대분야: 인터커넥트, interconnect, 초고속데이터
     중분야: PCIe Network Adapter, Superfast Interconnect Switch, PCIe 패브릭, 저지연 네트워킹

   /catalog (전체 카탈로그):
     Keywords: 전체 제품, 모든 분야, 카탈로그, catalog, 뭐가 있는지, 제품 목록, 어떤 제품, 분야를 모르겠, 전체 보기

   /contact → 문의, 연락, contact, 가격, 견적
   /about → 회사소개, about, 회사 정보
   /solutions → 솔루션, 적용사례, applications
   / → 홈, home, 메인, 처음

   RULES:
   - Include [NAVIGATE:] when the user wants to GO TO, VISIT, or MOVE to a page.
   - Navigation trigger keywords (ANY of these = navigate):
     Korean: "이동", "가줘", "가고싶어", "보여줘", "보고싶어", "보고 싶어", "보고싶습니다", "확인하고싶어", "페이지", "열어", "가자", "이동해줘", "~분야로", "~로 가", "제품 보", "제품을 보"
     English: "go to", "visit", "show me the page", "take me to", "open", "navigate", "want to see", "want to view", "see products", "view products"
   - Examples of YES navigation (MUST include [NAVIGATE:]):
     * "정보통신분야로 이동해줘" → [NAVIGATE:/products/telecom]
     * "군수항공 페이지로 가줘" → [NAVIGATE:/products/military]
     * "HPC 제품 페이지 보여줘" → [NAVIGATE:/products/hpc]
     * "HPC 제품 보고싶어" → [NAVIGATE:/products/hpc]
     * "카탈로그 열어줘" → [NAVIGATE:/catalog]
     * "철도분야 가고싶어" → [NAVIGATE:/products/railway]
     * "산업용컴퓨터 페이지" → [NAVIGATE:/products/ipc]
     * "GPU 서버 제품 보고싶어" → [NAVIGATE:/products/hpc]
     * "I want to see military products" → [NAVIGATE:/products/military]
   - Examples of NO navigation (just answer, no tag):
     * "VxWorks가 뭐야?" → explain only
     * "GPU 서버 추천해줘" → answer only
     * "에이스텍 뭐하는 회사야?" → answer only
     * "안녕하세요" → greet only
   - When a user asks about a sub-category product page, navigate to the PARENT category page.
   - When a user doesn't know what they need or wants to see everything → [NAVIGATE:/catalog]
   - Include ONLY ONE tag per reply, at the very end.`;

export interface ChatResponse {
  reply: string;
  sources: Array<{ title: string; category: string }>;
}

// 사용자 메시지 → 네비게이션 의도 감지 (LLM 태그 누락 시 fallback)
const NAV_TRIGGER_RE = /이동|가줘|가고\s*싶|보여|보고\s*싶|보고싶|확인하고\s*싶|페이지|열어|가자|카탈로그|go\s*to|visit|show\s*me|take\s*me|want\s*to\s*(see|view)|see\s*products|view\s*products/i;
const CATEGORY_MAP: Array<{ re: RegExp; path: string }> = [
  { re: /군수|항공|방산|국방|military|aerospace|defense|vpx|vme|abaco/i, path: '/products/military' },
  { re: /철도|기차|전철|railway|hima|sil4|controlsafe/i, path: '/products/railway' },
  { re: /자동화|산업자동화|industrial\s*automation|automation|wind\s*river|vxworks|iot|helix|rtos/i, path: '/products/industrial' },
  { re: /정보통신|통신|telecom|network\s*appliance|네트워크\s*어플라이언스|nic/i, path: '/products/telecom' },
  { re: /모델링|시뮬레이션|sensor|simulation|oktal|eo\/ir|rf\s*sensor/i, path: '/products/sensor' },
  { re: /슈퍼컴퓨팅|고성능컴퓨팅|hpc|supercomputing|gpu\s*서버|gpu\s*server|gpu\s*어플라이언스|high\s*performance/i, path: '/products/hpc' },
  { re: /산업용\s*컴퓨터|산업용pc|ipc|fanless|팬리스|rackmount|랙마운트|panel\s*pc|판넬/i, path: '/products/ipc' },
  { re: /레이더|radar|cambridge\s*pixel|spx|hpx/i, path: '/products/radar' },
  { re: /인터커넥트|interconnect|pcie\s*fabric|pcie\s*패브릭/i, path: '/products/interconnect' },
  { re: /전체\s*카탈로그|모든\s*제품|catalog|카탈로그/i, path: '/catalog' },
  { re: /문의|연락|contact|견적/i, path: '/contact' },
  { re: /회사\s*소개|about/i, path: '/about' },
];

function detectNavPath(userMsg: string): string | null {
  if (!NAV_TRIGGER_RE.test(userMsg)) return null;
  for (const { re, path } of CATEGORY_MAP) {
    if (re.test(userMsg)) return path;
  }
  return null;
}

export async function generateChatResponse(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
): Promise<ChatResponse> {
  // ===== Input Guardrail =====
  const guard = isBlockedInput(message);
  if (guard.blocked) {
    return { reply: refusalMessage(), sources: [] };
  }

  const docs = await retrieveRelevantDocs(message);

  // ===== FAQ 키워드 매칭 — 태그 기반으로 LLM 우회, 환각 방지 =====
  const faqs = loadFaq();
  if (faqs.length > 0) {
    try {
      const msgLower = message.toLowerCase();
      const msgNoSpace = msgLower.replace(/\s+/g, '');
      let bestFaq: FaqEntry | null = null;
      let bestScore = 0;
      for (const faq of faqs) {
        let score = 0;
        // 태그 매칭: 원문 + 공백 제거 비교
        for (const tag of faq.tags) {
          const tl = tag.toLowerCase();
          if (msgLower.includes(tl) || msgNoSpace.includes(tl.replace(/\s+/g, ''))) score++;
        }
        // 질문 키워드 매칭 보조 점수
        const qWords = faq.question.replace(/[?？]/g, '').split(/[\s,]+/).filter(w => w.length >= 2);
        for (const w of qWords) {
          if (msgLower.includes(w.toLowerCase())) score += 0.5;
        }
        if (score > bestScore) { bestScore = score; bestFaq = faq; }
      }
      console.log(`[FAQ] tagMatch best=${bestScore.toFixed(1)} match=${bestFaq?.question?.substring(0,30)} msg="${msgLower}" msgNoSp="${msgNoSpace}"`);
      if (bestFaq && bestScore >= 1.0) {
        const safeFaq = sanitizeOutput(bestFaq.answer);
        let reply = safeFaq;
        if (!/\[NAVIGATE:/.test(reply)) {
          const navPath = detectNavPath(message);
          if (navPath) reply = `${reply.trim()}\n\n[NAVIGATE:${navPath}]`;
        }
        return {
          reply,
          sources: docs.slice(0, 3).map((d) => ({
            title: d.title,
            category: (d.metadata?.category as string) ?? 'general',
          })),
        };
      }
    } catch (faqErr) { console.error('[FAQ] match error:', faqErr); }
  }

  // Qdrant 외부 노출 (P0 잔존) 대비: 검색된 문서에 지시형 injection 이 섞여 있을 수 있으므로
  // title / content 모두 sanitizeRagContext 로 필터링 후 프롬프트에 투입.
  const contextBlock =
    docs.length > 0
      ? docs
          .map((d) => `[${sanitizeRagContext(d.title)}]: ${sanitizeRagContext(d.content)}`)
          .join('\n\n')
      : 'No specific documents found. Answer from general company knowledge.';

  const messages = [
    { role: 'system' as const, content: `${SYSTEM_PROMPT}${SCOPE_RESTRICTION}\n\nCONTEXT FROM KNOWLEDGE BASE:\n${contextBlock}` },
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
      keep_alive: '5m',
      options: { temperature: 0.3, num_predict: 800, num_ctx: 4096, num_batch: 512 },
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
  let rawReply = data.message?.content ?? '응답을 생성하지 못했습니다.';

  // ===== 네비게이션 Fallback =====
  // LLM이 [NAVIGATE:] 태그를 누락한 경우, 사용자 메시지 기반으로 결정론적 감지해 주입
  if (!/\[NAVIGATE:/.test(rawReply)) {
    const navPath = detectNavPath(message);
    if (navPath) rawReply = `${rawReply.trim()}\n\n[NAVIGATE:${navPath}]`;
  }

  // ===== Output Guardrail =====
  const reply = sanitizeOutput(rawReply);

  const sources = docs.map((d) => ({
    title: d.title,
    category: (d.metadata?.category as string) ?? 'general',
  }));

  return { reply, sources };
}
