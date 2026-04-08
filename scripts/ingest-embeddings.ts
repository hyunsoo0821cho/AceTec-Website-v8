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
        metadata: { category: data.category, partner: item.partner, badge: item.badge, type: 'product' },
      });
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

    const points = results.map((doc: any, i: number) => ({
      id: i + 1,
      vector: doc.embedding,
      payload: { doc_id: doc.id, title: doc.title, content: doc.content, ...doc.metadata },
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
