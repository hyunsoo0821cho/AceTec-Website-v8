/**
 * Reranker 정확도 테스트
 *
 * - Ollama(nomic-embed-text-v2-moe) 로 쿼리 임베딩
 * - Qdrant 에서 top-20 후보 수집 (Vector-only)
 * - 로컬 Jina Reranker v2 (http://localhost:8787) 호출 → reranked top-5
 * - 두 결과를 ground-truth(카테고리 라벨)와 비교하여 Hit@1, Hit@5, MRR@5 계산
 * - 리랭커 서버 미가동 시 그 사실을 결과에 기록
 *
 * 사용법: node scripts/reranker-accuracy-test.mjs
 */
import fs from 'fs';

const OLLAMA_URL = 'http://localhost:11434';
const EMBED_MODEL = 'nomic-embed-text-v2-moe:latest';
const QDRANT_URL = 'http://localhost:6333';
const COLLECTION = 'acetec_knowledge';
const RERANKER_URL = process.env.RERANKER_URL || 'http://localhost:8787';
const RERANKER_MODEL = 'jinaai/jina-reranker-v2-base-multilingual';

const TOP_N_CANDIDATES = 20;
const TOP_K_FINAL = 5;
const SIM_THRESHOLD = 0.15;

// ============================================================
// Ground truth 테스트 세트 (query → 허용 카테고리 라벨 집합)
// ============================================================
const tests = [
  // --- HPC ---
  { q: 'GPU 서버', gt: ['hpc'] },
  { q: 'HPC 솔루션 소개', gt: ['hpc'] },
  { q: 'PCIe 확장 섀시', gt: ['hpc', 'interconnect'] },
  { q: 'AI 학습용 서버', gt: ['hpc'] },
  { q: 'GPU desktop workstation', gt: ['hpc'] },
  { q: 'High density GPU compute', gt: ['hpc'] },
  { q: '비디오 가속 플랫폼', gt: ['hpc'] },
  { q: 'One Stop Systems', gt: ['hpc'] },

  // --- Military ---
  { q: 'VPX 임베디드 보드', gt: ['military'] },
  { q: 'Abaco Systems 제품', gt: ['military'] },
  { q: 'FPGA 신호처리 보드', gt: ['military'] },
  { q: 'Rugged military SBC', gt: ['military'] },
  { q: 'MIL-STD 컴퓨터', gt: ['military'] },

  // --- Railway ---
  { q: 'HIMA 철도 안전', gt: ['railway'] },
  { q: 'SIL4 인증 시스템', gt: ['railway'] },
  { q: 'HiMax fail-safe', gt: ['railway'] },
  { q: '철도 신호제어', gt: ['railway'] },

  // --- Industrial ---
  { q: '산업용 팬리스 PC', gt: ['industrial', 'ipc'] },
  { q: 'DIN rail 컴퓨터', gt: ['industrial', 'ipc'] },
  { q: 'Panel PC HMI', gt: ['industrial', 'ipc'] },
  { q: 'Wind River VxWorks', gt: ['industrial'] },
  { q: '24시간 운영 산업용 PC', gt: ['industrial', 'ipc'] },
  { q: 'Fanless boxtype industrial', gt: ['industrial', 'ipc'] },

  // --- Telecom ---
  { q: 'Network appliance 방화벽', gt: ['telecom'] },
  { q: '고성능 NIC 카드', gt: ['telecom'] },
  { q: 'UTM 하드웨어', gt: ['telecom'] },
  { q: 'AMD 네트워크 어플라이언스', gt: ['telecom'] },

  // --- Sensor ---
  { q: 'OKTAL SE-Workbench', gt: ['sensor'] },
  { q: 'EO IR 시뮬레이션', gt: ['sensor'] },
  { q: 'RF 시뮬레이션 시스템', gt: ['sensor'] },
  { q: '센서 신호 시뮬레이션', gt: ['sensor'] },

  // --- Radar ---
  { q: 'Cambridge Pixel SPx', gt: ['radar'] },
  { q: 'RadarView 디스플레이', gt: ['radar'] },
  { q: '해양 레이더 추적', gt: ['radar'] },
  { q: 'Target tracking radar', gt: ['radar'] },

  // --- Interconnect ---
  { q: 'Dolphin MXH532', gt: ['interconnect'] },
  { q: 'PCIe NTB 어댑터', gt: ['interconnect'] },
  { q: 'PCIe 5.0 호스트 어댑터', gt: ['interconnect'] },
  { q: 'eXpressWare 클러스터링', gt: ['interconnect'] },

  // --- Multilingual ---
  { q: 'GPU servers for deep learning', gt: ['hpc'] },
  { q: 'Railway safety SIL4 platform', gt: ['railway'] },
  { q: 'Sensor simulation workbench', gt: ['sensor'] },
  { q: 'Industrial PC fanless', gt: ['industrial', 'ipc'] },
];

// ============================================================
// 유틸
// ============================================================
async function embed(text) {
  const r = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });
  if (!r.ok) throw new Error(`embed ${r.status}`);
  const j = await r.json();
  return j.embedding;
}

async function qdrantSearch(vector) {
  const r = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vector,
      limit: TOP_N_CANDIDATES,
      score_threshold: SIM_THRESHOLD,
      with_payload: true,
    }),
  });
  if (!r.ok) throw new Error(`qdrant ${r.status}`);
  const j = await r.json();
  return (j.result || []).map((p) => ({
    id: p.id,
    score: p.score,
    title: p.payload?.title || '',
    content: p.payload?.content || '',
    category: p.payload?.category || '',
    type: p.payload?.type || '',
  }));
}

async function checkReranker() {
  try {
    // TEI 형식 (texts) 먼저 시도, 실패하면 Infinity 형식 (documents)
    const r = await fetch(`${RERANKER_URL}/rerank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'ping',
        texts: ['hello', 'world'],
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) return 'tei';

    const r2 = await fetch(`${RERANKER_URL}/rerank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: RERANKER_MODEL,
        query: 'ping',
        documents: ['hello', 'world'],
        top_n: 2,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (r2.ok) return 'infinity';
    return null;
  } catch {
    return null;
  }
}

let rerankApiFormat = null; // 'tei' or 'infinity'

async function rerank(query, docs) {
  let body;
  if (rerankApiFormat === 'tei') {
    body = { query, texts: docs.map((d) => d.content) };
  } else {
    body = {
      model: RERANKER_MODEL,
      query,
      documents: docs.map((d) => d.content),
      top_n: TOP_K_FINAL,
      return_documents: false,
    };
  }

  const r = await fetch(`${RERANKER_URL}/rerank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`rerank ${r.status}`);
  const raw = await r.json();
  const items = raw.results || raw;
  return items
    .sort((a, b) => (b.relevance_score ?? b.score) - (a.relevance_score ?? a.score))
    .slice(0, TOP_K_FINAL)
    .map((it) => ({
      ...docs[it.index],
      rerank_score: it.relevance_score ?? it.score,
    }));
}

// ============================================================
// 메트릭 계산
// ============================================================
function computeMetrics(results) {
  const n = results.length;
  let hit1 = 0;
  let hit5 = 0;
  let mrrSum = 0;

  for (const r of results) {
    if (r.rank1Hit) hit1++;
    if (r.rank5Hit) hit5++;
    mrrSum += r.firstRelevantRank > 0 ? 1 / r.firstRelevantRank : 0;
  }
  return {
    n,
    hit1: ((hit1 / n) * 100).toFixed(1),
    hit5: ((hit5 / n) * 100).toFixed(1),
    mrr5: (mrrSum / n).toFixed(3),
  };
}

function evaluate(top, gt) {
  let firstRelevantRank = 0;
  for (let i = 0; i < top.length; i++) {
    if (gt.includes(top[i].category)) {
      firstRelevantRank = i + 1;
      break;
    }
  }
  return {
    rank1Hit: top[0] && gt.includes(top[0].category),
    rank5Hit: firstRelevantRank > 0 && firstRelevantRank <= 5,
    firstRelevantRank,
  };
}

// ============================================================
// 메인
// ============================================================
async function main() {
  console.log('[1/3] Reranker 서버 상태 확인...');
  rerankApiFormat = await checkReranker();
  const rerankerUp = !!rerankApiFormat;
  console.log(`     Reranker: ${rerankerUp ? `UP (${rerankApiFormat})` : 'DOWN'} (${RERANKER_URL})`);

  console.log(`\n[2/3] ${tests.length}개 쿼리 실행 중...\n`);

  const rows = [];
  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    try {
      const vec = await embed(t.q);
      const candidates = await qdrantSearch(vec);
      const vectorTop5 = candidates.slice(0, 5);

      let rerankedTop5 = null;
      if (rerankerUp && candidates.length > 0) {
        try {
          rerankedTop5 = await rerank(t.q, candidates);
        } catch (err) {
          console.error(`  [${t.q}] rerank err:`, err.message);
          rerankedTop5 = null;
        }
      }

      const vectorEval = evaluate(vectorTop5, t.gt);
      const rerankEval = rerankedTop5 ? evaluate(rerankedTop5, t.gt) : null;

      rows.push({
        query: t.q,
        gt: t.gt,
        candidatesN: candidates.length,
        vectorTop5: vectorTop5.map((d) => ({ t: d.title, c: d.category, s: d.score.toFixed(3) })),
        vectorEval,
        rerankedTop5: rerankedTop5?.map((d) => ({
          t: d.title,
          c: d.category,
          s: (d.rerank_score ?? 0).toFixed(3),
        })),
        rerankEval,
      });

      const mark = vectorEval.rank1Hit ? '✓' : '✗';
      const mark2 = rerankEval
        ? rerankEval.rank1Hit
          ? '✓'
          : '✗'
        : '-';
      console.log(`  [${i + 1}/${tests.length}] V:${mark} R:${mark2}  ${t.q}`);
    } catch (err) {
      console.error(`  [${t.q}] ERR:`, err.message);
      rows.push({ query: t.q, gt: t.gt, error: err.message });
    }
  }

  const valid = rows.filter((r) => !r.error);
  const vectorMetrics = computeMetrics(valid.map((r) => r.vectorEval));
  const rerankMetrics = rerankerUp
    ? computeMetrics(valid.filter((r) => r.rerankEval).map((r) => r.rerankEval))
    : null;

  console.log('\n[3/3] 결과 집계');
  console.log('='.repeat(60));
  console.log('Vector-only (Qdrant top-5):');
  console.log(`  Hit@1: ${vectorMetrics.hit1}%  Hit@5: ${vectorMetrics.hit5}%  MRR@5: ${vectorMetrics.mrr5}`);
  if (rerankMetrics) {
    console.log('Reranked (Jina v2-base → top-5):');
    console.log(`  Hit@1: ${rerankMetrics.hit1}%  Hit@5: ${rerankMetrics.hit5}%  MRR@5: ${rerankMetrics.mrr5}`);
  } else {
    console.log('Reranker: OFFLINE — fallback to vector order (no reranker metrics)');
  }

  const out = {
    timestamp: new Date().toISOString(),
    config: {
      embed: EMBED_MODEL,
      qdrant: `${QDRANT_URL}/${COLLECTION}`,
      reranker: RERANKER_URL,
      rerankerUp,
      topNCandidates: TOP_N_CANDIDATES,
      topKFinal: TOP_K_FINAL,
    },
    metrics: {
      vector: vectorMetrics,
      rerank: rerankMetrics,
    },
    rows,
  };

  const outFile = 'scripts/reranker-accuracy-results.json';
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log(`\n결과 저장: ${outFile}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
