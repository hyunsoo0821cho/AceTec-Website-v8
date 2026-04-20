/**
 * RAG Knowledge Base Ingestion Script (Ollama Local)
 * Reads product JSON from Content Collections,
 * generates embeddings via nomic-embed-text,
 * saves to data/vector-store.json
 *
 * Usage: npm run ingest
 */

import fs from 'fs';
import path from 'path';

const CONTENT_DIR = path.resolve(import.meta.dirname, '..', 'src', 'content', 'products');
const OUTPUT_DIR = path.resolve(import.meta.dirname, '..', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'vector-store.json');
const OLLAMA_URL = 'http://localhost:11434';
const EMBED_MODEL = 'nomic-embed-text-v2-moe';

interface ProductData {
  category: string;
  title: string;
  description: string;
  items: Array<{
    name: string;
    specs: string;
    partner?: string;
    detailDescription?: string;
    badge?: string;
  }>;
}

interface DocumentChunk {
  id: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
}

function buildChunks(): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
    const data: ProductData = JSON.parse(raw);

    chunks.push({
      id: `cat-${data.category}`,
      title: `${data.title} — Overview`,
      content: `AceTec offers ${data.title} solutions. ${data.description} Products: ${data.items.map((i) => i.name).join(', ')}.`,
      metadata: { category: data.category, type: 'category_overview' },
    });

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const parts = [`AceTec sells ${item.name} in the ${data.title} category.`];
      if (item.detailDescription) parts.push(item.detailDescription);
      parts.push(`Specifications: ${item.specs}`);
      if (item.partner) parts.push(`Partner: ${item.partner}`);
      if (item.badge && item.badge !== 'none') parts.push(`Certification: ${item.badge.toUpperCase()}`);

      chunks.push({
        id: `${data.category}-${i}`,
        title: item.name,
        content: parts.join(' '),
        metadata: { category: data.category, type: 'product' },
      });
    }

    // sections 기반 제품도 인덱싱 (items가 비어있는 카테고리 — interconnect 등)
    const sections = (data as any).sections as Array<{ title: string; products: Array<{ name: string; features?: string[] }> }> | undefined;
    if (sections) {
      let si = 0;
      for (const section of sections) {
        for (const prod of section.products) {
          const featureText = prod.features ? prod.features.join(', ') : '';
          chunks.push({
            id: `${data.category}-s${si}`,
            title: prod.name,
            content: `AceTec sells ${prod.name} in the ${data.title} category. Section: ${section.title}. ${featureText ? 'Features: ' + featureText : ''}`,
            metadata: { category: data.category, type: 'product' },
          });
          si++;
        }
      }
    }
  }

  // Company info
  chunks.push({
    id: 'company-about',
    title: 'About AceTec',
    content:
      'AceTec (에이스텍)는 1994년에 설립되어 30년 이상 한국 임베디드 컴퓨팅 및 산업 기술 시장을 선도하고 있습니다. 자체 R&D 센터와 Abaco Systems, HIMA, Wind River, RTI, OKTAL-SE, One Stop Systems 등 글로벌 파트너와의 전략적 제휴를 통해 국방, 항공우주, 철도, 산업자동화 분야의 미션 크리티컬 솔루션을 제공합니다. 대표이사: 장정훈. 사업자등록번호: 215-81-68464.',
    metadata: { type: 'company' },
  });

  chunks.push({
    id: 'company-contact',
    title: 'AceTec 연락처',
    content:
      'AceTec 서울 본사: 이메일 acetec@acetec-korea.co.kr, 전화 +82-2-420-2343, FAX +82-2-420-2757. 대전 지사: 대전시 유성구 테크노2로 199 미건테크노월드 205호, 전화 +82-42-471-2343, FAX +82-42-933-2642. 웹사이트: https://www.acetronix.co.kr',
    metadata: { type: 'contact' },
  });

  chunks.push({
    id: 'company-services',
    title: 'AceTec Total Service Solution',
    content:
      'AceTec는 5단계 토탈 서비스 솔루션을 제공합니다: 1-2단계 컨설팅 & 설계 (고객 컨설팅, 설계 컨설팅), 3-4단계 시스템 구축 & 기술 지원, 5단계 검증 & 검사 (제품 평가, 품질 보증). 모든 솔루션은 KC 인증 및 ISO 9001 준수.',
    metadata: { type: 'service' },
  });

  chunks.push({
    id: 'company-partners',
    title: 'AceTec 기술 파트너',
    content:
      'AceTec 주요 파트너: Abaco Systems (러기드 임베디드 컴퓨팅, VME/VPX 보드), HIMA (SIL4 인증 철도 안전 시스템, ControlSafe 플랫폼), Wind River (VxWorks RTOS, Linux, Helix 가상화), RTI (Connext DDS 미들웨어), OKTAL-SE (EO/IR/RF 센서 시뮬레이션), One Stop Systems (PCIe 확장, GPU 서버), Cambridge Pixel (레이더 프로세싱), SMART Embedded Computing (AdvancedMC, ATCA, MicroTCA), Pentek (디지털 신호처리 보드).',
    metadata: { type: 'partners' },
  });

  // 제품 페이지 열람 권한 안내
  chunks.push({
    id: 'guide-access-request',
    title: '제품 상세 설명 열람 권한 안내',
    content: `AceTec 웹사이트의 제품 상세 설명(사양, 기술 스펙)은 열람 권한이 필요합니다. 각 제품 페이지별로 개별 열람 권한을 요청해야 합니다. 관리자가 승인한 페이지만 열람 가능합니다.

열람 권한 요청 방법:
1. 먼저 회원가입 후 로그인합니다. (/register 에서 가입, /login 에서 로그인)
2. 열람하고 싶은 제품 페이지로 이동합니다.
3. 페이지 상단에 표시되는 "설명 보기 요청" 버튼을 클릭합니다.
4. 관리자가 승인하면 해당 페이지의 제품 상세 설명을 볼 수 있습니다.
5. 다른 페이지의 제품도 보려면 각 페이지에서 별도로 요청해야 합니다.

제품 페이지 목록:
- 군수항공분야: /products/military (군용/항공우주 임베디드 컴퓨팅, VME, VPX, 레이더 처리)
- 철도분야: /products/railway (HIMA 철도 안전 시스템, ControlSafe 플랫폼)
- 자동화분야: /products/industrial (산업 자동화, IoT, Wind River 플랫폼)
- 정보통신분야: /products/telecom (통신/네트워크, RTOS, DDS 미들웨어)
- 모델링 & 시뮬레이션 분야: /products/sensor (OKTAL-SE EO/IR/RF 센서 시뮬레이션)
- 슈퍼컴퓨팅시스템분야: /products/hpc (고성능 컴퓨팅, GPU 서버)
- 산업용컴퓨터분야: /products/ipc (팬리스 산업용 PC, 랙마운트 서버, 패널 PC)
- 레이더: /products/radar (Cambridge Pixel 레이더 프로세싱 & 디스플레이)
- 초고속 데이터 인터커넥트: /products/interconnect (PCIe 네트워크 어댑터, 스위치)
- 전체 제품 카탈로그: /catalog (모든 카테고리 제품 한눈에 보기)`,
    metadata: { type: 'guide' },
  });

  // FAQ 큐레이션 답변 (할루시네이션 방지)
  const faqPath = path.resolve(import.meta.dirname, '..', 'src', 'content', 'faq.json');
  if (fs.existsSync(faqPath)) {
    const faqs: Array<{ question: string; answer: string; tags: string[] }> = JSON.parse(fs.readFileSync(faqPath, 'utf-8'));
    for (let i = 0; i < faqs.length; i++) {
      const faq = faqs[i];
      chunks.push({
        id: `faq-${i}`,
        title: faq.question,
        content: `Q: ${faq.question}\nA: ${faq.answer}`,
        metadata: { type: 'faq', tags: faq.tags.join(','), faq_answer: faq.answer },
      });
    }
  }

  return chunks;
}

async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });
  if (!res.ok) throw new Error(`Embedding failed: ${res.status}`);
  const data = await res.json();
  return data.embedding;
}

async function ingest() {
  console.log('Building knowledge base chunks...');
  const chunks = buildChunks();
  console.log(`Generated ${chunks.length} chunks`);

  console.log('Generating embeddings via Ollama (nomic-embed-text)...');
  const results = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await embed(chunk.content);
    results.push({ ...chunk, embedding });
    process.stdout.write(`\r  ${i + 1}/${chunks.length} embedded`);
  }
  console.log('');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

  const sizeKB = Math.round(fs.statSync(OUTPUT_FILE).size / 1024);
  console.log(`\nSaved to ${OUTPUT_FILE} (${sizeKB} KB)`);
  console.log(`${results.length} documents with ${results[0]?.embedding.length ?? 0}-dim embeddings`);

  // Qdrant에 업로드
  console.log('\nUploading to Qdrant...');
  try {
    const { QdrantClient } = await import('@qdrant/js-client-rest');
    const qdrant = new QdrantClient({ url: 'http://localhost:6333' });
    const COLLECTION = 'acetec_knowledge';
    const dim = results[0]?.embedding.length ?? 768;

    try { await qdrant.deleteCollection(COLLECTION); } catch { /* ignore */ }
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: dim, distance: 'Cosine' },
    });

    // ⚠️ 보안: metadata spread 금지. 화이트리스트 필드만 payload 포함.
    // category / type 은 검색 필터링 용도, 그 외 partner/badge 등 내부성 필드는 제외.
    const points = results.map((doc: any, i: number) => ({
      id: i + 1,
      vector: doc.embedding,
      payload: {
        doc_id: doc.id,
        title: doc.title,
        content: doc.content,
        category: doc.metadata?.category ?? null,
        type: doc.metadata?.type ?? null,
        faq_answer: doc.metadata?.faq_answer ?? null,
      },
    }));

    for (let i = 0; i < points.length; i += 100) {
      await qdrant.upsert(COLLECTION, { points: points.slice(i, i + 100) });
    }
    console.log(`Uploaded ${points.length} vectors to Qdrant collection '${COLLECTION}'`);
  } catch (err) {
    console.error('Qdrant upload failed (continuing with JSON fallback):', err);
  }

  console.log('Cost: $0 (local Ollama)');
}

ingest().catch(console.error);
