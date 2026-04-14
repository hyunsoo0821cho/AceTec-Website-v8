"""
Jina Reranker v2-Base Multilingual 정확도 테스트 (ONNX Runtime)
- ONNX Runtime + tokenizers로 직접 추론
- Qdrant 벡터 검색 top-20 후보 → Jina 리랭킹 top-5
- ground-truth 카테고리 매칭: Hit@1, Hit@5, MRR@5

Usage: python scripts/jina-reranker-test.py
"""
import json
import time
import urllib.request

import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer

# ── Config ──
OLLAMA_URL = "http://localhost:11434"
EMBED_MODEL = "nomic-embed-text-v2-moe:latest"
QDRANT_URL = "http://localhost:6333"
COLLECTION = "acetec_knowledge"
JINA_ONNX = "C:/Users/user/.cache/hf/jina-reranker-v2/onnx/model.onnx"
JINA_TOKENIZER = "C:/Users/user/.cache/hf/jina-reranker-v2/tokenizer.json"
TOP_N = 20
TOP_K = 5
SIM_THRESH = 0.15

# ── Test Queries ──
tests = [
    # HPC
    {"q": "GPU 서버", "gt": ["hpc"]},
    {"q": "HPC 솔루션 소개", "gt": ["hpc"]},
    {"q": "PCIe 확장 섀시", "gt": ["hpc", "interconnect"]},
    {"q": "AI 학습용 서버", "gt": ["hpc"]},
    {"q": "GPU desktop workstation", "gt": ["hpc"]},
    {"q": "High density GPU compute", "gt": ["hpc"]},
    {"q": "비디오 가속 플랫폼", "gt": ["hpc"]},
    {"q": "One Stop Systems", "gt": ["hpc"]},
    # Military
    {"q": "VPX 임베디드 보드", "gt": ["military"]},
    {"q": "Abaco Systems 제품", "gt": ["military"]},
    {"q": "FPGA 신호처리 보드", "gt": ["military"]},
    {"q": "Rugged military SBC", "gt": ["military"]},
    {"q": "MIL-STD 컴퓨터", "gt": ["military"]},
    # Railway
    {"q": "HIMA 철도 안전", "gt": ["railway"]},
    {"q": "SIL4 인증 시스템", "gt": ["railway"]},
    {"q": "HiMax fail-safe", "gt": ["railway"]},
    {"q": "철도 신호제어", "gt": ["railway"]},
    # Industrial / IPC
    {"q": "산업용 팬리스 PC", "gt": ["industrial", "ipc"]},
    {"q": "DIN rail 컴퓨터", "gt": ["industrial", "ipc"]},
    {"q": "Panel PC HMI", "gt": ["industrial", "ipc"]},
    {"q": "Wind River VxWorks", "gt": ["industrial"]},
    {"q": "24시간 운영 산업용 PC", "gt": ["industrial", "ipc"]},
    {"q": "Fanless boxtype industrial", "gt": ["industrial", "ipc"]},
    # Telecom
    {"q": "Network appliance 방화벽", "gt": ["telecom"]},
    {"q": "고성능 NIC 카드", "gt": ["telecom"]},
    {"q": "UTM 하드웨어", "gt": ["telecom"]},
    {"q": "AMD 네트워크 어플라이언스", "gt": ["telecom"]},
    # Sensor
    {"q": "OKTAL SE-Workbench", "gt": ["sensor"]},
    {"q": "EO IR 시뮬레이션", "gt": ["sensor"]},
    {"q": "RF 시뮬레이션 시스템", "gt": ["sensor"]},
    {"q": "센서 신호 시뮬레이션", "gt": ["sensor"]},
    # Radar
    {"q": "Cambridge Pixel SPx", "gt": ["radar"]},
    {"q": "RadarView 디스플레이", "gt": ["radar"]},
    {"q": "해양 레이더 추적", "gt": ["radar"]},
    {"q": "Target tracking radar", "gt": ["radar"]},
    # Interconnect (no data in Qdrant)
    {"q": "Dolphin MXH532", "gt": ["interconnect"]},
    {"q": "PCIe NTB 어댑터", "gt": ["interconnect"]},
    {"q": "PCIe 5.0 호스트 어댑터", "gt": ["interconnect"]},
    {"q": "eXpressWare 클러스터링", "gt": ["interconnect"]},
    # Multilingual
    {"q": "GPU servers for deep learning", "gt": ["hpc"]},
    {"q": "Railway safety SIL4 platform", "gt": ["railway"]},
    {"q": "Sensor simulation workbench", "gt": ["sensor"]},
    {"q": "Industrial PC fanless", "gt": ["industrial", "ipc"]},
]


# ── Helpers ──
def http_post(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def embed(text):
    r = http_post(f"{OLLAMA_URL}/api/embeddings", {"model": EMBED_MODEL, "prompt": text})
    return r["embedding"]


def qdrant_search(vec):
    r = http_post(
        f"{QDRANT_URL}/collections/{COLLECTION}/points/search",
        {"vector": vec, "limit": TOP_N, "score_threshold": SIM_THRESH, "with_payload": True},
    )
    return [
        {
            "id": p["id"],
            "score": p["score"],
            "title": p["payload"].get("title", ""),
            "content": p["payload"].get("content", ""),
            "category": p["payload"].get("category", ""),
        }
        for p in r.get("result", [])
    ]


# ── Jina Reranker (ONNX) ──
print("[0/3] Jina Reranker v2-Base Multilingual ONNX 로딩...")
tokenizer = Tokenizer.from_file(JINA_TOKENIZER)
tokenizer.enable_padding(pad_id=1, pad_token="<pad>")
tokenizer.enable_truncation(max_length=512)

session = ort.InferenceSession(JINA_ONNX, providers=["CPUExecutionProvider"])
input_names = [inp.name for inp in session.get_inputs()]
print(f"  ONNX inputs: {input_names}")


def jina_rerank(query, docs):
    """Cross-encoder scoring: query + doc_content pairs → relevance scores"""
    # 올바른 pair 인코딩: (query, document) 쌍으로 전달
    pairs = [(query, d["content"]) for d in docs]
    encoded = tokenizer.encode_batch(pairs)

    ids = np.array([e.ids for e in encoded], dtype=np.int64)
    mask = np.array([e.attention_mask for e in encoded], dtype=np.int64)

    feed = {"input_ids": ids, "attention_mask": mask}

    outputs = session.run(None, feed)
    logits = outputs[0]

    if logits.ndim == 2 and logits.shape[1] == 1:
        scores = logits[:, 0]
    elif logits.ndim == 2:
        scores = logits[:, -1]
    else:
        scores = logits.flatten()

    # Sigmoid → relevance probability
    scores = 1.0 / (1.0 + np.exp(-scores))

    ranked = sorted(enumerate(scores), key=lambda x: -x[1])[:TOP_K]
    return [
        {**docs[idx], "rerank_score": float(sc)}
        for idx, sc in ranked
    ]


# ── Metrics ──
def evaluate(top, gt):
    first = 0
    for i, d in enumerate(top):
        if d["category"] in gt:
            first = i + 1
            break
    return {
        "rank1_hit": bool(top and top[0]["category"] in gt),
        "rank5_hit": 0 < first <= 5,
        "first_rank": first,
    }


# ── Main ──
print(f"\n[1/3] {len(tests)}개 쿼리 임베딩 + Qdrant 검색 + Jina 리랭킹...\n")

results = []
for i, t in enumerate(tests):
    try:
        vec = embed(t["q"])
        cands = qdrant_search(vec)
        v_top5 = cands[:TOP_K]
        r_top5 = jina_rerank(t["q"], cands) if cands else []

        v_eval = evaluate(v_top5, t["gt"])
        r_eval = evaluate(r_top5, t["gt"])

        results.append({
            "query": t["q"],
            "gt": t["gt"],
            "n_cands": len(cands),
            "v_eval": v_eval,
            "r_eval": r_eval,
            "v_top5": [{"t": d["title"], "c": d["category"], "s": round(d["score"], 3)} for d in v_top5],
            "r_top5": [{"t": d["title"], "c": d["category"], "s": round(d["rerank_score"], 4)} for d in r_top5],
        })

        vm = "O" if v_eval["rank1_hit"] else "X"
        rm = "O" if r_eval["rank1_hit"] else "X"
        print(f"  [{i+1:2d}/{len(tests)}] V:{vm} J:{rm}  {t['q']}")

    except Exception as e:
        print(f"  [{i+1:2d}/{len(tests)}] ERR  {t['q']}: {e}")
        results.append({"query": t["q"], "gt": t["gt"], "error": str(e)})


# ── Aggregate ──
valid = [r for r in results if "error" not in r]
n = len(valid)

v_h1 = sum(1 for r in valid if r["v_eval"]["rank1_hit"])
v_h5 = sum(1 for r in valid if r["v_eval"]["rank5_hit"])
v_mrr = sum(1 / r["v_eval"]["first_rank"] if r["v_eval"]["first_rank"] > 0 else 0 for r in valid)

r_h1 = sum(1 for r in valid if r["r_eval"]["rank1_hit"])
r_h5 = sum(1 for r in valid if r["r_eval"]["rank5_hit"])
r_mrr = sum(1 / r["r_eval"]["first_rank"] if r["r_eval"]["first_rank"] > 0 else 0 for r in valid)

# Exclude interconnect (no data)
with_data = [r for r in valid if "interconnect" not in r["gt"]]
nd = len(with_data)
vd_h1 = sum(1 for r in with_data if r["v_eval"]["rank1_hit"])
vd_h5 = sum(1 for r in with_data if r["v_eval"]["rank5_hit"])
vd_mrr = sum(1 / r["v_eval"]["first_rank"] if r["v_eval"]["first_rank"] > 0 else 0 for r in with_data)
rd_h1 = sum(1 for r in with_data if r["r_eval"]["rank1_hit"])
rd_h5 = sum(1 for r in with_data if r["r_eval"]["rank5_hit"])
rd_mrr = sum(1 / r["r_eval"]["first_rank"] if r["r_eval"]["first_rank"] > 0 else 0 for r in with_data)

print("\n" + "=" * 60)
print(f"[2/3] 전체 {n}개 쿼리 결과")
print(f"  {'':25s} {'Hit@1':>8s} {'Hit@5':>8s} {'MRR@5':>8s}")
print(f"  {'Vector-only (Qdrant)':25s} {v_h1/n*100:7.1f}% {v_h5/n*100:7.1f}% {v_mrr/n:8.3f}")
print(f"  {'Jina v2-base Reranked':25s} {r_h1/n*100:7.1f}% {r_h5/n*100:7.1f}% {r_mrr/n:8.3f}")
print(f"  {'Delta':25s} {(r_h1-v_h1)/n*100:+7.1f}% {(r_h5-v_h5)/n*100:+7.1f}% {(r_mrr-v_mrr)/n:+8.3f}")

print(f"\n[3/3] 데이터 존재하는 {nd}개 쿼리 (interconnect 제외)")
print(f"  {'':25s} {'Hit@1':>8s} {'Hit@5':>8s} {'MRR@5':>8s}")
print(f"  {'Vector-only (Qdrant)':25s} {vd_h1/nd*100:7.1f}% {vd_h5/nd*100:7.1f}% {vd_mrr/nd:8.3f}")
print(f"  {'Jina v2-base Reranked':25s} {rd_h1/nd*100:7.1f}% {rd_h5/nd*100:7.1f}% {rd_mrr/nd:8.3f}")
print(f"  {'Delta':25s} {(rd_h1-vd_h1)/nd*100:+7.1f}% {(rd_h5-vd_h5)/nd*100:+7.1f}% {(rd_mrr-vd_mrr)/nd:+8.3f}")

# Regressions & improvements
regressions = [r for r in valid if r["v_eval"]["rank1_hit"] and not r["r_eval"]["rank1_hit"]]
improvements = [r for r in valid if not r["v_eval"]["rank1_hit"] and r["r_eval"]["rank1_hit"]]
print(f"\n  Hit@1 Regressions: {len(regressions)}  |  Improvements: {len(improvements)}")
if regressions:
    print("  --- Regressions ---")
    for r in regressions:
        print(f"    {r['query']} : V-top1={r['v_top5'][0]['c']} → J-top1={r['r_top5'][0]['c']}")
if improvements:
    print("  --- Improvements ---")
    for r in improvements:
        print(f"    {r['query']} : V-top1={r['v_top5'][0]['c']} → J-top1={r['r_top5'][0]['c']}")

# Save
output = {
    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
    "models": {
        "embed": EMBED_MODEL,
        "reranker": "jinaai/jina-reranker-v2-base-multilingual (ONNX)",
        "reranker_path": JINA_ONNX,
    },
    "metrics_all": {
        "n": n,
        "vector": {"hit1": round(v_h1/n*100,1), "hit5": round(v_h5/n*100,1), "mrr5": round(v_mrr/n,3)},
        "jina": {"hit1": round(r_h1/n*100,1), "hit5": round(r_h5/n*100,1), "mrr5": round(r_mrr/n,3)},
    },
    "metrics_with_data": {
        "n": nd,
        "vector": {"hit1": round(vd_h1/nd*100,1), "hit5": round(vd_h5/nd*100,1), "mrr5": round(vd_mrr/nd,3)},
        "jina": {"hit1": round(rd_h1/nd*100,1), "hit5": round(rd_h5/nd*100,1), "mrr5": round(rd_mrr/nd,3)},
    },
    "regressions": [{"q": r["query"], "gt": r["gt"], "v_top1": r["v_top5"][0]["c"], "j_top1": r["r_top5"][0]["c"]} for r in regressions],
    "improvements": [{"q": r["query"], "gt": r["gt"], "v_top1": r["v_top5"][0]["c"], "j_top1": r["r_top5"][0]["c"]} for r in improvements],
    "rows": results,
}
with open("scripts/jina-reranker-results.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
print("\nSaved: scripts/jina-reranker-results.json")
